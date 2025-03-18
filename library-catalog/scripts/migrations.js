const { Sequelize } = require('sequelize');
const { logger } = require('./logger');
const { Umzug, SequelizeStorage } = require('umzug');
const path = require('path');
const fs = require('fs');

class MigrationService {
    constructor(sequelize) {
        this.sequelize = sequelize;
        this.migrationsDir = path.join(__dirname, '../migrations');
        this.seedersDir = path.join(__dirname, '../seeders');

        // Create directories if they don't exist
        [this.migrationsDir, this.seedersDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        // Initialize migrator
        this.migrator = new Umzug({
            migrations: {
                path: this.migrationsDir,
                params: [
                    this.sequelize.getQueryInterface(),
                    Sequelize
                ]
            },
            storage: new SequelizeStorage({ sequelize: this.sequelize }),
            logger: console
        });

        // Initialize seeder
        this.seeder = new Umzug({
            migrations: {
                path: this.seedersDir,
                params: [
                    this.sequelize.getQueryInterface(),
                    Sequelize
                ]
            },
            storage: new SequelizeStorage({ sequelize: this.sequelize }),
            logger: console
        });
    }

    // Run pending migrations
    async migrate() {
        try {
            logger.info('Running pending migrations...');
            const migrations = await this.migrator.up();
            logger.info(`Executed ${migrations.length} migrations`);
            return migrations;
        } catch (error) {
            logger.error('Error running migrations:', error);
            throw error;
        }
    }

    // Rollback migrations
    async rollback(steps = 1) {
        try {
            logger.info(`Rolling back ${steps} migrations...`);
            const migrations = await this.migrator.down({ step: steps });
            logger.info(`Rolled back ${migrations.length} migrations`);
            return migrations;
        } catch (error) {
            logger.error('Error rolling back migrations:', error);
            throw error;
        }
    }

    // Run seeders
    async seed() {
        try {
            logger.info('Running seeders...');
            const seeders = await this.seeder.up();
            logger.info(`Executed ${seeders.length} seeders`);
            return seeders;
        } catch (error) {
            logger.error('Error running seeders:', error);
            throw error;
        }
    }

    // Undo seeders
    async undoSeed(steps = 1) {
        try {
            logger.info(`Undoing ${steps} seeders...`);
            const seeders = await this.seeder.down({ step: steps });
            logger.info(`Undid ${seeders.length} seeders`);
            return seeders;
        } catch (error) {
            logger.error('Error undoing seeders:', error);
            throw error;
        }
    }

    // Get pending migrations
    async getPendingMigrations() {
        try {
            return await this.migrator.pending();
        } catch (error) {
            logger.error('Error getting pending migrations:', error);
            throw error;
        }
    }

    // Get executed migrations
    async getExecutedMigrations() {
        try {
            return await this.migrator.executed();
        } catch (error) {
            logger.error('Error getting executed migrations:', error);
            throw error;
        }
    }

    // Create migration file
    createMigration(name) {
        try {
            const timestamp = new Date().toISOString().replace(/[-T:]|\.\d{3}Z/g, '');
            const filename = `${timestamp}-${name}.js`;
            const filepath = path.join(this.migrationsDir, filename);

            const template = `
'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        /**
         * Add altering commands here.
         *
         * Example:
         * await queryInterface.createTable('users', {
         *     id: {
         *         type: Sequelize.INTEGER,
         *         primaryKey: true,
         *         autoIncrement: true
         *     },
         *     name: {
         *         type: Sequelize.STRING,
         *         allowNull: false
         *     },
         *     createdAt: {
         *         type: Sequelize.DATE,
         *         allowNull: false
         *     },
         *     updatedAt: {
         *         type: Sequelize.DATE,
         *         allowNull: false
         *     }
         * });
         */
    },

    down: async (queryInterface, Sequelize) => {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
    }
};`;

            fs.writeFileSync(filepath, template.trim() + '\n');
            logger.info(`Created migration file: ${filename}`);
            return filepath;
        } catch (error) {
            logger.error('Error creating migration file:', error);
            throw error;
        }
    }

    // Create seeder file
    createSeeder(name) {
        try {
            const timestamp = new Date().toISOString().replace(/[-T:]|\.\d{3}Z/g, '');
            const filename = `${timestamp}-${name}.js`;
            const filepath = path.join(this.seedersDir, filename);

            const template = `
'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        /**
         * Add seed commands here.
         *
         * Example:
         * await queryInterface.bulkInsert('users', [{
         *     name: 'John Doe',
         *     email: 'john@example.com',
         *     createdAt: new Date(),
         *     updatedAt: new Date()
         * }]);
         */
    },

    down: async (queryInterface, Sequelize) => {
        /**
         * Add commands to revert seed here.
         *
         * Example:
         * await queryInterface.bulkDelete('users', null, {});
         */
    }
};`;

            fs.writeFileSync(filepath, template.trim() + '\n');
            logger.info(`Created seeder file: ${filename}`);
            return filepath;
        } catch (error) {
            logger.error('Error creating seeder file:', error);
            throw error;
        }
    }

    // Check migration status
    async status() {
        try {
            const executed = await this.getExecutedMigrations();
            const pending = await this.getPendingMigrations();

            return {
                executed: executed.map(m => ({
                    name: m.name,
                    timestamp: m.timestamp
                })),
                pending: pending.map(m => ({
                    name: m.name,
                    path: m.path
                })),
                total: executed.length + pending.length,
                executedCount: executed.length,
                pendingCount: pending.length
            };
        } catch (error) {
            logger.error('Error checking migration status:', error);
            throw error;
        }
    }

    // Reset database
    async reset() {
        try {
            logger.info('Resetting database...');

            // Drop all tables
            await this.sequelize.drop();

            // Run migrations
            await this.migrate();

            // Run seeders
            await this.seed();

            logger.info('Database reset completed');
        } catch (error) {
            logger.error('Error resetting database:', error);
            throw error;
        }
    }
}

// Export migration service class
module.exports = MigrationService;