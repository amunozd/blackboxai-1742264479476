const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { logger } = require('./logger');

class ConfigService {
    constructor() {
        this.config = {};
        this.configDir = path.join(__dirname, '../config');
        this.envFile = path.join(__dirname, '../.env');

        // Load environment variables
        this.loadEnv();

        // Load configuration files
        this.loadConfigs();
    }

    // Load environment variables
    loadEnv() {
        try {
            const result = dotenv.config({ path: this.envFile });
            
            if (result.error) {
                logger.warn('No .env file found, using default environment variables');
            }

            // Validate required environment variables
            this.validateEnv();
        } catch (error) {
            logger.error('Error loading environment variables:', error);
            throw error;
        }
    }

    // Validate required environment variables
    validateEnv() {
        const required = [
            'NODE_ENV',
            'PORT',
            'DB_HOST',
            'DB_USER',
            'DB_PASSWORD',
            'DB_NAME',
            'SESSION_SECRET'
        ];

        const missing = required.filter(key => !process.env[key]);

        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    // Load all configuration files
    loadConfigs() {
        try {
            const files = fs.readdirSync(this.configDir);
            
            files.forEach(file => {
                if (file.endsWith('.js') || file.endsWith('.json')) {
                    const name = path.basename(file, path.extname(file));
                    const filepath = path.join(this.configDir, file);
                    this.config[name] = require(filepath);
                }
            });

            // Apply environment-specific overrides
            this.applyEnvOverrides();

            logger.info('Configuration loaded successfully');
        } catch (error) {
            logger.error('Error loading configuration files:', error);
            throw error;
        }
    }

    // Apply environment-specific configuration overrides
    applyEnvOverrides() {
        const env = process.env.NODE_ENV || 'development';
        const envConfigPath = path.join(this.configDir, `${env}.js`);

        if (fs.existsSync(envConfigPath)) {
            const envConfig = require(envConfigPath);
            this.mergeConfigs(this.config, envConfig);
            logger.info(`Applied ${env} environment overrides`);
        }
    }

    // Merge configurations recursively
    mergeConfigs(target, source) {
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object') {
                if (!target[key]) target[key] = {};
                this.mergeConfigs(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        });
    }

    // Get configuration value
    get(key, defaultValue = null) {
        return key.split('.').reduce((obj, k) => obj && obj[k], this.config) || defaultValue;
    }

    // Set configuration value
    set(key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, k) => {
            if (!obj[k]) obj[k] = {};
            return obj[k];
        }, this.config);
        target[lastKey] = value;
    }

    // Get all configuration
    getAll() {
        return this.config;
    }

    // Get environment
    getEnv() {
        return process.env.NODE_ENV || 'development';
    }

    // Check if production environment
    isProduction() {
        return this.getEnv() === 'production';
    }

    // Check if development environment
    isDevelopment() {
        return this.getEnv() === 'development';
    }

    // Check if test environment
    isTest() {
        return this.getEnv() === 'test';
    }

    // Get database configuration
    getDatabaseConfig() {
        return {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        };
    }

    // Get mail configuration
    getMailConfig() {
        return {
            host: process.env.MAIL_HOST,
            port: process.env.MAIL_PORT,
            secure: process.env.MAIL_SECURE === 'true',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASSWORD
            }
        };
    }

    // Get session configuration
    getSessionConfig() {
        return {
            secret: process.env.SESSION_SECRET,
            name: process.env.SESSION_NAME || 'sessionId',
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: this.isProduction(),
                httpOnly: true,
                maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000 // 24 hours
            }
        };
    }

    // Get security configuration
    getSecurityConfig() {
        return {
            bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
            jwtSecret: process.env.JWT_SECRET,
            jwtExpiration: process.env.JWT_EXPIRATION || '1d',
            allowedOrigins: process.env.ALLOWED_ORIGINS 
                ? process.env.ALLOWED_ORIGINS.split(',') 
                : ['http://localhost:3000']
        };
    }

    // Export configuration to file
    exportConfig(filepath) {
        try {
            const configData = JSON.stringify(this.config, null, 2);
            fs.writeFileSync(filepath, configData);
            logger.info(`Configuration exported to ${filepath}`);
            return true;
        } catch (error) {
            logger.error('Error exporting configuration:', error);
            return false;
        }
    }

    // Import configuration from file
    importConfig(filepath) {
        try {
            const configData = fs.readFileSync(filepath, 'utf8');
            const newConfig = JSON.parse(configData);
            this.config = newConfig;
            logger.info(`Configuration imported from ${filepath}`);
            return true;
        } catch (error) {
            logger.error('Error importing configuration:', error);
            return false;
        }
    }
}

// Create config service instance
const configService = new ConfigService();

// Export config service
module.exports = configService;