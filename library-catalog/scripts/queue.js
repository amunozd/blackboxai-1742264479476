const EventEmitter = require('events');
const { logger } = require('./logger');

class Queue extends EventEmitter {
    constructor() {
        super();
        this.jobs = [];
        this.running = false;
        this.concurrency = 1;
        this.activeJobs = 0;
        this.retryAttempts = 3;
        this.retryDelay = 5000; // 5 seconds
    }

    // Add job to queue
    async addJob(type, data, options = {}) {
        const job = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            type,
            data,
            options: {
                priority: options.priority || 0,
                attempts: 0,
                maxAttempts: options.maxAttempts || this.retryAttempts,
                delay: options.delay || 0,
                timeout: options.timeout || 30000, // 30 seconds
                timestamp: Date.now()
            },
            status: 'pending'
        };

        this.jobs.push(job);
        this.jobs.sort((a, b) => b.options.priority - a.options.priority);

        this.emit('job:added', job);
        logger.info(`Job added to queue: ${job.id} (${job.type})`);

        if (!this.running) {
            this.processJobs();
        }

        return job;
    }

    // Start processing jobs
    async processJobs() {
        if (this.running) return;
        this.running = true;

        while (this.jobs.length > 0 && this.activeJobs < this.concurrency) {
            const job = this.jobs.shift();
            if (job) {
                this.processJob(job);
            }
        }

        if (this.jobs.length === 0 && this.activeJobs === 0) {
            this.running = false;
            this.emit('queue:empty');
        }
    }

    // Process individual job
    async processJob(job) {
        this.activeJobs++;
        job.status = 'processing';
        this.emit('job:processing', job);

        try {
            // Check if job should be delayed
            if (job.options.delay > 0) {
                await new Promise(resolve => setTimeout(resolve, job.options.delay));
            }

            // Execute job with timeout
            const result = await Promise.race([
                this.executeJob(job),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Job timeout')), job.options.timeout)
                )
            ]);

            job.status = 'completed';
            job.result = result;
            this.emit('job:completed', job);
            logger.info(`Job completed: ${job.id} (${job.type})`);
        } catch (error) {
            job.error = error.message;
            await this.handleJobError(job);
        } finally {
            this.activeJobs--;
            if (this.jobs.length > 0) {
                this.processJobs();
            } else if (this.activeJobs === 0) {
                this.running = false;
                this.emit('queue:empty');
            }
        }
    }

    // Execute job based on type
    async executeJob(job) {
        switch (job.type) {
            case 'sendEmail':
                return await this.handleEmailJob(job);
            case 'processImport':
                return await this.handleImportJob(job);
            case 'generateReport':
                return await this.handleReportJob(job);
            case 'cleanupFiles':
                return await this.handleCleanupJob(job);
            case 'updateLoanStatus':
                return await this.handleLoanStatusJob(job);
            default:
                throw new Error(`Unknown job type: ${job.type}`);
        }
    }

    // Handle job error
    async handleJobError(job) {
        job.options.attempts++;

        if (job.options.attempts < job.options.maxAttempts) {
            job.status = 'retrying';
            this.emit('job:retrying', job);
            logger.warn(`Retrying job: ${job.id} (${job.type}), attempt ${job.options.attempts}`);

            // Add back to queue with delay
            job.options.delay = this.retryDelay * job.options.attempts;
            this.jobs.push(job);
        } else {
            job.status = 'failed';
            this.emit('job:failed', job);
            logger.error(`Job failed: ${job.id} (${job.type}), error: ${job.error}`);
        }
    }

    // Email job handler
    async handleEmailJob(job) {
        const { to, subject, template, data } = job.data;
        const notificationService = require('./notifications');
        await notificationService.sendEmail(to, subject, template, data);
        return { sent: true, to };
    }

    // Import job handler
    async handleImportJob(job) {
        const { filepath, type, options } = job.data;
        const ImportService = require('./imports');
        const importService = new ImportService(require('../models'));
        return await importService.processCSV(filepath, { type, ...options });
    }

    // Report job handler
    async handleReportJob(job) {
        const { type, data, format, options } = job.data;
        const exportService = require('./exports');
        
        switch (format) {
            case 'excel':
                return await exportService.toExcel(data, options);
            case 'pdf':
                return await exportService.toPDF(data, options);
            case 'csv':
                return await exportService.toCSV(data, options);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    // Cleanup job handler
    async handleCleanupJob(job) {
        const { type, age } = job.data;
        const exportService = require('./exports');
        const importService = require('./imports');

        switch (type) {
            case 'exports':
                await exportService.cleanOldExports(age);
                break;
            case 'imports':
                await importService.cleanupTempFiles(age);
                break;
            default:
                throw new Error(`Unknown cleanup type: ${type}`);
        }

        return { cleaned: true, type };
    }

    // Loan status update job handler
    async handleLoanStatusJob(job) {
        const { loanId, status } = job.data;
        const { models } = require('../models');
        
        const loan = await models.Loan.findByPk(loanId);
        if (!loan) {
            throw new Error(`Loan not found: ${loanId}`);
        }

        await loan.update({ status });
        return { updated: true, loanId, status };
    }

    // Get queue status
    getStatus() {
        return {
            running: this.running,
            activeJobs: this.activeJobs,
            pendingJobs: this.jobs.length,
            concurrency: this.concurrency
        };
    }

    // Clear all jobs
    clearQueue() {
        this.jobs = [];
        this.emit('queue:cleared');
        logger.info('Queue cleared');
    }
}

// Create queue instance
const queue = new Queue();

// Export queue
module.exports = queue;