module.exports = {
    app: {
        debug: true,
        logLevel: 'debug'
    },

    database: {
        // Use in-memory SQLite for testing
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    },

    session: {
        secret: 'test-secret',
        cookie: {
            secure: false
        }
    },

    security: {
        bcryptRounds: 4, // Lower rounds for faster tests
        rateLimiting: {
            enabled: false
        }
    },

    mail: {
        // Use nodemailer's test account
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: 'test@example.com',
            pass: 'testpass'
        }
    },

    logging: {
        level: 'error', // Minimal logging during tests
        console: {
            enabled: false
        },
        file: {
            enabled: true,
            filename: 'test.log'
        }
    },

    cache: {
        enabled: true,
        type: 'memory',
        ttl: 60 // 1 minute for testing
    },

    monitoring: {
        enabled: false,
        metrics: {
            enabled: false
        },
        health: {
            enabled: false
        }
    },

    backup: {
        enabled: false
    },

    search: {
        highlightResults: false,
        maxResults: 10
    },

    storage: {
        uploads: {
            path: '/tmp/test-uploads',
            maxSize: 1024 * 1024 // 1MB for testing
        },
        temp: {
            path: '/tmp/test-temp',
            maxAge: 3600000 // 1 hour
        }
    },

    // Test-specific settings
    test: {
        timeout: 5000, // 5 seconds
        coverage: {
            enabled: true,
            directory: 'coverage',
            reporters: ['text', 'html']
        },
        mocks: {
            enabled: true,
            directory: 'test/mocks'
        },
        fixtures: {
            enabled: true,
            directory: 'test/fixtures'
        }
    },

    // Feature flags for testing
    features: {
        mockServices: true,
        skipTimeouts: true,
        disableEmails: true
    },

    // Test data
    testData: {
        users: {
            admin: {
                username: 'admin',
                password: 'admin123',
                role: 'bibliotecario'
            },
            teacher: {
                username: 'teacher',
                password: 'teacher123',
                role: 'docente'
            },
            student: {
                username: 'student',
                password: 'student123',
                role: 'alumno'
            }
        },
        books: {
            available: {
                title: 'Test Book',
                author: 'Test Author',
                isbn: '9780123456789',
                quantity: 5
            },
            unavailable: {
                title: 'Unavailable Book',
                author: 'Test Author',
                isbn: '9780987654321',
                quantity: 0
            }
        }
    },

    // Error handling in tests
    errors: {
        showStack: true,
        throwUnhandled: true
    },

    // Performance settings for tests
    performance: {
        timeout: 1000, // 1 second timeout for operations
        maxMemory: 512, // 512MB max memory
        cleanupInterval: 100 // Cleanup every 100 tests
    }
};