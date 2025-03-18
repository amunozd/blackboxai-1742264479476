const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const { logger } = require('./logger');
const configService = require('./config');
const queue = require('./queue');

class NotificationService {
    constructor() {
        this.transporter = null;
        this.emailTemplatesDir = path.join(__dirname, '../views/emails');
        this.setupTransporter();
    }

    // Setup email transporter
    setupTransporter() {
        const mailConfig = configService.getMailConfig();
        
        this.transporter = nodemailer.createTransport({
            host: mailConfig.host,
            port: mailConfig.port,
            secure: mailConfig.secure,
            auth: {
                user: mailConfig.auth.user,
                pass: mailConfig.auth.pass
            }
        });
    }

    // Send email
    async sendEmail(to, subject, template, data) {
        try {
            // Render email template
            const html = await this.renderTemplate(template, data);

            // Send email
            const result = await this.transporter.sendMail({
                from: configService.get('mail.from'),
                to,
                subject,
                html
            });

            logger.info('Email sent successfully', {
                to,
                subject,
                messageId: result.messageId
            });

            return result;
        } catch (error) {
            logger.error('Error sending email:', error);
            throw error;
        }
    }

    // Render email template
    async renderTemplate(template, data) {
        try {
            const templatePath = path.join(this.emailTemplatesDir, `${template}.ejs`);
            return await ejs.renderFile(templatePath, {
                ...data,
                config: configService.getAll()
            });
        } catch (error) {
            logger.error('Error rendering email template:', error);
            throw error;
        }
    }

    // Send loan confirmation
    async sendLoanConfirmation(loan) {
        try {
            await queue.addJob('sendEmail', {
                to: loan.user.email,
                subject: 'Confirmación de Préstamo',
                template: 'loan-confirmation',
                data: {
                    userName: loan.user.fullName,
                    bookTitle: loan.book.title,
                    loanDate: loan.loanDate,
                    dueDate: loan.dueDate,
                    loanId: loan.id
                }
            });
        } catch (error) {
            logger.error('Error sending loan confirmation:', error);
        }
    }

    // Send return confirmation
    async sendReturnConfirmation(loan) {
        try {
            await queue.addJob('sendEmail', {
                to: loan.user.email,
                subject: 'Confirmación de Devolución',
                template: 'return-confirmation',
                data: {
                    userName: loan.user.fullName,
                    bookTitle: loan.book.title,
                    returnDate: loan.returnDate,
                    bookId: loan.book.id
                }
            });
        } catch (error) {
            logger.error('Error sending return confirmation:', error);
        }
    }

    // Send due reminder
    async sendDueReminder(loan) {
        try {
            await queue.addJob('sendEmail', {
                to: loan.user.email,
                subject: 'Recordatorio de Devolución',
                template: 'loan-reminder',
                data: {
                    userName: loan.user.fullName,
                    bookTitle: loan.book.title,
                    dueDate: loan.dueDate,
                    loanId: loan.id
                }
            });
        } catch (error) {
            logger.error('Error sending due reminder:', error);
        }
    }

    // Send overdue notification
    async sendOverdueNotification(loan) {
        try {
            await queue.addJob('sendEmail', {
                to: loan.user.email,
                subject: 'Préstamo Vencido',
                template: 'loan-overdue',
                data: {
                    userName: loan.user.fullName,
                    bookTitle: loan.book.title,
                    dueDate: loan.dueDate,
                    daysOverdue: Math.ceil(
                        (Date.now() - new Date(loan.dueDate)) / (1000 * 60 * 60 * 24)
                    ),
                    loanId: loan.id
                }
            });
        } catch (error) {
            logger.error('Error sending overdue notification:', error);
        }
    }

    // Send due reminders
    async sendDueReminders() {
        try {
            const { models } = require('./models');
            const { Op } = require('sequelize');

            // Find loans due in the next 24 hours
            const loans = await models.Loan.findAll({
                where: {
                    status: 'active',
                    dueDate: {
                        [Op.between]: [
                            new Date(),
                            new Date(Date.now() + 24 * 60 * 60 * 1000)
                        ]
                    }
                },
                include: [
                    { model: models.User, as: 'user' },
                    { model: models.Book, as: 'book' }
                ]
            });

            // Send reminders
            for (const loan of loans) {
                await this.sendDueReminder(loan);
            }

            logger.info(`Sent ${loans.length} due reminders`);
        } catch (error) {
            logger.error('Error sending due reminders:', error);
        }
    }

    // Send overdue notifications
    async sendOverdueNotifications() {
        try {
            const { models } = require('./models');
            const { Op } = require('sequelize');

            // Find overdue loans
            const loans = await models.Loan.findAll({
                where: {
                    status: 'active',
                    dueDate: {
                        [Op.lt]: new Date()
                    }
                },
                include: [
                    { model: models.User, as: 'user' },
                    { model: models.Book, as: 'book' }
                ]
            });

            // Send notifications
            for (const loan of loans) {
                await this.sendOverdueNotification(loan);
            }

            logger.info(`Sent ${loans.length} overdue notifications`);
        } catch (error) {
            logger.error('Error sending overdue notifications:', error);
        }
    }

    // Verify email configuration
    async verifyEmailConfig() {
        try {
            await this.transporter.verify();
            logger.info('Email configuration verified successfully');
            return true;
        } catch (error) {
            logger.error('Email configuration verification failed:', error);
            return false;
        }
    }
}

// Create notification service instance
const notificationService = new NotificationService();

// Export notification service
module.exports = notificationService;