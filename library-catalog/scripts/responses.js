const { HttpStatus } = require('./constants');

class ResponseHandler {
    // Success response
    static success(data = null, message = 'Operación exitosa') {
        return {
            success: true,
            message,
            data
        };
    }

    // Error response
    static error(message = 'Error en la operación', errors = null, status = HttpStatus.INTERNAL_SERVER_ERROR) {
        const response = {
            success: false,
            message,
            status
        };

        if (errors) {
            response.errors = Array.isArray(errors) ? errors : [errors];
        }

        return response;
    }

    // Pagination response
    static paginated(data, page, totalItems, limit) {
        const totalPages = Math.ceil(totalItems / limit);
        
        return {
            success: true,
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        };
    }

    // List response with metadata
    static list(data, metadata = {}) {
        return {
            success: true,
            data,
            metadata
        };
    }

    // Created response
    static created(data = null, message = 'Recurso creado exitosamente') {
        return {
            success: true,
            message,
            data,
            status: HttpStatus.CREATED
        };
    }

    // Updated response
    static updated(data = null, message = 'Recurso actualizado exitosamente') {
        return {
            success: true,
            message,
            data
        };
    }

    // Deleted response
    static deleted(message = 'Recurso eliminado exitosamente') {
        return {
            success: true,
            message
        };
    }

    // Not found response
    static notFound(resource = 'Recurso', id = '') {
        return {
            success: false,
            message: `${resource} no encontrado${id ? `: ${id}` : ''}`,
            status: HttpStatus.NOT_FOUND
        };
    }

    // Bad request response
    static badRequest(message = 'Solicitud inválida', errors = null) {
        return {
            success: false,
            message,
            errors,
            status: HttpStatus.BAD_REQUEST
        };
    }

    // Unauthorized response
    static unauthorized(message = 'No autorizado') {
        return {
            success: false,
            message,
            status: HttpStatus.UNAUTHORIZED
        };
    }

    // Forbidden response
    static forbidden(message = 'Acceso denegado') {
        return {
            success: false,
            message,
            status: HttpStatus.FORBIDDEN
        };
    }

    // Conflict response
    static conflict(message = 'Conflicto con el recurso existente') {
        return {
            success: false,
            message,
            status: HttpStatus.CONFLICT
        };
    }

    // Rate limit exceeded response
    static rateLimitExceeded(retryAfter = 60) {
        return {
            success: false,
            message: 'Demasiadas solicitudes. Por favor, intente más tarde.',
            retryAfter,
            status: 429
        };
    }

    // Validation error response
    static validationError(errors) {
        return {
            success: false,
            message: 'Error de validación',
            errors: Array.isArray(errors) ? errors : [errors],
            status: HttpStatus.BAD_REQUEST
        };
    }

    // File upload response
    static fileUploaded(fileUrl, metadata = {}) {
        return {
            success: true,
            message: 'Archivo subido exitosamente',
            data: {
                url: fileUrl,
                ...metadata
            }
        };
    }

    // Search results response
    static searchResults(results, query, metadata = {}) {
        return {
            success: true,
            data: results,
            query,
            metadata
        };
    }

    // Export results response
    static exportResults(fileUrl, format, metadata = {}) {
        return {
            success: true,
            message: 'Exportación completada exitosamente',
            data: {
                url: fileUrl,
                format,
                ...metadata
            }
        };
    }

    // Import results response
    static importResults(summary) {
        return {
            success: true,
            message: 'Importación completada exitosamente',
            data: summary
        };
    }

    // Batch operation response
    static batchOperation(summary) {
        return {
            success: true,
            message: 'Operación por lotes completada',
            data: summary
        };
    }

    // Health check response
    static healthCheck(status = 'healthy', checks = {}) {
        return {
            success: status === 'healthy',
            status,
            timestamp: new Date().toISOString(),
            checks
        };
    }
}

// Response middleware
const responseMiddleware = (req, res, next) => {
    // Success response helper
    res.sendSuccess = function(data, message) {
        return this.json(ResponseHandler.success(data, message));
    };

    // Error response helper
    res.sendError = function(message, errors, status) {
        return this.status(status || HttpStatus.INTERNAL_SERVER_ERROR)
            .json(ResponseHandler.error(message, errors, status));
    };

    // Paginated response helper
    res.sendPaginated = function(data, page, totalItems, limit) {
        return this.json(ResponseHandler.paginated(data, page, totalItems, limit));
    };

    // Created response helper
    res.sendCreated = function(data, message) {
        return this.status(HttpStatus.CREATED)
            .json(ResponseHandler.created(data, message));
    };

    // Not found response helper
    res.sendNotFound = function(resource, id) {
        return this.status(HttpStatus.NOT_FOUND)
            .json(ResponseHandler.notFound(resource, id));
    };

    // Validation error response helper
    res.sendValidationError = function(errors) {
        return this.status(HttpStatus.BAD_REQUEST)
            .json(ResponseHandler.validationError(errors));
    };

    next();
};

module.exports = {
    ResponseHandler,
    responseMiddleware
};