module.exports = {
    app: {
        debug: false,
        logLevel: 'info'
    },

    database: {
        logging: false,
        pool: {
            max: 20,
            min: 5,
            acquire: 60000,
            idle: 30000
        },
        ssl: true,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    },

    session: {
        cookie: {
            secure: true,
            sameSite: 'strict'
        },
        proxy: true // If using a reverse proxy
    },

    security: {
        rateLimiting: {
            enabled: true,
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        },
        helmet: {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.tailwindcss.com'],
                    styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
                    imgSrc: ["'self'", 'data:', 'https:'],
                    fontSrc: ["'self'", 'fonts.gstatic.com'],
                    connectSrc: ["'self'"]
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        }
    },

    mail: {
        pool: {
            maxConnections: 5,
            maxMessages: 100
        },
        secure: true,
        tls: {
            rejectUnauthorized: true
        }
    },

    logging: {
        level: 'info',
        console: {
            enabled: false
        },
        file: {
            enabled: true,
            maxSize: '50m',
            maxFiles: 10,
            tailable: true
        }
    },

    cache: {
        enabled: true,
        ttl: 3600, // 1 hour
        checkPeriod: 600 // Check for expired keys every 10 minutes
    },

    monitoring: {
        enabled: true,
        metrics: {
            collectInterval: 60 * 1000 // 1 minute
        },
        health: {
            checkInterval: 30 * 1000 // 30 seconds
        },
        alerts: {
            enabled: true,
            thresholds: {
                memory: 90, // Alert if memory usage > 90%
                cpu: 80, // Alert if CPU usage > 80%
                disk: 85, // Alert if disk usage > 85%
                errorRate: 5 // Alert if error rate > 5%
            }
        }
    },

    backup: {
        enabled: true,
        schedule: '0 0 * * *', // Daily at midnight
        retention: 30, // Keep backups for 30 days
        compress: true,
        storage: {
            type: 's3', // Use S3 for production backups
            config: {
                bucket: process.env.BACKUP_BUCKET,
                region: process.env.AWS_REGION
            }
        }
    },

    search: {
        highlightResults: true,
        maxResults: 100,
        cacheResults: true,
        cacheTTL: 3600 // 1 hour
    },

    storage: {
        uploads: {
            maxSize: 10 * 1024 * 1024, // 10MB
            virus_scan: true
        },
        cdn: {
            enabled: true,
            baseUrl: process.env.CDN_URL
        }
    },

    // Production performance optimizations
    performance: {
        compression: {
            enabled: true,
            level: 6
        },
        caching: {
            browser: {
                enabled: true,
                maxAge: 86400 // 1 day
            },
            static: {
                enabled: true,
                maxAge: 604800 // 1 week
            }
        },
        clustering: {
            enabled: true,
            workers: 'auto' // Use number of CPU cores
        }
    },

    // Error handling
    errors: {
        showStack: false,
        logUnhandled: true,
        notifyOnError: true
    },

    // Feature flags for production
    features: {
        maintenance: {
            enabled: false,
            message: 'Sistema en mantenimiento'
        },
        analytics: {
            enabled: true,
            provider: 'google-analytics',
            trackingId: process.env.GA_TRACKING_ID
        }
    }
};