const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const { logger } = require('./logger');
const sessionService = require('./session');
const securityService = require('./security');
const rateLimitService = require('./ratelimit');
const i18nService = require('./i18n');
const themeService = require('./themes');
const metricsService = require('./metrics');
const { responseMiddleware } = require('./responses');

class MiddlewareService {
    constructor() {
        this.middleware = [];
        this.setupMiddleware();
    }

    // Setup all middleware
    setupMiddleware() {
        // Basic middleware
        this.addMiddleware(express.json());
        this.addMiddleware(express.urlencoded({ extended: true }));
        this.addMiddleware(cookieParser());
        this.addMiddleware(methodOverride('_method'));
        this.addMiddleware(compression());

        // Security middleware
        this.addMiddleware(securityService.getMiddleware());

        // Session middleware
        this.addMiddleware(sessionService.middleware());
        this.addMiddleware(sessionService.manage());

        // Rate limiting middleware
        this.addMiddleware(rateLimitService.middleware());

        // Internationalization middleware
        this.addMiddleware(i18nService.middleware());

        // Theme middleware
        this.addMiddleware(themeService.middleware());

        // Metrics middleware
        this.addMiddleware(metricsService.middleware());

        // Response formatting middleware
        this.addMiddleware(responseMiddleware);

        // Request logging middleware
        this.addMiddleware(this.requestLogger());

        // Error handling middleware must be last
        this.addMiddleware(this.errorHandler());
    }

    // Add middleware
    addMiddleware(middleware) {
        if (Array.isArray(middleware)) {
            this.middleware.push(...middleware);
        } else {
            this.middleware.push(middleware);
        }
    }

    // Request logger middleware
    requestLogger() {
        return (req, res, next) => {
            // Skip logging for certain paths
            if (req.path === '/health' || req.path === '/metrics') {
                return next();
            }

            const start = Date.now();
            const logData = {
                method: req.method,
                path: req.path,
                query: req.query,
                ip: req.ip,
                userAgent: req.get('user-agent')
            };

            // Log request
            logger.info('Incoming request', logData);

            // Log response
            res.on('finish', () => {
                const duration = Date.now() - start;
                logData.status = res.statusCode;
                logData.duration = `${duration}ms`;
                
                if (res.statusCode >= 400) {
                    logger.warn('Request error', logData);
                } else {
                    logger.info('Request completed', logData);
                }
            });

            next();
        };
    }

    // Error handler middleware
    errorHandler() {
        return (err, req, res, next) => {
            // Log error
            logger.error('Error handling request:', {
                error: err.message,
                stack: err.stack,
                path: req.path,
                method: req.method
            });

            // Set local variables only in development
            if (process.env.NODE_ENV === 'development') {
                res.locals.message = err.message;
                res.locals.error = err;
            }

            // Determine status code
            const status = err.status || 500;

            // Send error response
            res.status(status).json({
                success: false,
                message: err.message,
                errors: process.env.NODE_ENV === 'development' ? err.stack : undefined
            });
        };
    }

    // Not found handler middleware
    notFoundHandler() {
        return (req, res) => {
            logger.warn('Route not found:', {
                method: req.method,
                path: req.path
            });

            res.status(404).json({
                success: false,
                message: 'Ruta no encontrada'
            });
        };
    }

    // Validation error handler middleware
    validationErrorHandler() {
        return (err, req, res, next) => {
            if (err.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    message: 'Error de validación',
                    errors: err.errors
                });
            }
            next(err);
        };
    }

    // Database error handler middleware
    databaseErrorHandler() {
        return (err, req, res, next) => {
            if (err.name === 'SequelizeError') {
                logger.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error de base de datos'
                });
            }
            next(err);
        };
    }

    // Authentication error handler middleware
    authErrorHandler() {
        return (err, req, res, next) => {
            if (err.name === 'AuthenticationError') {
                return res.status(401).json({
                    success: false,
                    message: err.message
                });
            }
            next(err);
        };
    }

    // Get all middleware
    getMiddleware() {
        return [
            ...this.middleware,
            this.notFoundHandler(),
            this.validationErrorHandler(),
            this.databaseErrorHandler(),
            this.authErrorHandler(),
            this.errorHandler()
        ];
    }
}

// Create middleware service instance
const middlewareService = new MiddlewareService();

// Export middleware service
module.exports = middlewareService;