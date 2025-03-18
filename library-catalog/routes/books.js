const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parse');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Book = require('../models/Book');
const Loan = require('../models/Loan');

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

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Formato de archivo no soportado'));
        }
    }
});

// List all books
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        const { count, rows: books } = await Book.findAndCountAll({
            limit,
            offset,
            order: [['title', 'ASC']]
        });

        const totalPages = Math.ceil(count / limit);

        res.render('books/list', {
            books,
            currentPage: page,
            totalPages,
            query: req.query.q || ''
        });
    } catch (error) {
        console.error('Error fetching books:', error);
        res.render('error', {
            message: 'Error al cargar los libros',
            error
        });
    }
});

// Search books
router.get('/search', isAuthenticated, async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.redirect('/books');
        }

        const books = await Book.searchBooks(query);
        res.render('books/list', {
            books,
            query,
            currentPage: 1,
            totalPages: 1
        });
    } catch (error) {
        console.error('Search error:', error);
        res.render('error', {
            message: 'Error en la búsqueda',
            error
        });
    }
});

// Show book details
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.id, {
            include: [{
                model: Loan,
                include: ['User'],
                where: { status: ['active', 'overdue'] },
                required: false
            }]
        });

        if (!book) {
            return res.status(404).render('error', {
                message: 'Libro no encontrado',
                error: { status: 404 }
            });
        }

        res.render('books/detail', { book });
    } catch (error) {
        console.error('Error fetching book details:', error);
        res.render('error', {
            message: 'Error al cargar los detalles del libro',
            error
        });
    }
});

// Create new book form
router.get('/new', isLibrarian, (req, res) => {
    res.render('books/form', { book: null, error: null });
});

// Create new book process
router.post('/', isLibrarian, [
    body('title').trim().notEmpty().withMessage('El título es requerido'),
    body('author').trim().notEmpty().withMessage('El autor es requerido'),
    body('isbn').trim().notEmpty().withMessage('El ISBN es requerido'),
    body('category').trim().notEmpty().withMessage('La categoría es requerida'),
    body('quantity').isInt({ min: 0 }).withMessage('La cantidad debe ser un número positivo')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('books/form', {
            book: req.body,
            error: errors.array()[0].msg
        });
    }

    try {
        const book = await Book.create({
            ...req.body,
            availableQuantity: req.body.quantity
        });
        res.redirect(`/books/${book.id}`);
    } catch (error) {
        console.error('Error creating book:', error);
        res.render('books/form', {
            book: req.body,
            error: 'Error al crear el libro'
        });
    }
});

// Edit book form
router.get('/:id/edit', isLibrarian, async (req, res) => {
    try {
        const book = await Book.findByPk(req.params.id);
        if (!book) {
            return res.status(404).render('error', {
                message: 'Libro no encontrado',
                error: { status: 404 }
            });
        }
        res.render('books/form', { book, error: null });
    } catch (error) {
        console.error('Error fetching book:', error);
        res.render('error', {
            message: 'Error al cargar el libro',
            error
        });
    }
});

// Update book process
router.put('/:id', isLibrarian, [
    body('title').trim().notEmpty().withMessage('El título es requerido'),
    body('author').trim().notEmpty().withMessage('El autor es requerido'),
    body('isbn').trim().notEmpty().withMessage('El ISBN es requerido'),
    body('category').trim().notEmpty().withMessage('La categoría es requerida'),
    body('quantity').isInt({ min: 0 }).withMessage('La cantidad debe ser un número positivo')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('books/form', {
            book: { ...req.body, id: req.params.id },
            error: errors.array()[0].msg
        });
    }

    try {
        const book = await Book.findByPk(req.params.id);
        if (!book) {
            return res.status(404).render('error', {
                message: 'Libro no encontrado',
                error: { status: 404 }
            });
        }

        await book.update(req.body);
        res.redirect(`/books/${book.id}`);
    } catch (error) {
        console.error('Error updating book:', error);
        res.render('books/form', {
            book: { ...req.body, id: req.params.id },
            error: 'Error al actualizar el libro'
        });
    }
});

// Bulk upload books
router.post('/bulk-upload', isLibrarian, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
    }

    try {
        const results = [];
        fs.createReadStream(req.file.path)
            .pipe(csv.parse({ columns: true, trim: true }))
            .on('data', async (row) => {
                try {
                    const book = await Book.create({
                        title: row.title,
                        author: row.author,
                        isbn: row.isbn,
                        category: row.category,
                        publisher: row.publisher,
                        publicationYear: row.publicationYear,
                        quantity: parseInt(row.quantity) || 1,
                        availableQuantity: parseInt(row.quantity) || 1,
                        description: row.description
                    });
                    results.push({ success: true, book: book.title });
                } catch (error) {
                    results.push({ success: false, error: error.message, row });
                }
            })
            .on('end', () => {
                fs.unlinkSync(req.file.path); // Clean up uploaded file
                res.json({ results });
            });
    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ error: 'Error en la carga masiva de libros' });
    }
});

module.exports = router;