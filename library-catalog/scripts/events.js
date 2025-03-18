const EventEmitter = require('events');
const { logger } = require('./logger');
const { SystemEvents } = require('./constants');

class EventService extends EventEmitter {
    constructor() {
        super();
        this.setupEventHandlers();
    }

    // Setup default event handlers
    setupEventHandlers() {
        // User events
        this.on(SystemEvents.USER_LOGIN, this.handleUserLogin.bind(this));
        this.on(SystemEvents.USER_LOGOUT, this.handleUserLogout.bind(this));

        // Loan events
        this.on(SystemEvents.LOAN_CREATED, this.handleLoanCreated.bind(this));
        this.on(SystemEvents.LOAN_RETURNED, this.handleLoanReturned.bind(this));

        // Book events
        this.on(SystemEvents.BOOK_ADDED, this.handleBookAdded.bind(this));
        this.on(SystemEvents.BOOK_UPDATED, this.handleBookUpdated.bind(this));

        // Error handling
        this.on('error', this.handleError.bind(this));
    }

    // User event handlers
    async handleUserLogin(user) {
        try {
            logger.info('User logged in:', {
                userId: user.id,
                username: user.username
            });

            // Update last login timestamp
            await user.update({
                lastLogin: new Date()
            });

            // Track metrics
            const metricsService = require('./metrics');
            metricsService.trackUserActivity('login');
        } catch (error) {
            logger.error('Error handling user login:', error);
        }
    }

    async handleUserLogout(user) {
        try {
            logger.info('User logged out:', {
                userId: user.id,
                username: user.username
            });

            // Track metrics
            const metricsService = require('./metrics');
            metricsService.trackUserActivity('logout');
        } catch (error) {
            logger.error('Error handling user logout:', error);
        }
    }

    // Loan event handlers
    async handleLoanCreated(loan) {
        try {
            logger.info('Loan created:', {
                loanId: loan.id,
                userId: loan.userId,
                bookId: loan.bookId
            });

            // Send confirmation email
            const notificationService = require('./notifications');
            await notificationService.sendLoanConfirmation(loan);

            // Schedule reminder
            const schedulerService = require('./scheduler');
            schedulerService.scheduleLoanReminder(loan);

            // Update book availability
            const book = await loan.getBook();
            await book.update({
                availableQuantity: book.availableQuantity - 1
            });
        } catch (error) {
            logger.error('Error handling loan creation:', error);
        }
    }

    async handleLoanReturned(loan) {
        try {
            logger.info('Loan returned:', {
                loanId: loan.id,
                userId: loan.userId,
                bookId: loan.bookId
            });

            // Send return confirmation
            const notificationService = require('./notifications');
            await notificationService.sendReturnConfirmation(loan);

            // Update book availability
            const book = await loan.getBook();
            await book.update({
                availableQuantity: book.availableQuantity + 1
            });

            // Clear any scheduled reminders
            const schedulerService = require('./scheduler');
            schedulerService.cancelLoanReminders(loan.id);
        } catch (error) {
            logger.error('Error handling loan return:', error);
        }
    }

    // Book event handlers
    async handleBookAdded(book) {
        try {
            logger.info('Book added:', {
                bookId: book.id,
                title: book.title,
                isbn: book.isbn
            });

            // Clear cache
            const cacheService = require('./cache');
            cacheService.clearByTag('books');

            // Update search index
            const searchService = require('./search');
            await searchService.indexBook(book);
        } catch (error) {
            logger.error('Error handling book addition:', error);
        }
    }

    async handleBookUpdated(book) {
        try {
            logger.info('Book updated:', {
                bookId: book.id,
                title: book.title,
                isbn: book.isbn
            });

            // Clear cache
            const cacheService = require('./cache');
            cacheService.clearByTag('books');
            cacheService.delete(`book:${book.id}`);

            // Update search index
            const searchService = require('./search');
            await searchService.updateBookIndex(book);
        } catch (error) {
            logger.error('Error handling book update:', error);
        }
    }

    // Error handler
    handleError(error) {
        logger.error('Event error:', error);
    }

    // Emit event with error handling
    safeEmit(event, ...args) {
        try {
            this.emit(event, ...args);
        } catch (error) {
            logger.error(`Error emitting ${event}:`, error);
            this.handleError(error);
        }
    }

    // Subscribe to event
    subscribe(event, handler) {
        this.on(event, handler);
        logger.debug(`Subscribed to event: ${event}`);
    }

    // Unsubscribe from event
    unsubscribe(event, handler) {
        this.off(event, handler);
        logger.debug(`Unsubscribed from event: ${event}`);
    }

    // Subscribe to event once
    subscribeOnce(event, handler) {
        this.once(event, handler);
        logger.debug(`Subscribed once to event: ${event}`);
    }

    // Get event listeners
    getSubscribers(event) {
        return this.listeners(event);
    }

    // Check if event has subscribers
    hasSubscribers(event) {
        return this.listenerCount(event) > 0;
    }

    // Remove all listeners for an event
    clearSubscribers(event) {
        this.removeAllListeners(event);
        logger.debug(`Cleared all subscribers for event: ${event}`);
    }
}

// Create event service instance
const eventService = new EventService();

// Export event service
module.exports = eventService;