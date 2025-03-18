const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { format } = winston;

class LoggerService {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.logLevels = {
            error: 0,
            warn: 1,
            info: 2,
            http: 3,
            debug: 4
        };

        // Create logs directory if it doesn't exist
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir);
        }

        this.setupLogger();
    }

    // Setup logger configuration
    setupLogger() {
        // Define log format
        const logFormat = format.combine(
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.errors({ stack: true }),
            format.splat(),
            format.json()
        );

        // Create console format
        const consoleFormat = format.combine(
            format.colorize(),
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.printf(({ timestamp, level, message, ...meta }) => {
                return `${timestamp} [${level}]: ${message} ${
                    Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
                }`;
            })
        );

        // Create logger instance
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            levels: this.logLevels,
            format: logFormat,
            transports: [
                // Console transport
                new winston.transports.Console({
                    format: consoleFormat
                }),

                // Error log file transport
                new winston.transports.File({
                    filename: path.join(this.logDir, 'error.log'),
                    level: 'error',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5
                }),

                // Combined log file transport
                new winston.transports.File({
                    filename: path.join(this.logDir, 'combined.log'),
                    maxsize: 5242880, // 5MB
                    maxFiles: 5
                })
            ]
        });

        // Add HTTP transport in development
        if (process.env.NODE_ENV !== 'production') {
            this.logger.add(
                new winston.transports.File({
                    filename: path.join(this.logDir, 'http.log'),
                    level: 'http',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5
                })
            );
        }
    }

    // Log error message
    error(message, meta = {}) {
        this.logger.error(message, meta);
    }

    // Log warning message
    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }

    // Log info message
    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    // Log HTTP request
    http(message, meta = {}) {
        this.logger.http(message, meta);
    }

    // Log debug message
    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }

    // Log error with stack trace
    logError(error, meta = {}) {
        this.error(error.message, {
            ...meta,
            stack: error.stack,
            name: error.name
        });
    }

    // Create stream for Morgan HTTP logging
    stream() {
        return {
            write: (message) => {
                this.http(message.trim());
            }
        };
    }

    // Get log files
    getLogFiles() {
        try {
            return fs.readdirSync(this.logDir)
                .filter(file => file.endsWith('.log'))
                .map(file => ({
                    name: file,
                    path: path.join(this.logDir, file),
                    size: fs.statSync(path.join(this.logDir, file)).size
                }));
        } catch (error) {
            this.error('Error getting log files:', error);
            return [];
        }
    }

    // Read log file
    readLogFile(filename, options = {}) {
        try {
            const { tail = 100, filter = '' } = options;
            const filepath = path.join(this.logDir, filename);

            if (!fs.existsSync(filepath)) {
                throw new Error(`Log file not found: ${filename}`);
            }

            const content = fs.readFileSync(filepath, 'utf8');
            const lines = content.split('\n')
                .filter(line => line.toLowerCase().includes(filter.toLowerCase()))
                .slice(-tail);

            return lines;
        } catch (error) {
            this.error('Error reading log file:', error);
            throw error;
        }
    }

    // Clear log file
    clearLogFile(filename) {
        try {
            const filepath = path.join(this.logDir, filename);

            if (!fs.existsSync(filepath)) {
                throw new Error(`Log file not found: ${filename}`);
            }

            fs.writeFileSync(filepath, '');
            this.info(`Cleared log file: ${filename}`);
        } catch (error) {
            this.error('Error clearing log file:', error);
            throw error;
        }
    }

    // Rotate log files
    rotateLogs() {
        try {
            const files = this.getLogFiles();
            
            files.forEach(file => {
                const stats = fs.statSync(file.path);
                if (stats.size > 5242880) { // 5MB
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const rotatedPath = `${file.path}.${timestamp}`;
                    fs.renameSync(file.path, rotatedPath);
                    fs.writeFileSync(file.path, '');
                    this.info(`Rotated log file: ${file.name}`);
                }
            });
        } catch (error) {
            this.error('Error rotating log files:', error);
            throw error;
        }
    }

    // Clean old log files
    cleanOldLogs(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
        try {
            const files = fs.readdirSync(this.logDir);
            const now = Date.now();

            files.forEach(file => {
                if (file.endsWith('.log')) {
                    const filepath = path.join(this.logDir, file);
                    const stats = fs.statSync(filepath);

                    if (now - stats.mtime.getTime() > maxAge) {
                        fs.unlinkSync(filepath);
                        this.info(`Deleted old log file: ${file}`);
                    }
                }
            });
        } catch (error) {
            this.error('Error cleaning old logs:', error);
            throw error;
        }
    }
}

// Create logger service instance
const loggerService = new LoggerService();

// Export logger service
module.exports = loggerService;