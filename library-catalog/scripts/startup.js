const { logger } = require('./logger');
const configService = require('./config');
const databaseService = require('./database');
const sessionService = require('./session');
const healthService = require('./health');
const metricsService = require('./metrics');
const schedulerService = require('./scheduler');
const notificationService = require('./notifications');
const themeService = require('./themes');
const i18nService = require('./i18n');

class StartupService {
    constructor() {
        this.initialized = false;
    }

    // Initialize application
    async initialize() {
        if (this.initialized) {
            logger.warn('Application already initialized');
            return;
        }

        try {
            logger.info('Starting application initialization...');

            // Initialize services in order
            await this.initializeConfig();
            await this.initializeDatabase();
            await this.initializeSession();
            await this.initializeNotifications();
            await this.initializeInternationalization();
            await this.initializeThemes();
            await this.initializeMonitoring();
            await this.initializeScheduler();

            this.initialized = true;
            logger.info('Application initialized successfully');
        } catch (error) {
            logger.error('Error initializing application:', error);
            throw error;
        }
    }

    // Initialize configuration
    async initializeConfig() {
        try {
            logger.info('Initializing configuration...');
            
            // Validate environment variables
            const required = [
                'NODE_ENV',
                'PORT',
                'DB_HOST',
                'DB_USER',
                'DB_PASSWORD',
                'DB_NAME'
            ];

            const missing = required.filter(key => !process.env[key]);
            if (missing.length > 0) {
                throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
            }

            logger.info('Configuration initialized');
        } catch (error) {
            logger.error('Error initializing configuration:', error);
            throw error;
        }
    }

    // Initialize database
    async initializeDatabase() {
        try {
            logger.info('Initializing database...');
            
            // Initialize database connection
            await databaseService.initialize();

            // Run migrations if in development
            if (process.env.NODE_ENV === 'development') {
                await databaseService.runMigrations();
            }

            logger.info('Database initialized');
        } catch (error) {
            logger.error('Error initializing database:', error);
            throw error;
        }
    }

    // Initialize session
    async initializeSession() {
        try {
            logger.info('Initializing session...');
            
            // Initialize session store
            await sessionService.store.sync();

            logger.info('Session initialized');
        } catch (error) {
            logger.error('Error initializing session:', error);
            throw error;
        }
    }

    // Initialize notifications
    async initializeNotifications() {
        try {
            logger.info('Initializing notifications...');
            
            // Verify email configuration
            const isValid = await notificationService.verifyEmailConfig();
            if (!isValid) {
                logger.warn('Email configuration is invalid');
            }

            logger.info('Notifications initialized');
        } catch (error) {
            logger.error('Error initializing notifications:', error);
            throw error;
        }
    }

    // Initialize internationalization
    async initializeInternationalization() {
        try {
            logger.info('Initializing internationalization...');
            
            // Load default locale
            i18nService.loadLocale(i18nService.defaultLocale);

            logger.info('Internationalization initialized');
        } catch (error) {
            logger.error('Error initializing internationalization:', error);
            throw error;
        }
    }

    // Initialize themes
    async initializeThemes() {
        try {
            logger.info('Initializing themes...');
            
            // Load default themes
            themeService.loadTheme('light');
            themeService.loadTheme('dark');

            logger.info('Themes initialized');
        } catch (error) {
            logger.error('Error initializing themes:', error);
            throw error;
        }
    }

    // Initialize monitoring
    async initializeMonitoring() {
        try {
            logger.info('Initializing monitoring...');
            
            // Start health monitoring
            healthService.startMonitoring();

            // Start metrics collection
            metricsService.startCollection();

            logger.info('Monitoring initialized');
        } catch (error) {
            logger.error('Error initializing monitoring:', error);
            throw error;
        }
    }

    // Initialize scheduler
    async initializeScheduler() {
        try {
            logger.info('Initializing scheduler...');
            
            // Start scheduled tasks
            schedulerService.startAll();

            logger.info('Scheduler initialized');
        } catch (error) {
            logger.error('Error initializing scheduler:', error);
            throw error;
        }
    }

    // Shutdown application
    async shutdown() {
        try {
            logger.info('Starting application shutdown...');

            // Stop scheduler
            schedulerService.stopAll();

            // Close database connection
            await databaseService.close();

            // Clean up sessions
            await sessionService.store.clear();

            logger.info('Application shutdown complete');
        } catch (error) {
            logger.error('Error during application shutdown:', error);
            throw error;
        }
    }

    // Handle process signals
    handleSignals() {
        // Handle graceful shutdown
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received. Starting graceful shutdown...');
            await this.shutdown();
            process.exit(0);
        });

        process.on('SIGINT', async () => {
            logger.info('SIGINT received. Starting graceful shutdown...');
            await this.shutdown();
            process.exit(0);
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception:', error);
            this.shutdown().finally(() => process.exit(1));
        });

        // Handle unhandled rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled rejection:', { reason, promise });
        });
    }
}

// Create startup service instance
const startupService = new StartupService();

// Export startup service
module.exports = startupService;