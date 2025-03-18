const { sequelize } = require('../config/database');
const { logger } = require('./logger');
const { config } = require('../config/app');
const fs = require('fs');
const path = require('path');

class MaintenanceTask {
    // Clean up expired sessions
    static async cleanupSessions() {
        try {
            const result = await sequelize.query(
                'DELETE FROM sessions WHERE expires < NOW()',
                { type: sequelize.QueryTypes.DELETE }
            );
            logger.info(`Cleaned up ${result[0]} expired sessions`);
        } catch (error) {
            logger.error('Error cleaning up sessions:', error);
        }
    }

    // Update overdue loans status
    static async updateOverdueLoans() {
        try {
            const result = await sequelize.query(
                `UPDATE loans 
                 SET status = 'overdue' 
                 WHERE status = 'active' 
                 AND due_date < NOW()`,
                { type: sequelize.QueryTypes.UPDATE }
            );
            logger.info(`Updated ${result[0]} loans to overdue status`);
        } catch (error) {
            logger.error('Error updating overdue loans:', error);
        }
    }

    // Clean up temporary files
    static async cleanupTempFiles() {
        const tempDir = path.join(__dirname, '../public/uploads/temp');
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        try {
            const files = await fs.promises.readdir(tempDir);
            let deletedCount = 0;

            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = await fs.promises.stat(filePath);

                if (Date.now() - stats.mtime.getTime() > maxAge) {
                    await fs.promises.unlink(filePath);
                    deletedCount++;
                }
            }

            logger.info(`Cleaned up ${deletedCount} temporary files`);
        } catch (error) {
            logger.error('Error cleaning up temporary files:', error);
        }
    }

    // Optimize database tables
    static async optimizeTables() {
        try {
            const tables = await sequelize.query(
                'SHOW TABLES',
                { type: sequelize.QueryTypes.SHOWSQL }
            );

            for (const [table] of tables[0]) {
                await sequelize.query(`OPTIMIZE TABLE ${table}`);
            }

            logger.info('Database tables optimized');
        } catch (error) {
            logger.error('Error optimizing database tables:', error);
        }
    }

    // Check and update book availability status
    static async updateBookStatus() {
        try {
            const result = await sequelize.query(
                `UPDATE books 
                 SET status = CASE 
                     WHEN available_quantity > 0 THEN 'available'
                     ELSE 'unavailable'
                 END
                 WHERE status != CASE 
                     WHEN available_quantity > 0 THEN 'available'
                     ELSE 'unavailable'
                 END`,
                { type: sequelize.QueryTypes.UPDATE }
            );
            logger.info(`Updated status for ${result[0]} books`);
        } catch (error) {
            logger.error('Error updating book status:', error);
        }
    }

    // Run all maintenance tasks
    static async runAll() {
        logger.info('Starting maintenance tasks...');

        await this.cleanupSessions();
        await this.updateOverdueLoans();
        await this.cleanupTempFiles();
        await this.updateBookStatus();

        // Run database optimization less frequently
        if (new Date().getHours() === 3) { // Run at 3 AM
            await this.optimizeTables();
        }

        logger.info('Maintenance tasks completed');
    }
}

// Schedule maintenance tasks
if (config.app.env === 'production') {
    // Run every hour in production
    setInterval(() => MaintenanceTask.runAll(), 60 * 60 * 1000);
} else {
    // Run every 12 hours in development
    setInterval(() => MaintenanceTask.runAll(), 12 * 60 * 60 * 1000);
}

// Run maintenance tasks on startup
MaintenanceTask.runAll();

// Export for manual execution or testing
module.exports = MaintenanceTask;