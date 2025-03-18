const os = require('os');
const { logger } = require('./logger');
const databaseService = require('./database');
const sessionService = require('./session');
const notificationService = require('./notifications');
const metricsService = require('./metrics');

class HealthService {
    constructor() {
        this.healthChecks = new Map();
        this.setupHealthChecks();
    }

    // Setup health checks
    setupHealthChecks() {
        // Add system health checks
        this.addHealthCheck('system', this.checkSystem.bind(this));
        this.addHealthCheck('memory', this.checkMemory.bind(this));
        this.addHealthCheck('disk', this.checkDisk.bind(this));

        // Add service health checks
        this.addHealthCheck('database', this.checkDatabase.bind(this));
        this.addHealthCheck('session', this.checkSession.bind(this));
        this.addHealthCheck('email', this.checkEmail.bind(this));
        this.addHealthCheck('queue', this.checkQueue.bind(this));
    }

    // Add health check
    addHealthCheck(name, check) {
        this.healthChecks.set(name, check);
    }

    // Run all health checks
    async checkHealth() {
        const results = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            checks: {}
        };

        for (const [name, check] of this.healthChecks) {
            try {
                const result = await check();
                results.checks[name] = result;

                if (result.status === 'unhealthy') {
                    results.status = 'unhealthy';
                }
            } catch (error) {
                logger.error(`Health check failed for ${name}:`, error);
                results.checks[name] = {
                    status: 'unhealthy',
                    error: error.message
                };
                results.status = 'unhealthy';
            }
        }

        return results;
    }

    // Check system health
    async checkSystem() {
        const uptime = os.uptime();
        const loadAvg = os.loadavg();

        return {
            status: 'healthy',
            uptime,
            load: {
                '1m': loadAvg[0],
                '5m': loadAvg[1],
                '15m': loadAvg[2]
            },
            cpu: {
                cores: os.cpus().length,
                model: os.cpus()[0].model,
                speed: os.cpus()[0].speed
            },
            platform: {
                type: os.type(),
                release: os.release(),
                arch: os.arch()
            }
        };
    }

    // Check memory health
    async checkMemory() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsage = (usedMemory / totalMemory) * 100;

        return {
            status: memoryUsage < 90 ? 'healthy' : 'unhealthy',
            total: this.formatBytes(totalMemory),
            free: this.formatBytes(freeMemory),
            used: this.formatBytes(usedMemory),
            usage: `${memoryUsage.toFixed(2)}%`,
            process: {
                ...process.memoryUsage(),
                formatted: {
                    heapUsed: this.formatBytes(process.memoryUsage().heapUsed),
                    heapTotal: this.formatBytes(process.memoryUsage().heapTotal),
                    external: this.formatBytes(process.memoryUsage().external),
                    rss: this.formatBytes(process.memoryUsage().rss)
                }
            }
        };
    }

    // Check disk health
    async checkDisk() {
        // Note: This is a mock implementation
        // In a real application, you would use a package like 'disk-space' to get actual disk usage
        return {
            status: 'healthy',
            message: 'Disk space check not implemented in web environment'
        };
    }

    // Check database health
    async checkDatabase() {
        try {
            const result = await databaseService.healthCheck();
            return {
                status: result.status,
                connections: result.connections,
                maxConnections: result.maxConnections,
                latency: result.latency
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    // Check session health
    async checkSession() {
        try {
            const sessions = await sessionService.getActiveSessions();
            return {
                status: 'healthy',
                activeSessions: sessions.length
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    // Check email health
    async checkEmail() {
        try {
            const isValid = await notificationService.verifyEmailConfig();
            return {
                status: isValid ? 'healthy' : 'unhealthy'
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    // Check queue health
    async checkQueue() {
        try {
            const queue = require('./queue');
            const status = queue.getStatus();

            return {
                status: status.pendingJobs < 100 ? 'healthy' : 'warning',
                activeJobs: status.activeJobs,
                pendingJobs: status.pendingJobs,
                concurrency: status.concurrency
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    // Format bytes to human readable format
    formatBytes(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }

    // Get health check middleware
    middleware() {
        return async (req, res, next) => {
            try {
                const health = await this.checkHealth();
                
                if (health.status === 'healthy') {
                    res.json(health);
                } else {
                    res.status(503).json(health);
                }
            } catch (error) {
                next(error);
            }
        };
    }

    // Start monitoring
    startMonitoring(interval = 5 * 60 * 1000) { // 5 minutes
        setInterval(async () => {
            try {
                const health = await this.checkHealth();
                
                if (health.status === 'unhealthy') {
                    logger.warn('System health check failed:', health);
                } else {
                    logger.debug('System health check passed:', health);
                }

                // Update metrics
                metricsService.trackSystemMetrics(health);
            } catch (error) {
                logger.error('Error monitoring system health:', error);
            }
        }, interval);

        logger.info('Health monitoring started');
    }
}

// Create health service instance
const healthService = new HealthService();

// Export health service
module.exports = healthService;