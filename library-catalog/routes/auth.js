const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

// Middleware to check if user is already authenticated
const isNotAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    next();
};

// Login page
router.get('/login', isNotAuthenticated, (req, res) => {
    res.render('auth/login', { error: null });
});

// Login process
router.post('/login', [
    body('username').trim().notEmpty().withMessage('El nombre de usuario es requerido'),
    body('password').notEmpty().withMessage('La contraseña es requerida')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('auth/login', {
            error: errors.array()[0].msg
        });
    }

    try {
        const user = await User.findByUsername(req.body.username);
        
        if (!user || !(await user.validPassword(req.body.password))) {
            return res.render('auth/login', {
                error: 'Usuario o contraseña incorrectos'
            });
        }

        if (!user.active) {
            return res.render('auth/login', {
                error: 'Esta cuenta está desactivada'
            });
        }

        // Set session
        req.session.user = {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email
        };
        req.session.userRole = user.role;

        res.redirect('/');
    } catch (error) {
        console.error('Login error:', error);
        res.render('auth/login', {
            error: 'Error al iniciar sesión'
        });
    }
});

// Registration page
router.get('/register', isNotAuthenticated, (req, res) => {
    res.render('auth/register', { error: null });
});

// Registration process
router.post('/register', [
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
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('auth/register', {
            error: errors.array()[0].msg,
            formData: req.body
        });
    }

    try {
        // Check if username or email already exists
        const existingUser = await User.findOne({
            where: {
                [sequelize.Op.or]: [
                    { username: req.body.username },
                    { email: req.body.email }
                ]
            }
        });

        if (existingUser) {
            return res.render('auth/register', {
                error: 'El nombre de usuario o email ya está registrado',
                formData: req.body
            });
        }

        // Create new user
        const user = await User.create({
            username: req.body.username,
            password: req.body.password,
            email: req.body.email,
            fullName: req.body.fullName,
            role: req.body.role
        });

        // Set session
        req.session.user = {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email
        };
        req.session.userRole = user.role;

        res.redirect('/');
    } catch (error) {
        console.error('Registration error:', error);
        res.render('auth/register', {
            error: 'Error al registrar usuario',
            formData: req.body
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/auth/login');
    });
});

module.exports = router;