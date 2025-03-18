const path = require('path');

// Base configuration
const config = {
    // Application settings
    app: {
        name: 'Library Catalog',
        version: '1.0.0',
        env: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || 'localhost',
        baseUrl: process.env.BASE_URL || 'http://localhost:3000',
        timezone: process.env.TZ || 'America/Mexico_City'
    },

    // Database settings
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        database: process.env.DB_NAME || 'library_catalog',
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development',
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    },

    // Session settings
    session: {
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        name: 'library_session',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
    },

    // Security settings
    security: {
        bcryptRounds: 10,
        jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret',
        jwtExpiration: '24h',
        allowedOrigins: process.env.ALLOWED_ORIGINS 
            ? process.env.ALLOWED_ORIGINS.split(',') 
            : ['http://localhost:3000'],
        rateLimiting: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        }
    },

    // Mail settings
    mail: {
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.MAIL_PORT) || 587,
        secure: process.env.MAIL_SECURE === 'true',
        auth: {
            user: process.env.MAIL_USER || '',
            pass: process.env.MAIL_PASSWORD || ''
        },
        from: process.env.MAIL_FROM || 'Library Catalog <noreply@library.com>'
    },

    // File storage settings
    storage: {
        uploads: {
            path: path.join(__dirname, '../public/uploads'),
            maxSize: 5 * 1024 * 1024, // 5MB
            allowedTypes: ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx']
        },
        temp: {
            path: path.join(__dirname, '../temp'),
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
    },

    // Logging settings
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: {
            enabled: true,
            path: path.join(__dirname, '../logs'),
            maxSize: 5242880, // 5MB
            maxFiles: 5
        },
        console: {
            enabled: true,
            colorize: true
        }
    },

    // Cache settings
    cache: {
        enabled: true,
        type: 'memory', // memory, redis, etc.
        ttl: 600, // 10 minutes
        checkPeriod: 60 // Check for expired keys every 60 seconds
    },

    // Search settings
    search: {
        minQueryLength: 3,
        maxResults: 100,
        highlightResults: true,
        searchableFields: ['title', 'author', 'isbn', 'category']
    },

    // Loan settings
    loan: {
        defaultDuration: 14, // days
        maxExtensions: 2,
        extensionDuration: 7, // days
        reminderDays: 2, // days before due date
        limits: {
            student: 3,
            teacher: 5,
            librarian: 10
        }
    },

    // Report settings
    reports: {
        exportPath: path.join(__dirname, '../public/exports'),
        formats: ['pdf', 'excel', 'csv'],
        retention: 7 // days to keep exported files
    },

    // Backup settings
    backup: {
        enabled: true,
        path: path.join(__dirname, '../backups'),
        schedule: '0 0 * * *', // Daily at midnight
        retention: 30, // days to keep backups
        compress: true
    },

    // Monitoring settings
    monitoring: {
        enabled: true,
        interval: 5 * 60 * 1000, // 5 minutes
        metrics: {
            enabled: true,
            collectInterval: 60 * 1000 // 1 minute
        },
        health: {
            enabled: true,
            checkInterval: 30 * 1000 // 30 seconds
        }
    },

    // Internationalization settings
    i18n: {
        defaultLocale: 'es',
        availableLocales: ['es', 'en'],
        fallbackLocale: 'es',
        localesPath: path.join(__dirname, '../locales')
    },

    // Theme settings
    theme: {
        default: 'light',
        available: ['light', 'dark'],
        customizable: true,
        path: path.join(__dirname, '../public/css/themes')
    }
};

// Environment-specific overrides
const envConfig = require(`./${config.app.env}`);

// Merge configurations
const mergeConfig = (target, source) => {
    Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object') {
            if (!target[key]) target[key] = {};
            mergeConfig(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    });
};

mergeConfig(config, envConfig);

module.exports = config;