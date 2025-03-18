const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Error logger
const errorLogger = (err, req, res, next) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        error: {
            message: err.message,
            stack: err.stack,
            status: err.status || 500
        },
        request: {
            method: req.method,
            url: req.url,
            body: req.body,
            params: req.params,
            query: req.query,
            user: req.session?.user?.id
        }
    };

    // Write to error log file
    const logFile = path.join(logsDir, 'error.log');
    fs.appendFile(
        logFile,
        JSON.stringify(logEntry) + '\n',
        (writeErr) => {
            if (writeErr) {
                console.error('Error writing to log file:', writeErr);
            }
        }
    );

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.error('Error:', err);
    }

    next(err);
};

// 404 handler
const notFoundHandler = (req, res, next) => {
    const err = new Error('Página no encontrada');
    err.status = 404;
    next(err);
};

// Error response handler
const errorHandler = (err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Error interno del servidor';

    // If API request, send JSON response
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(status).json({
            error: message,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }

    // For regular requests, render error page
    res.status(status);
    res.render('error', {
        message,
        error: {
            status,
            stack: process.env.NODE_ENV === 'development' ? err.stack : ''
        }
    });
};

// Database error handler
const handleSequelizeError = (err, req, res, next) => {
    if (err.name === 'SequelizeValidationError') {
        // Handle validation errors
        const message = err.errors.map(e => e.message).join(', ');
        err.status = 400;
        err.message = message;
    } else if (err.name === 'SequelizeUniqueConstraintError') {
        // Handle unique constraint violations
        err.status = 400;
        err.message = 'Ya existe un registro con estos datos';
    } else if (err.name === 'SequelizeForeignKeyConstraintError') {
        // Handle foreign key violations
        err.status = 400;
        err.message = 'No se puede realizar la operación debido a restricciones de integridad';
    } else if (err.name === 'SequelizeDatabaseError') {
        // Handle other database errors
        err.status = 500;
        err.message = 'Error en la base de datos';
    }

    next(err);
};

// Rate limiting error handler
const handleRateLimitError = (err, req, res, next) => {
    if (err.type === 'too-many-requests') {
        err.status = 429;
        err.message = 'Demasiadas solicitudes. Por favor, intenta más tarde.';
    }
    next(err);
};

// Session error handler
const handleSessionError = (err, req, res, next) => {
    if (err.code === 'SESSION_EXPIRED') {
        // Clear the invalid session
        req.session.destroy();
        
        // If API request, send JSON response
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(401).json({
                error: 'Sesión expirada. Por favor, inicia sesión nuevamente.'
            });
        }
        
        // For regular requests, redirect to login
        return res.redirect('/auth/login');
    }
    next(err);
};

// Cleanup old log files (keep last 30 days)
const cleanupOldLogs = () => {
    const retentionDays = 30;
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    
    fs.readdir(logsDir, (err, files) => {
        if (err) {
            console.error('Error reading logs directory:', err);
            return;
        }

        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(logsDir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.error('Error getting file stats:', err);
                    return;
                }

                if (now - stats.mtime.getTime() > retentionMs) {
                    fs.unlink(filePath, err => {
                        if (err) {
                            console.error('Error deleting old log file:', err);
                        }
                    });
                }
            });
        });
    });
};

// Schedule log cleanup to run daily
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

module.exports = {
    errorLogger,
    notFoundHandler,
    errorHandler,
    handleSequelizeError,
    handleRateLimitError,
    handleSessionError
};