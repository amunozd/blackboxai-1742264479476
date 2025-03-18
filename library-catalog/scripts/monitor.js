const os = require('os');
const { sequelize } = require('../config/database');
const { logger } = require('./logger');
const { config } = require('../config/app');

class MonitoringService {
    constructor() {
        this.metrics = {
            startTime: Date.now(),
            requests: 0,
            errors: 0,
            dbQueries: 0,
            avgResponseTime: 0,
            totalResponseTime: 0
        };
    }

    // Get system metrics
    getSystemMetrics() {
        return {
            cpu: {
                loadAvg: os.loadavg(),
                cpus: os.cpus().length,
                usage: process.cpuUsage()
            },
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                processUsage: process.memoryUsage()
            },
            uptime: {
                system: os.uptime(),
                process: process.uptime()
            },
            network: {
                interfaces: os.networkInterfaces()
            }
        };
    }

    // Get application metrics
    getAppMetrics() {
        return {
            uptime: Date.now() - this.metrics.startTime,
            requests: this.metrics.requests,
            errors: this.metrics.errors,
            dbQueries: this.metrics.dbQueries,
            avgResponseTime: this.metrics.requests > 0 
                ? this.metrics.totalResponseTime / this.metrics.requests 
                : 0
        };
    }

    // Check database health
    async checkDatabase() {
        try {
            await sequelize.authenticate();
            const result = await sequelize.query('SELECT 1+1 as result');
            return {
                status: 'healthy',
                latency: result[1].time,
                connections: sequelize.connectionManager.size
            };
        } catch (error) {
            logger.error('Database health check failed:', error);
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    // Request tracking middleware
    trackRequest() {
        return (req, res, next) => {
            const start = Date.now();

            // Track response
            res.on('finish', () => {
                const duration = Date.now() - start;
                this.metrics.requests++;
                this.metrics.totalResponseTime += duration;

                if (res.statusCode >= 400) {
                    this.metrics.errors++;
                }
            });

            next();
        };
    }

    // Database query tracking
    trackQuery() {
        sequelize.addHook('beforeQuery', () => {
            this.metrics.dbQueries++;
        });
    }

    // Full health check
    async healthCheck() {
        const dbHealth = await this.checkDatabase();
        const systemMetrics = this.getSystemMetrics();
        const appMetrics = this.getAppMetrics();

        const memoryUsagePercent = (
            (systemMetrics.memory.total - systemMetrics.memory.free) / 
            systemMetrics.memory.total * 100
        ).toFixed(2);

        const status = {
            status: dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            environment: config.app.env,
            database: dbHealth,
            system: {
                cpu: {
                    loadAvg: systemMetrics.cpu.loadAvg[0].toFixed(2),
                    cores: systemMetrics.cpu.cpus
                },
                memory: {
                    total: Math.round(systemMetrics.memory.total / 1024 / 1024),
                    free: Math.round(systemMetrics.memory.free / 1024 / 1024),
                    usage: `${memoryUsagePercent}%`
                },
                uptime: {
                    system: Math.round(systemMetrics.uptime.system / 60 / 60), // hours
                    process: Math.round(systemMetrics.uptime.process / 60 / 60) // hours
                }
            },
            application: {
                uptime: Math.round((Date.now() - this.metrics.startTime) / 1000 / 60), // minutes
                requests: {
                    total: appMetrics.requests,
                    errors: appMetrics.errors,
                    successRate: appMetrics.requests > 0 
                        ? ((appMetrics.requests - appMetrics.errors) / appMetrics.requests * 100).toFixed(2)
                        : '100.00'
                },
                performance: {
                    avgResponseTime: Math.round(appMetrics.avgResponseTime),
                    dbQueries: appMetrics.dbQueries
                }
            }
        };

        // Log status if unhealthy
        if (status.status === 'unhealthy') {
            logger.error('Health check failed:', status);
        }

        return status;
    }

    // Monitor memory usage and log warnings
    monitorMemory() {
        const warningThreshold = 85; // 85% usage warning
        const criticalThreshold = 95; // 95% usage critical

        setInterval(() => {
            const used = process.memoryUsage();
            const usedPercent = (used.heapUsed / used.heapTotal * 100).toFixed(2);

            if (usedPercent >= criticalThreshold) {
                logger.error(`Critical memory usage: ${usedPercent}%`, {
                    memoryUsage: used
                });
            } else if (usedPercent >= warningThreshold) {
                logger.warn(`High memory usage: ${usedPercent}%`, {
                    memoryUsage: used
                });
            }
        }, 60000); // Check every minute
    }

    // Start monitoring
    startMonitoring() {
        // Track queries
        this.trackQuery();

        // Monitor memory
        this.monitorMemory();

        // Periodic health checks
        setInterval(async () => {
            try {
                await this.healthCheck();
            } catch (error) {
                logger.error('Error during health check:', error);
            }
        }, 5 * 60 * 1000); // Every 5 minutes

        logger.info('Monitoring service started');
    }
}

// Create monitoring service instance
const monitoringService = new MonitoringService();

// Start monitoring in production
if (config.app.env === 'production') {
    monitoringService.startMonitoring();
}

module.exports = monitoringService;