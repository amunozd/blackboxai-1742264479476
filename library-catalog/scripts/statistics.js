const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logger } = require('./logger');

class StatisticsService {
    constructor(models) {
        this.models = models;
    }

    // Get general statistics
    async getGeneralStats() {
        try {
            const [
                totalBooks,
                totalUsers,
                totalLoans,
                activeLoans,
                overdueLoans
            ] = await Promise.all([
                this.models.Book.count(),
                this.models.User.count(),
                this.models.Loan.count(),
                this.models.Loan.count({ where: { status: 'active' } }),
                this.models.Loan.count({ where: { status: 'overdue' } })
            ]);

            return {
                books: {
                    total: totalBooks
                },
                users: {
                    total: totalUsers
                },
                loans: {
                    total: totalLoans,
                    active: activeLoans,
                    overdue: overdueLoans
                }
            };
        } catch (error) {
            logger.error('Error getting general statistics:', error);
            throw error;
        }
    }

    // Get book statistics
    async getBookStats() {
        try {
            const results = await Promise.all([
                // Most borrowed books
                this.models.Loan.findAll({
                    attributes: [
                        'bookId',
                        [sequelize.fn('COUNT', sequelize.col('id')), 'loanCount']
                    ],
                    include: [{
                        model: this.models.Book,
                        attributes: ['title', 'author']
                    }],
                    group: ['bookId'],
                    order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
                    limit: 10
                }),

                // Books by category
                this.models.Book.findAll({
                    attributes: [
                        'category',
                        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                    ],
                    group: ['category']
                }),

                // Books availability
                this.models.Book.findAll({
                    attributes: [
                        'status',
                        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                    ],
                    group: ['status']
                })
            ]);

            return {
                mostBorrowed: results[0],
                byCategory: results[1],
                byStatus: results[2]
            };
        } catch (error) {
            logger.error('Error getting book statistics:', error);
            throw error;
        }
    }

    // Get loan statistics
    async getLoanStats(startDate, endDate) {
        try {
            const dateFilter = {
                createdAt: {
                    [Op.between]: [startDate, endDate]
                }
            };

            const results = await Promise.all([
                // Loans by status
                this.models.Loan.findAll({
                    where: dateFilter,
                    attributes: [
                        'status',
                        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                    ],
                    group: ['status']
                }),

                // Loans by user role
                this.models.Loan.findAll({
                    where: dateFilter,
                    include: [{
                        model: this.models.User,
                        attributes: ['role']
                    }],
                    attributes: [
                        'User.role',
                        [sequelize.fn('COUNT', sequelize.col('Loan.id')), 'count']
                    ],
                    group: ['User.role']
                }),

                // Average loan duration
                this.models.Loan.findAll({
                    where: {
                        ...dateFilter,
                        status: 'returned'
                    },
                    attributes: [
                        [sequelize.fn('AVG', 
                            sequelize.fn('DATEDIFF', 
                                sequelize.col('returnDate'), 
                                sequelize.col('loanDate')
                            )
                        ), 'avgDuration']
                    ]
                })
            ]);

            return {
                byStatus: results[0],
                byUserRole: results[1],
                averageDuration: results[2][0].get('avgDuration')
            };
        } catch (error) {
            logger.error('Error getting loan statistics:', error);
            throw error;
        }
    }

    // Get user statistics
    async getUserStats() {
        try {
            const results = await Promise.all([
                // Users by role
                this.models.User.findAll({
                    attributes: [
                        'role',
                        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                    ],
                    group: ['role']
                }),

                // Most active users
                this.models.Loan.findAll({
                    attributes: [
                        'userId',
                        [sequelize.fn('COUNT', sequelize.col('id')), 'loanCount']
                    ],
                    include: [{
                        model: this.models.User,
                        attributes: ['fullName', 'role']
                    }],
                    group: ['userId'],
                    order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
                    limit: 10
                }),

                // Users with overdue loans
                this.models.User.findAll({
                    include: [{
                        model: this.models.Loan,
                        where: { status: 'overdue' }
                    }],
                    attributes: [
                        'id',
                        'fullName',
                        'role',
                        [sequelize.fn('COUNT', sequelize.col('Loans.id')), 'overdueCount']
                    ],
                    group: ['User.id']
                })
            ]);

            return {
                byRole: results[0],
                mostActive: results[1],
                withOverdueLoans: results[2]
            };
        } catch (error) {
            logger.error('Error getting user statistics:', error);
            throw error;
        }
    }

    // Get monthly report
    async getMonthlyReport(year, month) {
        try {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);

            const results = await Promise.all([
                // New loans
                this.models.Loan.count({
                    where: {
                        createdAt: {
                            [Op.between]: [startDate, endDate]
                        }
                    }
                }),

                // Returned books
                this.models.Loan.count({
                    where: {
                        returnDate: {
                            [Op.between]: [startDate, endDate]
                        }
                    }
                }),

                // New users
                this.models.User.count({
                    where: {
                        createdAt: {
                            [Op.between]: [startDate, endDate]
                        }
                    }
                }),

                // New books
                this.models.Book.count({
                    where: {
                        createdAt: {
                            [Op.between]: [startDate, endDate]
                        }
                    }
                })
            ]);

            return {
                period: {
                    year,
                    month
                },
                newLoans: results[0],
                returnedBooks: results[1],
                newUsers: results[2],
                newBooks: results[3]
            };
        } catch (error) {
            logger.error('Error getting monthly report:', error);
            throw error;
        }
    }
}

module.exports = StatisticsService;