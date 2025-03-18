const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration
const config = {
    development: {
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'library_catalog',
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: console.log,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            timestamps: true,
            underscored: true
        }
    },
    test: {
        username: process.env.TEST_DB_USER || 'root',
        password: process.env.TEST_DB_PASSWORD || '',
        database: process.env.TEST_DB_NAME || 'library_catalog_test',
        host: process.env.TEST_DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            timestamps: true,
            underscored: true
        }
    },
    production: {
        username: process.env.PROD_DB_USER,
        password: process.env.PROD_DB_PASSWORD,
        database: process.env.PROD_DB_NAME,
        host: process.env.PROD_DB_HOST,
        dialect: 'mysql',
        logging: false,
        pool: {
            max: 10,
            min: 2,
            acquire: 30000,
            idle: 10000
        },
        define: {
            timestamps: true,
            underscored: true
        },
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    }
};

// Get current environment
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Create Sequelize instance
const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
        host: dbConfig.host,
        dialect: dbConfig.dialect,
        logging: dbConfig.logging,
        pool: dbConfig.pool,
        define: dbConfig.define,
        dialectOptions: dbConfig.dialectOptions
    }
);

// Test database connection
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
};

// Sync database (in development only)
const syncDatabase = async () => {
    if (env === 'development') {
        try {
            await sequelize.sync({ alter: true });
            console.log('Database synced successfully');
        } catch (error) {
            console.error('Error syncing database:', error);
            process.exit(1);
        }
    }
};

module.exports = {
    sequelize,
    testConnection,
    syncDatabase,
    config
};