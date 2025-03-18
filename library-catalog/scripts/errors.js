const { HttpStatus } = require('./constants');

// Base application error
class AppError extends Error {
    constructor(message, status = HttpStatus.INTERNAL_SERVER_ERROR) {
        super(message);
        this.name = this.constructor.name;
        this.status = status;
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            error: {
                name: this.name,
                message: this.message,
                status: this.status
            }
        };
    }
}

// Authentication errors
class AuthenticationError extends AppError {
    constructor(message = 'Error de autenticación') {
        super(message, HttpStatus.UNAUTHORIZED);
    }
}

class InvalidCredentialsError extends AuthenticationError {
    constructor(message = 'Credenciales inválidas') {
        super(message);
    }
}

class SessionExpiredError extends AuthenticationError {
    constructor(message = 'Sesión expirada') {
        super(message);
    }
}

// Authorization errors
class AuthorizationError extends AppError {
    constructor(message = 'No autorizado') {
        super(message, HttpStatus.FORBIDDEN);
    }
}

class InsufficientPermissionsError extends AuthorizationError {
    constructor(message = 'Permisos insuficientes') {
        super(message);
    }
}

// Validation errors
class ValidationError extends AppError {
    constructor(message = 'Error de validación', errors = []) {
        super(message, HttpStatus.BAD_REQUEST);
        this.errors = errors;
    }

    toJSON() {
        return {
            error: {
                name: this.name,
                message: this.message,
                status: this.status,
                errors: this.errors
            }
        };
    }
}

class InvalidInputError extends ValidationError {
    constructor(message = 'Datos de entrada inválidos', field = null) {
        super(message);
        this.field = field;
    }
}

// Resource errors
class ResourceError extends AppError {
    constructor(message, status = HttpStatus.NOT_FOUND) {
        super(message, status);
    }
}

class ResourceNotFoundError extends ResourceError {
    constructor(resource = 'Recurso', id = '') {
        super(`${resource} no encontrado${id ? `: ${id}` : ''}`);
    }
}

class ResourceAlreadyExistsError extends ResourceError {
    constructor(resource = 'Recurso') {
        super(`${resource} ya existe`, HttpStatus.CONFLICT);
    }
}

// Database errors
class DatabaseError extends AppError {
    constructor(message = 'Error de base de datos', status = HttpStatus.INTERNAL_SERVER_ERROR) {
        super(message, status);
    }
}

class ConnectionError extends DatabaseError {
    constructor(message = 'Error de conexión a la base de datos') {
        super(message);
    }
}

class QueryError extends DatabaseError {
    constructor(message = 'Error en la consulta') {
        super(message);
    }
}

// File system errors
class FileSystemError extends AppError {
    constructor(message = 'Error en el sistema de archivos', status = HttpStatus.INTERNAL_SERVER_ERROR) {
        super(message, status);
    }
}

class FileUploadError extends FileSystemError {
    constructor(message = 'Error al subir el archivo') {
        super(message, HttpStatus.BAD_REQUEST);
    }
}

class FileNotFoundError extends FileSystemError {
    constructor(message = 'Archivo no encontrado') {
        super(message, HttpStatus.NOT_FOUND);
    }
}

// Business logic errors
class BusinessError extends AppError {
    constructor(message, status = HttpStatus.BAD_REQUEST) {
        super(message, status);
    }
}

class LoanLimitExceededError extends BusinessError {
    constructor(message = 'Límite de préstamos excedido') {
        super(message);
    }
}

class BookUnavailableError extends BusinessError {
    constructor(message = 'Libro no disponible') {
        super(message);
    }
}

class OverdueLoanError extends BusinessError {
    constructor(message = 'Préstamo vencido') {
        super(message);
    }
}

// Rate limiting errors
class RateLimitError extends AppError {
    constructor(message = 'Demasiadas solicitudes', retryAfter = 60) {
        super(message, 429);
        this.retryAfter = retryAfter;
    }

    toJSON() {
        return {
            error: {
                ...super.toJSON().error,
                retryAfter: this.retryAfter
            }
        };
    }
}

// External service errors
class ExternalServiceError extends AppError {
    constructor(message = 'Error en servicio externo', status = HttpStatus.BAD_GATEWAY) {
        super(message, status);
    }
}

class EmailError extends ExternalServiceError {
    constructor(message = 'Error al enviar email') {
        super(message);
    }
}

// Error factory
class ErrorFactory {
    static create(type, message, details = {}) {
        switch (type) {
            case 'auth':
                return new AuthenticationError(message);
            case 'authz':
                return new AuthorizationError(message);
            case 'validation':
                return new ValidationError(message, details.errors);
            case 'notFound':
                return new ResourceNotFoundError(details.resource, details.id);
            case 'conflict':
                return new ResourceAlreadyExistsError(details.resource);
            case 'database':
                return new DatabaseError(message);
            case 'file':
                return new FileSystemError(message);
            case 'business':
                return new BusinessError(message);
            case 'rateLimit':
                return new RateLimitError(message, details.retryAfter);
            case 'external':
                return new ExternalServiceError(message);
            default:
                return new AppError(message, details.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}

module.exports = {
    AppError,
    AuthenticationError,
    InvalidCredentialsError,
    SessionExpiredError,
    AuthorizationError,
    InsufficientPermissionsError,
    ValidationError,
    InvalidInputError,
    ResourceNotFoundError,
    ResourceAlreadyExistsError,
    DatabaseError,
    ConnectionError,
    QueryError,
    FileSystemError,
    FileUploadError,
    FileNotFoundError,
    BusinessError,
    LoanLimitExceededError,
    BookUnavailableError,
    OverdueLoanError,
    RateLimitError,
    ExternalServiceError,
    EmailError,
    ErrorFactory
};