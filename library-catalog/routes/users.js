const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
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

// User profile
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findByPk(req.session.user.id, {
            include: [{
                model: Loan,
                include: ['Book']
            }]
        });

        if (!user) {
            return res.status(404).render('error', {
                message: 'Usuario no encontrado',
                error: { status: 404 }
            });
        }

        res.render('users/profile', { user });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.render('error', {
            message: 'Error al cargar el perfil',
            error
        });
    }
});

// Update profile
router.put('/profile', isAuthenticated, [
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
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: errors.array()[0].msg
            });
        }

        const user = await User.scope('withPassword').findByPk(req.session.user.id);
        
        if (!user || !(await user.validPassword(req.body.currentPassword))) {
            return res.status(400).json({
                error: 'Contraseña actual incorrecta'
            });
        }

        // Check if email is already taken by another user
        if (req.body.email !== user.email) {
            const existingUser = await User.findOne({
                where: { email: req.body.email }
            });
            if (existingUser) {
                return res.status(400).json({
                    error: 'El email ya está registrado'
                });
            }
        }

        // Update user data
        user.fullName = req.body.fullName;
        user.email = req.body.email;
        if (req.body.newPassword) {
            user.password = req.body.newPassword;
        }

        await user.save();

        // Update session data
        req.session.user = {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email
        };

        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente'
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            error: 'Error al actualizar el perfil'
        });
    }
});

// List all users (librarian only)
router.get('/', isLibrarian, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        const { count, rows: users } = await User.findAndCountAll({
            limit,
            offset,
            order: [['fullName', 'ASC']],
            include: [{
                model: Loan,
                where: { status: ['active', 'overdue'] },
                required: false
            }]
        });

        const totalPages = Math.ceil(count / limit);

        res.render('users/list', {
            users,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.render('error', {
            message: 'Error al cargar los usuarios',
            error
        });
    }
});

// Toggle user status (librarian only)
router.post('/:id/toggle-status', isLibrarian, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        // Prevent deactivating librarian accounts
        if (user.role === 'bibliotecario') {
            return res.status(403).json({
                error: 'No se pueden desactivar cuentas de bibliotecarios'
            });
        }

        user.active = !user.active;
        await user.save();

        res.json({
            success: true,
            message: `Usuario ${user.active ? 'activado' : 'desactivado'} exitosamente`,
            active: user.active
        });
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({
            error: 'Error al cambiar el estado del usuario'
        });
    }
});

// Get user loans (librarian only)
router.get('/:id/loans', isLibrarian, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            include: [{
                model: Loan,
                include: ['Book']
            }]
        });

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            loans: user.Loans
        });
    } catch (error) {
        console.error('Error fetching user loans:', error);
        res.status(500).json({
            error: 'Error al cargar los préstamos del usuario'
        });
    }
});

module.exports = router;