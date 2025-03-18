const rateLimit = require('express-rate-limit');
const { config } = require('../config/app');
const { logger } = require('./logger');
const { RateLimitError } = require('./errors');

class RateLimitService {
    constructor() {
        this.limiters = new Map();
        this.setupDefaultLimiters();
    }

    // Setup default rate limiters
    setupDefaultLimiters() {
        // API general limiter
        this.addLimiter('api', {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // Limit each IP to 100 requests per windowMs
            message: 'Demasiadas solicitudes, por favor intente más tarde'
        });

        // Login limiter
        this.addLimiter('login', {
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 5, // Limit each IP to 5 login attempts per hour
            message: 'Demasiados intentos de inicio de sesión, por favor intente más tarde'
        });

        // Registration limiter
        this.addLimiter('register', {
            windowMs: 24 * 60 * 60 * 1000, // 24 hours
            max: 3, // Limit each IP to 3 registrations per day
            message: 'Demasiados intentos de registro, por favor intente más tarde'
        });

        // File upload limiter
        this.addLimiter('upload', {
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 10, // Limit each IP to 10 uploads per hour
            message: 'Demasiados archivos subidos, por favor intente más tarde'
        });

        // Report generation limiter
        this.addLimiter('report', {
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 5, // Limit each IP to 5 reports per hour
            message: 'Demasiados reportes generados, por favor intente más tarde'
        });
    }

    // Create rate limiter
    createLimiter(options) {
        const defaultOptions = {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // Limit each IP to 100 requests per windowMs
            standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
            legacyHeaders: false, // Disable the `X-RateLimit-*` headers
            handler: (req, res, next) => {
                const error = new RateLimitError(options.message, Math.ceil(options.windowMs / 1000));
                logger.warn(`Rate limit exceeded: ${req.ip}`);
                next(error);
            },
            skip: (req) => {
                // Skip rate limiting for certain conditions
                return (
                    req.ip === '127.0.0.1' || // Skip localhost
                    req.session?.user?.role === 'bibliotecario' // Skip librarians
                );
            },
            keyGenerator: (req) => {
                // Generate unique key for rate limiting
                return req.session?.user?.id 
                    ? `${req.ip}-${req.session.user.id}` // Use IP + user ID if logged in
                    : req.ip; // Use IP only if not logged in
            }
        };

        return rateLimit({
            ...defaultOptions,
            ...options
        });
    }

    // Add rate limiter
    addLimiter(name, options) {
        this.limiters.set(name, this.createLimiter(options));
        logger.info(`Added rate limiter: ${name}`);
    }

    // Get rate limiter
    getLimiter(name) {
        if (!this.limiters.has(name)) {
            logger.warn(`Rate limiter not found: ${name}`);
            return this.limiters.get('api'); // Return default limiter
        }
        return this.limiters.get(name);
    }

    // Dynamic rate limiter based on user role
    createRoleLimiter(options = {}) {
        return (req, res, next) => {
            const role = req.session?.user?.role;
            let limit;

            switch (role) {
                case 'bibliotecario':
                    limit = options.librarianLimit || 1000;
                    break;
                case 'docente':
                    limit = options.teacherLimit || 500;
                    break;
                case 'alumno':
                    limit = options.studentLimit || 200;
                    break;
                default:
                    limit = options.defaultLimit || 100;
            }

            const limiter = this.createLimiter({
                ...options,
                max: limit
            });

            return limiter(req, res, next);
        };
    }

    // Create concurrent requests limiter
    createConcurrentLimiter(maxConcurrent = 10) {
        const ongoing = new Map();

        return async (req, res, next) => {
            const key = req.session?.user?.id || req.ip;
            
            if (!ongoing.has(key)) {
                ongoing.set(key, 0);
            }

            const current = ongoing.get(key);

            if (current >= maxConcurrent) {
                return next(new RateLimitError(
                    'Demasiadas solicitudes simultáneas',
                    30
                ));
            }

            ongoing.set(key, current + 1);

            res.on('finish', () => {
                const newCount = ongoing.get(key) - 1;
                if (newCount <= 0) {
                    ongoing.delete(key);
                } else {
                    ongoing.set(key, newCount);
                }
            });

            next();
        };
    }

    // Create sliding window rate limiter
    createSlidingWindowLimiter(options = {}) {
        const windows = new Map();
        const { windowMs = 60000, max = 30 } = options;

        return (req, res, next) => {
            const key = req.session?.user?.id || req.ip;
            const now = Date.now();

            if (!windows.has(key)) {
                windows.set(key, []);
            }

            const requests = windows.get(key);
            const windowStart = now - windowMs;

            // Remove old requests
            while (requests.length > 0 && requests[0] < windowStart) {
                requests.shift();
            }

            if (requests.length >= max) {
                return next(new RateLimitError(
                    options.message || 'Demasiadas solicitudes',
                    Math.ceil((requests[0] + windowMs - now) / 1000)
                ));
            }

            requests.push(now);
            next();
        };
    }

    // Get middleware
    middleware(name = 'api') {
        return this.getLimiter(name);
    }
}

// Create rate limit service instance
const rateLimitService = new RateLimitService();

// Export rate limit service
module.exports = rateLimitService;