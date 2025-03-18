const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { logger } = require('./logger');
const { models } = require('./models');
const configService = require('./config');

class BackupService {
    constructor() {
        this.backupDir = path.join(__dirname, '../backups');
        this.execAsync = promisify(exec);

        // Create backup directory if it doesn't exist
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    // Run full backup
    async runFullBackup() {
        try {
            logger.info('Starting full backup...');

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `backup-${timestamp}`);

            // Create backup directory
            fs.mkdirSync(backupPath);

            // Backup database
            await this.backupDatabase(backupPath);

            // Backup files
            await this.backupFiles(backupPath);

            // Create backup manifest
            await this.createBackupManifest(backupPath);

            logger.info('Full backup completed successfully');

            return {
                timestamp,
                path: backupPath,
                size: this.getDirectorySize(backupPath)
            };
        } catch (error) {
            logger.error('Error running full backup:', error);
            throw error;
        }
    }

    // Backup database
    async backupDatabase(backupPath) {
        try {
            logger.info('Starting database backup...');

            const dbConfig = configService.getDatabaseConfig();
            const filename = 'database.sql';
            const outputPath = path.join(backupPath, filename);

            // Create database dump
            const command = `mysqldump -h ${dbConfig.host} -u ${dbConfig.user} -p${dbConfig.password} ${dbConfig.database} > ${outputPath}`;
            await this.execAsync(command);

            logger.info('Database backup completed');
        } catch (error) {
            logger.error('Error backing up database:', error);
            throw error;
        }
    }

    // Backup files
    async backupFiles(backupPath) {
        try {
            logger.info('Starting files backup...');

            const directories = [
                'public/uploads',
                'public/exports',
                'logs'
            ];

            for (const dir of directories) {
                const sourcePath = path.join(__dirname, '..', dir);
                const targetPath = path.join(backupPath, dir);

                if (fs.existsSync(sourcePath)) {
                    fs.mkdirSync(targetPath, { recursive: true });
                    this.copyDirectory(sourcePath, targetPath);
                }
            }

            logger.info('Files backup completed');
        } catch (error) {
            logger.error('Error backing up files:', error);
            throw error;
        }
    }

    // Create backup manifest
    async createBackupManifest(backupPath) {
        try {
            const manifest = {
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version,
                environment: process.env.NODE_ENV,
                database: {
                    host: configService.get('database.host'),
                    name: configService.get('database.database')
                },
                stats: await this.getBackupStats()
            };

            fs.writeFileSync(
                path.join(backupPath, 'manifest.json'),
                JSON.stringify(manifest, null, 2)
            );
        } catch (error) {
            logger.error('Error creating backup manifest:', error);
            throw error;
        }
    }

    // Get backup statistics
    async getBackupStats() {
        try {
            const stats = {};

            // Get table counts
            for (const [name, model] of Object.entries(models)) {
                stats[name] = await model.count();
            }

            return stats;
        } catch (error) {
            logger.error('Error getting backup stats:', error);
            throw error;
        }
    }

    // Restore from backup
    async restoreFromBackup(backupPath) {
        try {
            logger.info('Starting backup restoration...');

            // Verify backup
            if (!this.verifyBackup(backupPath)) {
                throw new Error('Invalid backup directory');
            }

            // Restore database
            await this.restoreDatabase(backupPath);

            // Restore files
            await this.restoreFiles(backupPath);

            logger.info('Backup restoration completed successfully');
        } catch (error) {
            logger.error('Error restoring from backup:', error);
            throw error;
        }
    }

    // Restore database
    async restoreDatabase(backupPath) {
        try {
            logger.info('Starting database restoration...');

            const dbConfig = configService.getDatabaseConfig();
            const dumpFile = path.join(backupPath, 'database.sql');

            if (!fs.existsSync(dumpFile)) {
                throw new Error('Database dump file not found');
            }

            // Restore database dump
            const command = `mysql -h ${dbConfig.host} -u ${dbConfig.user} -p${dbConfig.password} ${dbConfig.database} < ${dumpFile}`;
            await this.execAsync(command);

            logger.info('Database restoration completed');
        } catch (error) {
            logger.error('Error restoring database:', error);
            throw error;
        }
    }

    // Restore files
    async restoreFiles(backupPath) {
        try {
            logger.info('Starting files restoration...');

            const directories = [
                'public/uploads',
                'public/exports',
                'logs'
            ];

            for (const dir of directories) {
                const sourcePath = path.join(backupPath, dir);
                const targetPath = path.join(__dirname, '..', dir);

                if (fs.existsSync(sourcePath)) {
                    fs.mkdirSync(targetPath, { recursive: true });
                    this.copyDirectory(sourcePath, targetPath);
                }
            }

            logger.info('Files restoration completed');
        } catch (error) {
            logger.error('Error restoring files:', error);
            throw error;
        }
    }

    // Verify backup
    verifyBackup(backupPath) {
        try {
            // Check if backup directory exists
            if (!fs.existsSync(backupPath)) {
                return false;
            }

            // Check for required files
            const required = ['database.sql', 'manifest.json'];
            return required.every(file => 
                fs.existsSync(path.join(backupPath, file))
            );
        } catch (error) {
            logger.error('Error verifying backup:', error);
            return false;
        }
    }

    // List available backups
    listBackups() {
        try {
            return fs.readdirSync(this.backupDir)
                .filter(name => {
                    const backupPath = path.join(this.backupDir, name);
                    return fs.statSync(backupPath).isDirectory() && 
                           this.verifyBackup(backupPath);
                })
                .map(name => {
                    const backupPath = path.join(this.backupDir, name);
                    const manifest = JSON.parse(
                        fs.readFileSync(
                            path.join(backupPath, 'manifest.json'),
                            'utf8'
                        )
                    );
                    return {
                        name,
                        path: backupPath,
                        timestamp: manifest.timestamp,
                        size: this.getDirectorySize(backupPath),
                        manifest
                    };
                })
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            logger.error('Error listing backups:', error);
            return [];
        }
    }

    // Clean old backups
    cleanOldBackups(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
        try {
            const backups = this.listBackups();
            let cleaned = 0;

            backups.forEach(backup => {
                const age = Date.now() - new Date(backup.timestamp).getTime();
                if (age > maxAge) {
                    fs.rmSync(backup.path, { recursive: true });
                    cleaned++;
                }
            });

            logger.info(`Cleaned ${cleaned} old backups`);
            return cleaned;
        } catch (error) {
            logger.error('Error cleaning old backups:', error);
            throw error;
        }
    }

    // Utility: Copy directory recursively
    copyDirectory(source, target) {
        if (!fs.existsSync(target)) {
            fs.mkdirSync(target, { recursive: true });
        }

        const files = fs.readdirSync(source);
        files.forEach(file => {
            const sourcePath = path.join(source, file);
            const targetPath = path.join(target, file);

            if (fs.statSync(sourcePath).isDirectory()) {
                this.copyDirectory(sourcePath, targetPath);
            } else {
                fs.copyFileSync(sourcePath, targetPath);
            }
        });
    }

    // Utility: Get directory size
    getDirectorySize(dirPath) {
        let size = 0;
        const files = fs.readdirSync(dirPath);

        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                size += this.getDirectorySize(filePath);
            } else {
                size += stats.size;
            }
        });

        return size;
    }
}

// Create backup service instance
const backupService = new BackupService();

// Export backup service
module.exports = backupService;