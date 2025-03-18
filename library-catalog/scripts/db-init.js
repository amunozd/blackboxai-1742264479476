const { Sequelize } = require('sequelize');
const { config } = require('../config/database');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Get environment
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

async function initializeDatabase() {
    try {
        // Create Sequelize instance without database name
        const sequelize = new Sequelize({
            host: dbConfig.host,
            username: dbConfig.username,
            password: dbConfig.password,
            dialect: dbConfig.dialect
        });

        // Create database if it doesn't exist
        await sequelize.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database};`);
        console.log(`Database '${dbConfig.database}' created or already exists.`);

        // Close initial connection
        await sequelize.close();

        // Run migrations
        console.log('\nRunning migrations...');
        await execPromise('npx sequelize-cli db:migrate');
        console.log('Migrations completed successfully.');

        // Run seeders if in development
        if (env === 'development') {
            console.log('\nRunning seeders...');
            await execPromise('npx sequelize-cli db:seed:all');
            console.log('Seeders completed successfully.');
        }

        console.log('\nDatabase initialization completed successfully!');
        
        if (env === 'development') {
            console.log('\nDefault users created:');
            console.log('1. Bibliotecario');
            console.log('   Username: bibliotecario');
            console.log('   Password: biblioteca123');
            console.log('\n2. Docente');
            console.log('   Username: docente');
            console.log('   Password: docente123');
            console.log('\n3. Alumno');
            console.log('   Username: alumno');
            console.log('   Password: alumno123');
        }

    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

// Function to reset database (development only)
async function resetDatabase() {
    if (env !== 'development') {
        console.error('Database reset is only available in development environment');
        process.exit(1);
    }

    try {
        console.log('Undoing all seeders...');
        await execPromise('npx sequelize-cli db:seed:undo:all');
        
        console.log('Undoing all migrations...');
        await execPromise('npx sequelize-cli db:migrate:undo:all');
        
        console.log('Running migrations again...');
        await execPromise('npx sequelize-cli db:migrate');
        
        console.log('Running seeders again...');
        await execPromise('npx sequelize-cli db:seed:all');
        
        console.log('\nDatabase has been reset successfully!');
    } catch (error) {
        console.error('Error resetting database:', error);
        process.exit(1);
    }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--reset')) {
    resetDatabase();
} else {
    initializeDatabase();
}

// Add error handlers
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});