module.exports = {
    app: {
        debug: true,
        logLevel: 'debug'
    },

    database: {
        logging: true,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    },

    session: {
        cookie: {
            secure: false
        }
    },

    security: {
        rateLimiting: {
            enabled: false
        }
    },

    mail: {
        // Use ethereal.email for development
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: process.env.DEV_MAIL_USER,
            pass: process.env.DEV_MAIL_PASS
        }
    },

    logging: {
        level: 'debug',
        console: {
            enabled: true,
            colorize: true,
            prettyPrint: true
        },
        file: {
            enabled: true,
            maxSize: '10m',
            maxFiles: 3
        }
    },

    cache: {
        enabled: true,
        ttl: 300 // 5 minutes for development
    },

    monitoring: {
        metrics: {
            collectInterval: 30 * 1000 // 30 seconds
        },
        health: {
            checkInterval: 15 * 1000 // 15 seconds
        }
    },

    backup: {
        enabled: false
    },

    search: {
        highlightResults: true,
        maxResults: 50
    },

    // Development-specific features
    features: {
        debugRoutes: true,
        mockServices: true,
        autoReload: true,
        seedData: true
    },

    // Development tools
    devTools: {
        enabled: true,
        debugger: {
            enabled: true,
            port: 9229
        },
        apiDocs: {
            enabled: true,
            path: '/api-docs'
        },
        errorDetails: true
    }
};