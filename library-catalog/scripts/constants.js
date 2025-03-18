// User roles
const UserRoles = {
    LIBRARIAN: 'bibliotecario',
    TEACHER: 'docente',
    STUDENT: 'alumno'
};

// Book status
const BookStatus = {
    AVAILABLE: 'available',
    UNAVAILABLE: 'unavailable',
    MAINTENANCE: 'maintenance',
    LOST: 'lost'
};

// Loan status
const LoanStatus = {
    ACTIVE: 'active',
    OVERDUE: 'overdue',
    RETURNED: 'returned',
    LOST: 'lost'
};

// HTTP status codes
const HttpStatus = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
};

// Regular expressions
const Regex = {
    USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    ISBN: /^(?:\d{10}|\d{13})$/,
    PHONE: /^\+?[1-9]\d{1,14}$/
};

// File types
const FileTypes = {
    ALLOWED_IMAGES: ['.jpg', '.jpeg', '.png', '.gif'],
    ALLOWED_DOCUMENTS: ['.pdf', '.doc', '.docx'],
    MAX_FILE_SIZE: 5 * 1024 * 1024 // 5MB
};

// Pagination defaults
const Pagination = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
};

// Search configuration
const SearchConfig = {
    MIN_QUERY_LENGTH: 3,
    MAX_QUERY_LENGTH: 50,
    RESULTS_PER_PAGE: 10,
    MAX_PAGE_SIZE: 100
};

// Cache configuration
const CacheConfig = {
    DEFAULT_TTL: 600, // 10 minutes
    LONG_TTL: 3600, // 1 hour
    SHORT_TTL: 300, // 5 minutes
    MAX_ITEMS: 1000
};

// Session configuration
const SessionConfig = {
    COOKIE_NAME: 'library_session',
    MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    SECURE: process.env.NODE_ENV === 'production',
    HTTP_ONLY: true
};

// Rate limiting configuration
const RateLimitConfig = {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
    MESSAGE: 'Too many requests, please try again later'
};

// Loan configuration
const LoanConfig = {
    DEFAULT_DURATION: 14, // days
    MAX_EXTENSION: 7, // days
    MAX_EXTENSIONS: 2,
    REMINDER_DAYS: 2 // days before due date
};

// Loan limits by user role
const LoanLimits = {
    [UserRoles.STUDENT]: {
        MAX_BOOKS: 3,
        MAX_DURATION: 14 // days
    },
    [UserRoles.TEACHER]: {
        MAX_BOOKS: 5,
        MAX_DURATION: 30 // days
    },
    [UserRoles.LIBRARIAN]: {
        MAX_BOOKS: 10,
        MAX_DURATION: 60 // days
    }
};

// Email templates
const EmailTemplates = {
    WELCOME: 'welcome',
    LOAN_CONFIRMATION: 'loan-confirmation',
    LOAN_REMINDER: 'loan-reminder',
    LOAN_OVERDUE: 'loan-overdue',
    RETURN_CONFIRMATION: 'return-confirmation',
    PASSWORD_RESET: 'password-reset'
};

// Report types
const ReportTypes = {
    LOAN_HISTORY: 'loan-history',
    OVERDUE_LOANS: 'overdue-loans',
    BOOK_INVENTORY: 'book-inventory',
    USER_ACTIVITY: 'user-activity',
    STATISTICS: 'statistics'
};

// Export formats
const ExportFormats = {
    PDF: 'pdf',
    EXCEL: 'excel',
    CSV: 'csv'
};

// Date formats
const DateFormats = {
    SHORT: 'YYYY-MM-DD',
    LONG: 'YYYY-MM-DD HH:mm:ss',
    DISPLAY: 'DD/MM/YYYY',
    DISPLAY_TIME: 'DD/MM/YYYY HH:mm'
};

// Notification types
const NotificationTypes = {
    LOAN_DUE: 'loan-due',
    LOAN_OVERDUE: 'loan-overdue',
    BOOK_AVAILABLE: 'book-available',
    SYSTEM_ALERT: 'system-alert'
};

// System events
const SystemEvents = {
    USER_LOGIN: 'user:login',
    USER_LOGOUT: 'user:logout',
    LOAN_CREATED: 'loan:created',
    LOAN_RETURNED: 'loan:returned',
    BOOK_ADDED: 'book:added',
    BOOK_UPDATED: 'book:updated'
};

// Export all constants
module.exports = {
    UserRoles,
    BookStatus,
    LoanStatus,
    HttpStatus,
    Regex,
    FileTypes,
    Pagination,
    SearchConfig,
    CacheConfig,
    SessionConfig,
    RateLimitConfig,
    LoanConfig,
    LoanLimits,
    EmailTemplates,
    ReportTypes,
    ExportFormats,
    DateFormats,
    NotificationTypes,
    SystemEvents
};