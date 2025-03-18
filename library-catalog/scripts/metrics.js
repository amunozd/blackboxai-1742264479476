const { EventEmitter } = require('events');
const os = require('os');
const { logger } = require('./logger');

class MetricsService extends EventEmitter {
    constructor() {
        super();
        this.metrics = {
            requests: {
                total: 0,
                success: 0,
                error: 0,
                byEndpoint: new Map()
            },
            response: {
                times: [],
                average: 0
            },
            database: {
                queries: 0,
                errors: 0,
                slowQueries: 0
            },
            users: {
                active: 0,
                logins: 0,
                registrations: 0
            },
            system: {
                startTime: Date.now(),
                lastCheck: Date.now()
            },
            cache: {
                hits: 0,
                misses: 0,
                ratio: 0
            }
        };

        this.setupMetricsCollection();
    }

    // Setup metrics collection
    setupMetricsCollection() {
        // Collect system metrics every minute
        setInterval(() => this.collectSystemMetrics(), 60000);

        // Reset certain metrics daily
        setInterval(() => this.resetDailyMetrics(), 24 * 60 * 60 * 1000);
    }

    // Collect system metrics
    collectSystemMetrics() {
        const metrics = {
            timestamp: Date.now(),
            cpu: {
                load: os.loadavg(),
                usage: process.cpuUsage()
            },
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                process: process.memoryUsage()
            },
            uptime: {
                system: os.uptime(),
                process: process.uptime()
            }
        };

        this.emit('system:metrics', metrics);
        this.metrics.system.lastCheck = Date.now();
        return metrics;
    }

    // Reset daily metrics
    resetDailyMetrics() {
        this.metrics.requests.byEndpoint.clear();
        this.metrics.response.times = [];
        this.metrics.response.average = 0;
        this.metrics.users.logins = 0;
        this.metrics.users.registrations = 0;
        this.emit('metrics:reset');
    }

    // Track request
    trackRequest(req, res, startTime) {
        const duration = Date.now() - startTime;
        const endpoint = `${req.method} ${req.route?.path || req.path}`;

        // Update request counts
        this.metrics.requests.total++;
        if (res.statusCode >= 400) {
            this.metrics.requests.error++;
        } else {
            this.metrics.requests.success++;
        }

        // Update endpoint metrics
        if (!this.metrics.requests.byEndpoint.has(endpoint)) {
            this.metrics.requests.byEndpoint.set(endpoint, {
                count: 0,
                errors: 0,
                totalTime: 0
            });
        }
        const endpointMetrics = this.metrics.requests.byEndpoint.get(endpoint);
        endpointMetrics.count++;
        endpointMetrics.totalTime += duration;
        if (res.statusCode >= 400) {
            endpointMetrics.errors++;
        }

        // Update response times
        this.metrics.response.times.push(duration);
        this.updateAverageResponseTime();

        this.emit('request:tracked', {
            endpoint,
            duration,
            status: res.statusCode
        });
    }

    // Update average response time
    updateAverageResponseTime() {
        const times = this.metrics.response.times;
        this.metrics.response.average = times.reduce((a, b) => a + b, 0) / times.length;
    }

    // Track database query
    trackDatabaseQuery(duration) {
        this.metrics.database.queries++;
        if (duration > 1000) { // Consider queries over 1 second as slow
            this.metrics.database.slowQueries++;
            this.emit('database:slow-query', { duration });
        }
    }

    // Track database error
    trackDatabaseError(error) {
        this.metrics.database.errors++;
        this.emit('database:error', { error });
    }

    // Track user activity
    trackUserActivity(type) {
        switch (type) {
            case 'login':
                this.metrics.users.logins++;
                this.metrics.users.active++;
                break;
            case 'logout':
                this.metrics.users.active--;
                break;
            case 'register':
                this.metrics.users.registrations++;
                break;
        }
        this.emit('user:activity', { type });
    }

    // Track cache activity
    trackCacheActivity(hit) {
        if (hit) {
            this.metrics.cache.hits++;
        } else {
            this.metrics.cache.misses++;
        }
        this.updateCacheRatio();
    }

    // Update cache hit ratio
    updateCacheRatio() {
        const total = this.metrics.cache.hits + this.metrics.cache.misses;
        this.metrics.cache.ratio = total > 0 ? this.metrics.cache.hits / total : 0;
    }

    // Get current metrics
    getMetrics() {
        return {
            timestamp: Date.now(),
            uptime: Date.now() - this.metrics.system.startTime,
            requests: {
                total: this.metrics.requests.total,
                success: this.metrics.requests.success,
                error: this.metrics.requests.error,
                successRate: this.getSuccessRate()
            },
            response: {
                average: this.metrics.response.average,
                count: this.metrics.response.times.length
            },
            database: {
                queries: this.metrics.database.queries,
                errors: this.metrics.database.errors,
                slowQueries: this.metrics.database.slowQueries
            },
            users: {
                active: this.metrics.users.active,
                logins: this.metrics.users.logins,
                registrations: this.metrics.users.registrations
            },
            cache: {
                hits: this.metrics.cache.hits,
                misses: this.metrics.cache.misses,
                ratio: this.metrics.cache.ratio
            },
            system: this.collectSystemMetrics()
        };
    }

    // Get success rate
    getSuccessRate() {
        return this.metrics.requests.total > 0
            ? (this.metrics.requests.success / this.metrics.requests.total) * 100
            : 100;
    }

    // Get endpoint metrics
    getEndpointMetrics() {
        const metrics = [];
        for (const [endpoint, data] of this.metrics.requests.byEndpoint) {
            metrics.push({
                endpoint,
                requests: data.count,
                errors: data.errors,
                averageTime: data.totalTime / data.count
            });
        }
        return metrics;
    }

    // Get metrics middleware
    middleware() {
        return (req, res, next) => {
            const startTime = Date.now();

            // Track response
            res.on('finish', () => {
                this.trackRequest(req, res, startTime);
            });

            next();
        };
    }
}

// Create metrics service instance
const metricsService = new MetricsService();

// Export metrics service
module.exports = metricsService;