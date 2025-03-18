const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// Rate limiting configurations
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login attempts per windowMs
    message: {
        error: 'Demasiados intentos de inicio de sesión. Por favor, intenta nuevamente en 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Demasiadas solicitudes. Por favor, intenta más tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Security headers configuration
const helmetConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://cdnjs.cloudflare.com'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false
};

// CORS configuration
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS ? 
        process.env.ALLOWED_ORIGINS.split(',') : 
        'http://localhost:8000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
};

// Session security middleware
const sessionSecurity = (req, res, next) => {
    // Regenerate session ID periodically
    if (req.session.user && req.session.lastRotation) {
        const rotationInterval = 15 * 60 * 1000; // 15 minutes
        if (Date.now() - req.session.lastRotation >= rotationInterval) {
            req.session.regenerate((err) => {
                if (err) {
                    return next(err);
                }
                req.session.user = req.session.user;
                req.session.userRole = req.session.userRole;
                req.session.lastRotation = Date.now();
                next();
            });
            return;
        }
    } else if (req.session.user) {
        req.session.lastRotation = Date.now();
    }

    next();
};

// XSS Protection middleware
const xssProtection = (req, res, next) => {
    // Sanitize request body
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key]
                    .replace(/[<>]/g, '') // Remove < and >
                    .replace(/javascript:/gi, '') // Remove javascript: protocol
                    .replace(/on\w+=/gi, '') // Remove inline event handlers
                    .trim();
            }
        });
    }

    // Sanitize query parameters
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = req.query[key]
                    .replace(/[<>]/g, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+=/gi, '')
                    .trim();
            }
        });
    }

    next();
};

// SQL Injection Protection middleware
const sqlInjectionProtection = (req, res, next) => {
    const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC|--)\b)|[;']/i;
    
    const checkValue = (value) => {
        if (typeof value === 'string' && sqlInjectionPattern.test(value)) {
            throw new Error('Posible intento de inyección SQL detectado');
        }
    };

    const checkObject = (obj) => {
        Object.values(obj).forEach(value => {
            if (typeof value === 'object' && value !== null) {
                checkObject(value);
            } else {
                checkValue(value);
            }
        });
    };

    try {
        if (req.body) checkObject(req.body);
        if (req.query) checkObject(req.query);
        if (req.params) checkObject(req.params);
        next();
    } catch (error) {
        res.status(403).json({
            error: 'Solicitud no válida'
        });
    }
};

// Request validation middleware
const validateRequest = (req, res, next) => {
    // Validate Content-Type for POST/PUT requests
    if ((req.method === 'POST' || req.method === 'PUT') && 
        !req.is('application/json') && 
        !req.is('multipart/form-data') && 
        !req.is('application/x-www-form-urlencoded')) {
        return res.status(415).json({
            error: 'Tipo de contenido no soportado'
        });
    }

    // Validate request size
    const contentLength = parseInt(req.headers['content-length'], 10);
    if (contentLength && contentLength > 10 * 1024 * 1024) { // 10MB limit
        return res.status(413).json({
            error: 'Solicitud demasiado grande'
        });
    }

    next();
};

module.exports = {
    loginLimiter,
    apiLimiter,
    helmetConfig,
    corsOptions,
    sessionSecurity,
    xssProtection,
    sqlInjectionProtection,
    validateRequest,
    // Export configured middleware
    configuredHelmet: helmet(helmetConfig),
    configuredCors: cors(corsOptions)
};