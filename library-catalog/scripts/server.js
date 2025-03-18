const app = require('../app');
const { sequelize } = require('../config/database');
const { config } = require('../config/app');

// Keep track of connections
const connections = new Set();

// Create HTTP server
const server = require('http').createServer(app);

// Track connections
server.on('connection', (connection) => {
    connections.add(connection);
    connection.on('close', () => connections.delete(connection));
});

// Graceful shutdown function
async function shutdown(signal) {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async (err) => {
        if (err) {
            console.error('Error closing server:', err);
            process.exit(1);
        }

        try {
            // Close existing connections
            for (const connection of connections) {
                connection.end();
                connections.delete(connection);
            }

            // Close database connection
            console.log('Closing database connection...');
            await sequelize.close();
            console.log('Database connection closed.');

            console.log('Graceful shutdown completed.');
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    });

    // Force shutdown after timeout
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000); // 10 seconds timeout
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown('Uncaught Exception');
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    shutdown('Unhandled Rejection');
});

// Start server
async function startServer() {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('Database connection established successfully.');

        // Start server
        const PORT = config.app.port;
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Environment: ${config.app.env}`);
            console.log(`URL: ${config.app.url}`);

            // Log startup time
            const startupTime = process.uptime();
            console.log(`Server started in ${startupTime.toFixed(2)} seconds`);

            // Log memory usage
            const used = process.memoryUsage();
            console.log('Memory usage:');
            for (let key in used) {
                console.log(`  ${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
            }
        });

        // Periodic health check
        setInterval(async () => {
            try {
                await sequelize.authenticate();
                // Database is healthy
            } catch (error) {
                console.error('Database health check failed:', error);
                shutdown('Database Health Check Failed');
            }
        }, 30000); // Every 30 seconds

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = {
    server,
    startServer,
    shutdown
};