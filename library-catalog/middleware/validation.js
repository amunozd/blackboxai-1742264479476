const { body, validationResult } = require('express-validator');

// Validation middleware for user registration
const validateRegistration = [
    body('username')
        .trim()
        .notEmpty().withMessage('El nombre de usuario es requerido')
        .isLength({ min: 3 }).withMessage('El nombre de usuario debe tener al menos 3 caracteres')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos'),
    body('password')
        .notEmpty().withMessage('La contraseña es requerida')
        .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('email')
        .trim()
        .notEmpty().withMessage('El email es requerido')
        .isEmail().withMessage('Email inválido'),
    body('fullName')
        .trim()
        .notEmpty().withMessage('El nombre completo es requerido')
        .isLength({ min: 2 }).withMessage('El nombre completo debe tener al menos 2 caracteres'),
    body('role')
        .trim()
        .notEmpty().withMessage('El rol es requerido')
        .isIn(['alumno', 'docente']).withMessage('Rol inválido')
];

// Validation middleware for user login
const validateLogin = [
    body('username')
        .trim()
        .notEmpty().withMessage('El nombre de usuario es requerido'),
    body('password')
        .notEmpty().withMessage('La contraseña es requerida')
];

// Validation middleware for book creation/update
const validateBook = [
    body('title')
        .trim()
        .notEmpty().withMessage('El título es requerido')
        .isLength({ max: 255 }).withMessage('El título no puede exceder los 255 caracteres'),
    body('author')
        .trim()
        .notEmpty().withMessage('El autor es requerido')
        .isLength({ max: 255 }).withMessage('El autor no puede exceder los 255 caracteres'),
    body('isbn')
        .trim()
        .notEmpty().withMessage('El ISBN es requerido')
        .matches(/^[0-9-]+$/).withMessage('ISBN inválido')
        .isLength({ min: 10, max: 13 }).withMessage('El ISBN debe tener entre 10 y 13 caracteres'),
    body('category')
        .trim()
        .notEmpty().withMessage('La categoría es requerida'),
    body('quantity')
        .isInt({ min: 0 }).withMessage('La cantidad debe ser un número positivo'),
    body('publicationYear')
        .optional({ nullable: true })
        .isInt({ min: 1000, max: new Date().getFullYear() })
        .withMessage('Año de publicación inválido'),
    body('publisher')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 255 }).withMessage('La editorial no puede exceder los 255 caracteres')
];

// Validation middleware for loan creation
const validateLoan = [
    body('userId')
        .optional()
        .isInt().withMessage('Usuario inválido'),
    body('dueDate')
        .notEmpty().withMessage('La fecha de devolución es requerida')
        .isDate().withMessage('Fecha de devolución inválida')
        .custom((value) => {
            const dueDate = new Date(value);
            const today = new Date();
            const maxDate = new Date();
            maxDate.setDate(today.getDate() + 30);

            if (dueDate <= today) {
                throw new Error('La fecha de devolución debe ser posterior a hoy');
            }
            if (dueDate > maxDate) {
                throw new Error('El préstamo no puede exceder los 30 días');
            }
            return true;
        })
];

// Validation middleware for profile update
const validateProfileUpdate = [
    body('fullName')
        .trim()
        .notEmpty().withMessage('El nombre completo es requerido')
        .isLength({ min: 2 }).withMessage('El nombre completo debe tener al menos 2 caracteres'),
    body('email')
        .trim()
        .notEmpty().withMessage('El email es requerido')
        .isEmail().withMessage('Email inválido'),
    body('currentPassword')
        .notEmpty().withMessage('La contraseña actual es requerida'),
    body('newPassword')
        .optional({ checkFalsy: true })
        .isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres')
];

// Generic validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // If it's an API request (expecting JSON)
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(400).json({
                error: errors.array()[0].msg
            });
        }
        
        // For form submissions (expecting HTML)
        return res.render(req.validationErrorPage || 'error', {
            error: errors.array()[0].msg,
            formData: req.body
        });
    }
    next();
};

module.exports = {
    validateRegistration,
    validateLogin,
    validateBook,
    validateLoan,
    validateProfileUpdate,
    handleValidationErrors
};