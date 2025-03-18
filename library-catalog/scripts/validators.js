const { body, param, query } = require('express-validator');
const { UserRoles, LoanStatus, BookStatus, Regex } = require('./constants');
const { models } = require('./models');
const Utils = require('./utils');

// User validation rules
const userValidators = {
    // Create user validation
    create: [
        body('username')
            .trim()
            .matches(Regex.USERNAME)
            .withMessage('El nombre de usuario debe tener entre 3 y 20 caracteres alfanuméricos'),
        body('password')
            .matches(Regex.PASSWORD)
            .withMessage('La contraseña debe tener al menos 6 caracteres, una letra y un número'),
        body('email')
            .trim()
            .isEmail()
            .withMessage('Email inválido')
            .normalizeEmail(),
        body('fullName')
            .trim()
            .notEmpty()
            .withMessage('El nombre completo es requerido'),
        body('role')
            .isIn(Object.values(UserRoles))
            .withMessage('Rol inválido')
    ],

    // Update user validation
    update: [
        body('email')
            .optional()
            .trim()
            .isEmail()
            .withMessage('Email inválido')
            .normalizeEmail(),
        body('fullName')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('El nombre completo es requerido'),
        body('currentPassword')
            .optional()
            .notEmpty()
            .withMessage('La contraseña actual es requerida'),
        body('newPassword')
            .optional()
            .matches(Regex.PASSWORD)
            .withMessage('La nueva contraseña debe tener al menos 6 caracteres, una letra y un número')
    ]
};

// Book validation rules
const bookValidators = {
    // Create book validation
    create: [
        body('title')
            .trim()
            .notEmpty()
            .withMessage('El título es requerido'),
        body('author')
            .trim()
            .notEmpty()
            .withMessage('El autor es requerido'),
        body('isbn')
            .trim()
            .custom(isbn => Utils.validateISBN(isbn))
            .withMessage('ISBN inválido'),
        body('category')
            .trim()
            .notEmpty()
            .withMessage('La categoría es requerida'),
        body('quantity')
            .isInt({ min: 1 })
            .withMessage('La cantidad debe ser un número positivo'),
        body('publicationYear')
            .optional()
            .isInt({ min: 1000, max: new Date().getFullYear() })
            .withMessage('Año de publicación inválido')
    ],

    // Update book validation
    update: [
        body('title')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('El título es requerido'),
        body('author')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('El autor es requerido'),
        body('category')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('La categoría es requerida'),
        body('quantity')
            .optional()
            .isInt({ min: 0 })
            .withMessage('La cantidad debe ser un número positivo o cero'),
        body('status')
            .optional()
            .isIn(Object.values(BookStatus))
            .withMessage('Estado inválido')
    ]
};

// Loan validation rules
const loanValidators = {
    // Create loan validation
    create: [
        body('userId')
            .isInt()
            .withMessage('Usuario inválido'),
        body('bookId')
            .isInt()
            .withMessage('Libro inválido'),
        body('dueDate')
            .isISO8601()
            .withMessage('Fecha de devolución inválida')
            .custom(date => new Date(date) > new Date())
            .withMessage('La fecha de devolución debe ser posterior a hoy')
    ],

    // Update loan validation
    update: [
        body('status')
            .isIn(Object.values(LoanStatus))
            .withMessage('Estado inválido'),
        body('returnDate')
            .optional()
            .isISO8601()
            .withMessage('Fecha de devolución inválida')
    ],

    // Extend loan validation
    extend: [
        body('extensionDays')
            .isInt({ min: 1, max: 30 })
            .withMessage('Días de extensión inválidos')
    ]
};

// Search validation rules
const searchValidators = {
    // Book search validation
    books: [
        query('q')
            .optional()
            .trim()
            .isLength({ min: 3 })
            .withMessage('La búsqueda debe tener al menos 3 caracteres'),
        query('category')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('Categoría inválida'),
        query('status')
            .optional()
            .isIn(Object.values(BookStatus))
            .withMessage('Estado inválido'),
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Página inválida'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Límite inválido')
    ],

    // Loan search validation
    loans: [
        query('status')
            .optional()
            .isIn(Object.values(LoanStatus))
            .withMessage('Estado inválido'),
        query('userId')
            .optional()
            .isInt()
            .withMessage('Usuario inválido'),
        query('bookId')
            .optional()
            .isInt()
            .withMessage('Libro inválido'),
        query('startDate')
            .optional()
            .isISO8601()
            .withMessage('Fecha inicial inválida'),
        query('endDate')
            .optional()
            .isISO8601()
            .withMessage('Fecha final inválida')
    ]
};

// ID parameter validation
const idValidator = [
    param('id')
        .isInt()
        .withMessage('ID inválido')
];

// Custom validators
const customValidators = {
    // Check if user has reached loan limit
    checkLoanLimit: async (userId, userRole) => {
        const activeLoans = await models.Loan.count({
            where: {
                userId,
                status: ['active', 'overdue']
            }
        });

        const limits = {
            [UserRoles.STUDENT]: 3,
            [UserRoles.TEACHER]: 5,
            [UserRoles.LIBRARIAN]: 10
        };

        if (activeLoans >= limits[userRole]) {
            throw new Error(`Has alcanzado el límite de ${limits[userRole]} préstamos simultáneos`);
        }

        return true;
    },

    // Check if book is available
    checkBookAvailability: async (bookId) => {
        const book = await models.Book.findByPk(bookId);
        if (!book) {
            throw new Error('Libro no encontrado');
        }

        if (book.status !== BookStatus.AVAILABLE || book.availableQuantity < 1) {
            throw new Error('Libro no disponible para préstamo');
        }

        return true;
    },

    // Check if user has overdue loans
    checkOverdueLoans: async (userId) => {
        const overdueLoans = await models.Loan.count({
            where: {
                userId,
                status: 'overdue'
            }
        });

        if (overdueLoans > 0) {
            throw new Error('Tienes préstamos vencidos pendientes');
        }

        return true;
    }
};

module.exports = {
    userValidators,
    bookValidators,
    loanValidators,
    searchValidators,
    idValidator,
    customValidators
};