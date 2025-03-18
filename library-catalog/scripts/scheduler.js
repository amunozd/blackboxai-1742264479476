const cron = require('node-cron');
const { logger } = require('./logger');
const queue = require('./queue');
const { config } = require('../config/app');

class Scheduler {
    constructor() {
        this.jobs = new Map();
        this.setupJobs();
    }

    // Setup all scheduled jobs
    setupJobs() {
        // Daily jobs
        this.schedule('0 0 * * *', 'cleanupFiles', this.scheduleCleanup);
        this.schedule('0 1 * * *', 'updateLoanStatus', this.scheduleLoanStatusUpdate);
        this.schedule('0 2 * * *', 'databaseBackup', this.scheduleDatabaseBackup);
        this.schedule('0 3 * * *', 'generateReports', this.scheduleReportGeneration);

        // Hourly jobs
        this.schedule('0 * * * *', 'checkOverdueLoans', this.scheduleOverdueCheck);

        // Every 15 minutes
        this.schedule('*/15 * * * *', 'sendNotifications', this.scheduleNotifications);

        // Every 5 minutes
        this.schedule('*/5 * * * *', 'checkQueueHealth', this.scheduleQueueHealthCheck);

        logger.info('Scheduler initialized with all jobs');
    }

    // Schedule a job
    schedule(cronExpression, name, handler) {
        try {
            const job = cron.schedule(cronExpression, async () => {
                try {
                    logger.info(`Starting scheduled job: ${name}`);
                    await handler.call(this);
                    logger.info(`Completed scheduled job: ${name}`);
                } catch (error) {
                    logger.error(`Error in scheduled job ${name}:`, error);
                }
            }, {
                scheduled: true,
                timezone: config.app.timezone || 'America/Mexico_City'
            });

            this.jobs.set(name, job);
            logger.info(`Scheduled job registered: ${name} (${cronExpression})`);
        } catch (error) {
            logger.error(`Error scheduling job ${name}:`, error);
        }
    }

    // Schedule cleanup job
    async scheduleCleanup() {
        // Cleanup exports
        await queue.addJob('cleanupFiles', {
            type: 'exports',
            age: 24 * 60 * 60 * 1000 // 24 hours
        });

        // Cleanup imports
        await queue.addJob('cleanupFiles', {
            type: 'imports',
            age: 12 * 60 * 60 * 1000 // 12 hours
        });

        // Cleanup sessions
        await queue.addJob('cleanupFiles', {
            type: 'sessions',
            age: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
    }

    // Schedule loan status update job
    async scheduleLoanStatusUpdate() {
        const { models } = require('../models');
        const { Op } = require('sequelize');

        // Find active loans that are overdue
        const overdueLoans = await models.Loan.findAll({
            where: {
                status: 'active',
                dueDate: {
                    [Op.lt]: new Date()
                }
            }
        });

        // Update status for each overdue loan
        for (const loan of overdueLoans) {
            await queue.addJob('updateLoanStatus', {
                loanId: loan.id,
                status: 'overdue'
            });
        }
    }

    // Schedule database backup job
    async scheduleDatabaseBackup() {
        if (config.app.env === 'production') {
            const backupService = require('./backup');
            await backupService.runFullBackup();
        }
    }

    // Schedule report generation job
    async scheduleReportGeneration() {
        const statisticsService = require('./statistics');
        const exportService = require('./exports');

        // Generate daily statistics
        const stats = await statisticsService.getGeneralStats();

        // Export to different formats
        await queue.addJob('generateReport', {
            type: 'daily-stats',
            data: stats,
            format: 'excel',
            options: {
                filename: `daily-stats-${new Date().toISOString().split('T')[0]}.xlsx`
            }
        });

        await queue.addJob('generateReport', {
            type: 'daily-stats',
            data: stats,
            format: 'pdf',
            options: {
                filename: `daily-stats-${new Date().toISOString().split('T')[0]}.pdf`,
                title: 'Estadísticas Diarias de la Biblioteca'
            }
        });
    }

    // Schedule overdue loans check job
    async scheduleOverdueCheck() {
        const { models } = require('../models');
        const { Op } = require('sequelize');

        // Find loans that are due soon (within next 24 hours)
        const soonDueLoans = await models.Loan.findAll({
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
                { model: models.User },
                { model: models.Book }
            ]
        });

        // Send reminder emails
        for (const loan of soonDueLoans) {
            await queue.addJob('sendEmail', {
                to: loan.User.email,
                subject: 'Recordatorio de Devolución',
                template: 'loan-reminder',
                data: {
                    userName: loan.User.fullName,
                    bookTitle: loan.Book.title,
                    dueDate: loan.dueDate
                }
            });
        }
    }

    // Schedule notifications job
    async scheduleNotifications() {
        const notificationService = require('./notifications');
        await notificationService.sendDueReminders();
        await notificationService.sendOverdueNotifications();
    }

    // Schedule queue health check job
    async scheduleQueueHealthCheck() {
        const status = queue.getStatus();
        
        // Log queue status
        logger.info('Queue health check:', status);

        // Alert if too many pending jobs
        if (status.pendingJobs > 100) {
            logger.warn(`High number of pending jobs: ${status.pendingJobs}`);
        }

        // Alert if jobs are taking too long
        if (status.activeJobs === status.concurrency && status.running) {
            logger.warn('Queue might be stuck - all workers are busy');
        }
    }

    // Stop all scheduled jobs
    stopAll() {
        for (const [name, job] of this.jobs) {
            job.stop();
            logger.info(`Stopped scheduled job: ${name}`);
        }
        this.jobs.clear();
    }

    // Start all scheduled jobs
    startAll() {
        for (const [name, job] of this.jobs) {
            job.start();
            logger.info(`Started scheduled job: ${name}`);
        }
    }

    // Get scheduler status
    getStatus() {
        const status = {
            totalJobs: this.jobs.size,
            activeJobs: 0,
            jobs: {}
        };

        for (const [name, job] of this.jobs) {
            const jobStatus = {
                scheduled: job.scheduled,
                running: job.running,
                nextRun: job.nextDate()
            };
            status.jobs[name] = jobStatus;
            if (jobStatus.running) status.activeJobs++;
        }

        return status;
    }
}

// Create scheduler instance
const scheduler = new Scheduler();

// Export scheduler
module.exports = scheduler;