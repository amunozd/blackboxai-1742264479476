const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Loan = require('../models/Loan');
const Book = require('../models/Book');
const User = require('../models/User');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    next();
};

// Middleware to check if user is librarian
const isLibrarian = (req, res, next) => {
    if (req.session.userRole !== 'bibliotecario') {
        return res.status(403).render('error', {
            message: 'Acceso denegado',
            error: { status: 403 }
        });
    }
    next();
};

// List all loans
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        let where = {};
        // If not librarian, show only user's loans
        if (req.session.userRole !== 'bibliotecario') {
            where.userId = req.session.user.id;
        }

        const { count, rows: loans } = await Loan.findAndCountAll({
            where,
            include: [
                { model: Book },
                { model: User }
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        const totalPages = Math.ceil(count / limit);

        res.render('loans/list', {
            loans,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error('Error fetching loans:', error);
        res.render('error', {
            message: 'Error al cargar los préstamos',
            error
        });
    }
});

// Create new loan form
router.get('/new/:bookId', isAuthenticated, async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.bookId);
        if (!book) {
            return res.status(404).render('error', {
                message: 'Libro no encontrado',
                error: { status: 404 }
            });
        }

        if (!book.isAvailable()) {
            return res.status(400).render('error', {
                message: 'El libro no está disponible para préstamo',
                error: { status: 400 }
            });
        }

        // If librarian, get list of users for selection
        let users = [];
        if (req.session.userRole === 'bibliotecario') {
            users = await User.findAll({
                where: { active: true },
                order: [['fullName', 'ASC']]
            });
        }

        res.render('loans/form', {
            book,
            users,
            error: null
        });
    } catch (error) {
        console.error('Error preparing loan form:', error);
        res.render('error', {
            message: 'Error al preparar el formulario de préstamo',
            error
        });
    }
});

// Create new loan process
router.post('/new/:bookId', isAuthenticated, [
    body('userId').optional().isInt().withMessage('Usuario inválido'),
    body('dueDate').optional().isDate().withMessage('Fecha de devolución inválida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: errors.array()[0].msg
            });
        }

        const book = await Book.findByPk(req.params.bookId);
        if (!book || !book.isAvailable()) {
            return res.status(400).json({
                error: 'El libro no está disponible para préstamo'
            });
        }

        // Set userId based on role
        const userId = req.session.userRole === 'bibliotecario' 
            ? req.body.userId 
            : req.session.user.id;

        const loan = await Loan.create({
            userId,
            bookId: book.id,
            dueDate: req.body.dueDate
        });

        res.json({
            success: true,
            loanId: loan.id,
            message: 'Préstamo creado exitosamente'
        });
    } catch (error) {
        console.error('Error creating loan:', error);
        res.status(500).json({
            error: 'Error al crear el préstamo'
        });
    }
});

// Return book process
router.post('/:id/return', isAuthenticated, async (req, res) => {
    try {
        const loan = await Loan.findByPk(req.params.id, {
            include: [Book]
        });

        if (!loan) {
            return res.status(404).json({
                error: 'Préstamo no encontrado'
            });
        }

        // Check if user has permission to return
        if (req.session.userRole !== 'bibliotecario' && loan.userId !== req.session.user.id) {
            return res.status(403).json({
                error: 'No tiene permiso para realizar esta acción'
            });
        }

        if (loan.status === 'returned') {
            return res.status(400).json({
                error: 'Este libro ya ha sido devuelto'
            });
        }

        loan.status = 'returned';
        loan.returnDate = new Date();
        await loan.save();

        res.json({
            success: true,
            message: 'Libro devuelto exitosamente'
        });
    } catch (error) {
        console.error('Error returning book:', error);
        res.status(500).json({
            error: 'Error al procesar la devolución'
        });
    }
});

// Extend loan process
router.post('/:id/extend', isAuthenticated, async (req, res) => {
    try {
        const loan = await Loan.findByPk(req.params.id);
        
        if (!loan) {
            return res.status(404).json({
                error: 'Préstamo no encontrado'
            });
        }

        // Check if user has permission to extend
        if (req.session.userRole !== 'bibliotecario' && loan.userId !== req.session.user.id) {
            return res.status(403).json({
                error: 'No tiene permiso para realizar esta acción'
            });
        }

        if (loan.status !== 'active') {
            return res.status(400).json({
                error: 'Solo se pueden extender préstamos activos'
            });
        }

        // Extend due date by 7 days
        const newDueDate = new Date(loan.dueDate);
        newDueDate.setDate(newDueDate.getDate() + 7);
        loan.dueDate = newDueDate;
        await loan.save();

        res.json({
            success: true,
            message: 'Préstamo extendido exitosamente',
            newDueDate: newDueDate
        });
    } catch (error) {
        console.error('Error extending loan:', error);
        res.status(500).json({
            error: 'Error al extender el préstamo'
        });
    }
});

// Mark book as lost
router.post('/:id/lost', isLibrarian, async (req, res) => {
    try {
        const loan = await Loan.findByPk(req.params.id, {
            include: [Book]
        });

        if (!loan) {
            return res.status(404).json({
                error: 'Préstamo no encontrado'
            });
        }

        if (loan.status === 'lost') {
            return res.status(400).json({
                error: 'Este libro ya está marcado como perdido'
            });
        }

        loan.status = 'lost';
        await loan.save();

        // Update book quantity
        const book = loan.Book;
        book.quantity -= 1;
        book.availableQuantity = Math.min(book.availableQuantity, book.quantity);
        await book.save();

        res.json({
            success: true,
            message: 'Libro marcado como perdido'
        });
    } catch (error) {
        console.error('Error marking book as lost:', error);
        res.status(500).json({
            error: 'Error al marcar el libro como perdido'
        });
    }
});

module.exports = router;