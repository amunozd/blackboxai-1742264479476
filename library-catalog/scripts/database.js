const { Sequelize } = require('sequelize');
const { logger } = require('./logger');
const configService = require('./config');

class DatabaseService {
    constructor() {
        this.sequelize = null;
        this.models = new Map();
        this.initialized = false;
    }

    // Initialize database connection
    async initialize() {
        if (this.initialized) {
            return this.sequelize;
        }

        try {
            const dbConfig = configService.getDatabaseConfig();

            this.sequelize = new Sequelize({
                host: dbConfig.host,
                username: dbConfig.user,
                password: dbConfig.password,
                database: dbConfig.database,
                port: dbConfig.port,
                dialect: 'mysql',
                logging: (msg) => logger.debug(msg),
                pool: {
                    max: 5,
                    min: 0,
                    acquire: 30000,
                    idle: 10000
                },
                define: {
                    timestamps: true,
                    underscored: true,
                    paranoid: true // Soft deletes
                }
            });

            // Test connection
            await this.testConnection();

            // Initialize models
            await this.initializeModels();

            this.initialized = true;
            logger.info('Database initialized successfully');

            return this.sequelize;
        } catch (error) {
            logger.error('Error initializing database:', error);
            throw error;
        }
    }

    // Test database connection
    async testConnection() {
        try {
            await this.sequelize.authenticate();
            logger.info('Database connection established successfully');
        } catch (error) {
            logger.error('Unable to connect to the database:', error);
            throw error;
        }
    }

    // Initialize models
    async initializeModels() {
        try {
            // Import models
            const User = require('../models/user');
            const Book = require('../models/book');
            const Loan = require('../models/loan');
            const Session = require('../models/session');

            // Initialize models
            const models = {
                User: User.init(this.sequelize),
                Book: Book.init(this.sequelize),
                Loan: Loan.init(this.sequelize),
                Session: Session.init(this.sequelize)
            };

            // Set up associations
            Object.values(models)
                .filter(model => typeof model.associate === 'function')
                .forEach(model => model.associate(models));

            // Store models
            Object.entries(models).forEach(([name, model]) => {
                this.models.set(name, model);
            });

            logger.info('Models initialized successfully');
        } catch (error) {
            logger.error('Error initializing models:', error);
            throw error;
        }
    }

    // Get model
    getModel(name) {
        if (!this.models.has(name)) {
            throw new Error(`Model ${name} not found`);
        }
        return this.models.get(name);
    }

    // Get all models
    getModels() {
        return Object.fromEntries(this.models);
    }

    // Run migrations
    async runMigrations() {
        try {
            const { Umzug, SequelizeStorage } = require('umzug');

            const umzug = new Umzug({
                migrations: {
                    path: '../migrations',
                    params: [this.sequelize.getQueryInterface(), Sequelize]
                },
                storage: new SequelizeStorage({ sequelize: this.sequelize }),
                logger: console
            });

            await umzug.up();
            logger.info('Migrations completed successfully');
        } catch (error) {
            logger.error('Error running migrations:', error);
            throw error;
        }
    }

    // Run seeders
    async runSeeders() {
        try {
            const { Umzug, SequelizeStorage } = require('umzug');

            const umzug = new Umzug({
                migrations: {
                    path: '../seeders',
                    params: [this.sequelize.getQueryInterface(), Sequelize]
                },
                storage: new SequelizeStorage({ sequelize: this.sequelize }),
                logger: console
            });

            await umzug.up();
            logger.info('Seeders completed successfully');
        } catch (error) {
            logger.error('Error running seeders:', error);
            throw error;
        }
    }

    // Transaction wrapper
    async transaction(callback) {
        const t = await this.sequelize.transaction();
        try {
            const result = await callback(t);
            await t.commit();
            return result;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    // Health check
    async healthCheck() {
        try {
            await this.sequelize.authenticate();
            const status = {
                status: 'healthy',
                timestamp: new Date(),
                connections: this.sequelize.connectionManager.size,
                maxConnections: this.sequelize.connectionManager.pool.max
            };
            logger.debug('Database health check:', status);
            return status;
        } catch (error) {
            logger.error('Database health check failed:', error);
            return {
                status: 'unhealthy',
                timestamp: new Date(),
                error: error.message
            };
        }
    }

    // Close connection
    async close() {
        if (this.sequelize) {
            try {
                await this.sequelize.close();
                this.initialized = false;
                logger.info('Database connection closed');
            } catch (error) {
                logger.error('Error closing database connection:', error);
                throw error;
            }
        }
    }

    // Get query interface
    getQueryInterface() {
        return this.sequelize.getQueryInterface();
    }

    // Execute raw query
    async query(sql, options = {}) {
        try {
            return await this.sequelize.query(sql, options);
        } catch (error) {
            logger.error('Error executing raw query:', error);
            throw error;
        }
    }
}

// Create database service instance
const databaseService = new DatabaseService();

// Export database service
module.exports = databaseService;