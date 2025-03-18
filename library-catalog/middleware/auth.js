// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        // Store the requested URL to redirect back after login
        req.session.returnTo = req.originalUrl;
        return res.redirect('/auth/login');
    }
    next();
};

// Authorization middleware for librarian role
const isLibrarian = (req, res, next) => {
    if (!req.session.user || req.session.userRole !== 'bibliotecario') {
        return res.status(403).render('error', {
            message: 'Acceso denegado',
            error: {
                status: 403,
                stack: process.env.NODE_ENV === 'development' ? 
                    'No tienes los permisos necesarios para acceder a esta página.' : null
            }
        });
    }
    next();
};

// Middleware to check if user is not authenticated (for login/register pages)
const isNotAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    next();
};

// Middleware to check if user owns the resource or is a librarian
const isOwnerOrLibrarian = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    if (req.session.userRole === 'bibliotecario') {
        return next();
    }

    const resourceUserId = parseInt(req.params.userId) || req.body.userId;
    if (resourceUserId !== req.session.user.id) {
        return res.status(403).render('error', {
            message: 'Acceso denegado',
            error: {
                status: 403,
                stack: process.env.NODE_ENV === 'development' ? 
                    'No tienes permiso para acceder a este recurso.' : null
            }
        });
    }

    next();
};

// Middleware to validate active user status
const isActiveUser = async (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    try {
        const user = await User.findByPk(req.session.user.id);
        if (!user || !user.active) {
            req.session.destroy();
            return res.render('auth/login', {
                error: 'Tu cuenta ha sido desactivada. Por favor, contacta al bibliotecario.'
            });
        }
        next();
    } catch (error) {
        console.error('Error checking user status:', error);
        return res.status(500).render('error', {
            message: 'Error al verificar el estado del usuario',
            error: {
                status: 500,
                stack: process.env.NODE_ENV === 'development' ? error.stack : null
            }
        });
    }
};

// Middleware to check loan limits
const checkLoanLimits = async (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    try {
        const activeLoans = await Loan.count({
            where: {
                userId: req.session.user.id,
                status: ['active', 'overdue']
            }
        });

        const loanLimits = {
            'alumno': 3,
            'docente': 5,
            'bibliotecario': 10
        };

        if (activeLoans >= loanLimits[req.session.userRole]) {
            return res.status(400).render('error', {
                message: 'Límite de préstamos alcanzado',
                error: {
                    status: 400,
                    stack: process.env.NODE_ENV === 'development' ? 
                        `Has alcanzado el límite de ${loanLimits[req.session.userRole]} préstamos simultáneos.` : null
                }
            });
        }

        next();
    } catch (error) {
        console.error('Error checking loan limits:', error);
        return res.status(500).render('error', {
            message: 'Error al verificar límites de préstamos',
            error: {
                status: 500,
                stack: process.env.NODE_ENV === 'development' ? error.stack : null
            }
        });
    }
};

module.exports = {
    isAuthenticated,
    isLibrarian,
    isNotAuthenticated,
    isOwnerOrLibrarian,
    isActiveUser,
    checkLoanLimits
};