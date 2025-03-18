const express = require('express');
const { logger } = require('./logger');
const permissionService = require('./permissions');
const rateLimitService = require('./ratelimit');
const { UserRoles } = require('./constants');

class RouteService {
    constructor() {
        this.router = express.Router();
        this.setupRoutes();
    }

    // Setup all routes
    setupRoutes() {
        // Auth routes
        this.router.use('/auth', this.getAuthRoutes());

        // Book routes
        this.router.use('/books', this.getBookRoutes());

        // Loan routes
        this.router.use('/loans', this.getLoanRoutes());

        // User routes
        this.router.use('/users', this.getUserRoutes());

        // Report routes
        this.router.use('/reports', this.getReportRoutes());

        // Admin routes
        this.router.use('/admin', this.getAdminRoutes());

        // API routes
        this.router.use('/api', this.getApiRoutes());
    }

    // Auth routes
    getAuthRoutes() {
        const router = express.Router();
        const authController = require('../controllers/auth');

        router.post('/login',
            rateLimitService.getLimiter('login'),
            authController.login
        );

        router.post('/register',
            rateLimitService.getLimiter('register'),
            authController.register
        );

        router.post('/logout',
            authController.logout
        );

        router.post('/forgot-password',
            rateLimitService.getLimiter('forgot-password'),
            authController.forgotPassword
        );

        router.post('/reset-password',
            rateLimitService.getLimiter('reset-password'),
            authController.resetPassword
        );

        return router;
    }

    // Book routes
    getBookRoutes() {
        const router = express.Router();
        const bookController = require('../controllers/books');

        router.get('/',
            bookController.list
        );

        router.get('/:id',
            bookController.get
        );

        router.post('/',
            permissionService.checkPermission('book.create'),
            bookController.create
        );

        router.put('/:id',
            permissionService.checkPermission('book.update'),
            bookController.update
        );

        router.delete('/:id',
            permissionService.checkPermission('book.delete'),
            bookController.delete
        );

        router.get('/search',
            bookController.search
        );

        router.post('/import',
            permissionService.checkPermission('book.create'),
            rateLimitService.getLimiter('import'),
            bookController.import
        );

        return router;
    }

    // Loan routes
    getLoanRoutes() {
        const router = express.Router();
        const loanController = require('../controllers/loans');

        router.get('/',
            permissionService.authenticate(),
            loanController.list
        );

        router.get('/:id',
            permissionService.authenticate(),
            loanController.get
        );

        router.post('/',
            permissionService.authenticate(),
            loanController.create
        );

        router.put('/:id/return',
            permissionService.checkPermission('loan.update'),
            loanController.return
        );

        router.put('/:id/extend',
            permissionService.authenticate(),
            loanController.extend
        );

        router.get('/overdue',
            permissionService.checkPermission('loan.read'),
            loanController.listOverdue
        );

        return router;
    }

    // User routes
    getUserRoutes() {
        const router = express.Router();
        const userController = require('../controllers/users');

        router.get('/',
            permissionService.checkRole(UserRoles.LIBRARIAN),
            userController.list
        );

        router.get('/:id',
            permissionService.authenticate(),
            userController.get
        );

        router.post('/',
            permissionService.checkRole(UserRoles.LIBRARIAN),
            userController.create
        );

        router.put('/:id',
            permissionService.authenticate(),
            userController.update
        );

        router.delete('/:id',
            permissionService.checkRole(UserRoles.LIBRARIAN),
            userController.delete
        );

        router.get('/:id/loans',
            permissionService.authenticate(),
            userController.getLoans
        );

        return router;
    }

    // Report routes
    getReportRoutes() {
        const router = express.Router();
        const reportController = require('../controllers/reports');

        router.get('/loans',
            permissionService.checkRole(UserRoles.LIBRARIAN),
            rateLimitService.getLimiter('report'),
            reportController.generateLoanReport
        );

        router.get('/books',
            permissionService.checkRole(UserRoles.LIBRARIAN),
            rateLimitService.getLimiter('report'),
            reportController.generateBookReport
        );

        router.get('/users',
            permissionService.checkRole(UserRoles.LIBRARIAN),
            rateLimitService.getLimiter('report'),
            reportController.generateUserReport
        );

        return router;
    }

    // Admin routes
    getAdminRoutes() {
        const router = express.Router();
        const adminController = require('../controllers/admin');

        router.get('/dashboard',
            permissionService.checkRole(UserRoles.LIBRARIAN),
            adminController.getDashboard
        );

        router.get('/settings',
            permissionService.checkRole(UserRoles.LIBRARIAN),
            adminController.getSettings
        );

        router.put('/settings',
            permissionService.checkRole(UserRoles.LIBRARIAN),
            adminController.updateSettings
        );

        router.get('/logs',
            permissionService.checkRole(UserRoles.LIBRARIAN),
            adminController.getLogs
        );

        return router;
    }

    // API routes
    getApiRoutes() {
        const router = express.Router();
        const apiController = require('../controllers/api');

        router.use(rateLimitService.getLimiter('api'));

        router.get('/books',
            apiController.listBooks
        );

        router.get('/users',
            permissionService.checkRole(UserRoles.LIBRARIAN),
            apiController.listUsers
        );

        router.get('/loans',
            permissionService.checkRole(UserRoles.LIBRARIAN),
            apiController.listLoans
        );

        router.get('/stats',
            permissionService.checkRole(UserRoles.LIBRARIAN),
            apiController.getStats
        );

        return router;
    }

    // Get all routes
    getRoutes() {
        return this.router;
    }
}

// Create route service instance
const routeService = new RouteService();

// Export route service
module.exports = routeService;