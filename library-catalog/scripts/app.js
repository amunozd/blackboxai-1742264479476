const express = require('express');
const path = require('path');
const { logger } = require('./logger');
const middlewareService = require('./middleware');
const routeService = require('./routes');
const startupService = require('./startup');
const healthService = require('./health');
const metricsService = require('./metrics');

class Application {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
    }

    // Initialize application
    async initialize() {
        try {
            // Initialize core services
            await startupService.initialize();

            // Setup application
            this.setupMiddleware();
            this.setupRoutes();
            this.setupErrorHandling();

            logger.info('Application initialized successfully');
        } catch (error) {
            logger.error('Error initializing application:', error);
            throw error;
        }
    }

    // Setup middleware
    setupMiddleware() {
        // Static files
        this.app.use(express.static(path.join(__dirname, '../public')));

        // Apply middleware
        this.app.use(middlewareService.getMiddleware());
    }

    // Setup routes
    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', healthService.middleware());

        // Metrics endpoint
        this.app.get('/metrics', (req, res) => {
            res.json(metricsService.getMetrics());
        });

        // API routes
        this.app.use('/api', routeService.getRoutes());

        // Handle 404
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                message: 'Ruta no encontrada'
            });
        });
    }

    // Setup error handling
    setupErrorHandling() {
        // Error handler middleware must be last
        this.app.use((err, req, res, next) => {
            logger.error('Unhandled error:', err);

            res.status(err.status || 500).json({
                success: false,
                message: err.message || 'Error interno del servidor',
                errors: process.env.NODE_ENV === 'development' ? err.stack : undefined
            });
        });
    }

    // Start server
    async start() {
        try {
            // Initialize application
            await this.initialize();

            // Start server
            this.server = this.app.listen(this.port, () => {
                logger.info(`Server running on port ${this.port}`);
            });

            // Handle server errors
            this.server.on('error', (error) => {
                logger.error('Server error:', error);
                this.shutdown();
            });

            // Setup graceful shutdown
            this.setupGracefulShutdown();
        } catch (error) {
            logger.error('Error starting server:', error);
            process.exit(1);
        }
    }

    // Setup graceful shutdown
    setupGracefulShutdown() {
        // Handle process signals
        process.on('SIGTERM', () => this.shutdown());
        process.on('SIGINT', () => this.shutdown());

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception:', error);
            this.shutdown();
        });

        // Handle unhandled rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled rejection:', { reason, promise });
        });
    }

    // Shutdown application
    async shutdown() {
        logger.info('Starting graceful shutdown...');

        try {
            // Close server
            if (this.server) {
                await new Promise((resolve) => {
                    this.server.close(resolve);
                });
            }

            // Shutdown services
            await startupService.shutdown();

            logger.info('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    }

    // Get Express application instance
    getApp() {
        return this.app;
    }

    // Get server instance
    getServer() {
        return this.server;
    }
}

// Create application instance
const application = new Application();

// Export application
module.exports = application;

// Start application if running directly
if (require.main === module) {
    application.start().catch((error) => {
        logger.error('Failed to start application:', error);
        process.exit(1);
    });
}