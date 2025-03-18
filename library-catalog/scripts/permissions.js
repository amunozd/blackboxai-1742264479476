const { UserRoles } = require('./constants');
const { logger } = require('./logger');

class PermissionService {
    constructor() {
        this.permissions = new Map();
        this.setupPermissions();
    }

    // Setup default permissions
    setupPermissions() {
        // Librarian permissions
        this.addPermissions(UserRoles.LIBRARIAN, [
            'book.create',
            'book.read',
            'book.update',
            'book.delete',
            'loan.create',
            'loan.read',
            'loan.update',
            'loan.delete',
            'user.create',
            'user.read',
            'user.update',
            'user.delete',
            'report.generate',
            'settings.manage'
        ]);

        // Teacher permissions
        this.addPermissions(UserRoles.TEACHER, [
            'book.read',
            'loan.create',
            'loan.read',
            'loan.extend',
            'profile.read',
            'profile.update'
        ]);

        // Student permissions
        this.addPermissions(UserRoles.STUDENT, [
            'book.read',
            'loan.create',
            'loan.read',
            'profile.read',
            'profile.update'
        ]);
    }

    // Add permissions for a role
    addPermissions(role, permissions) {
        if (!this.permissions.has(role)) {
            this.permissions.set(role, new Set());
        }
        permissions.forEach(permission => {
            this.permissions.get(role).add(permission);
        });
    }

    // Remove permissions from a role
    removePermissions(role, permissions) {
        if (this.permissions.has(role)) {
            permissions.forEach(permission => {
                this.permissions.get(role).delete(permission);
            });
        }
    }

    // Check if role has permission
    hasPermission(role, permission) {
        if (!this.permissions.has(role)) {
            return false;
        }
        return this.permissions.get(role).has(permission);
    }

    // Get all permissions for a role
    getRolePermissions(role) {
        return Array.from(this.permissions.get(role) || []);
    }

    // Check multiple permissions
    hasPermissions(role, permissions) {
        return permissions.every(permission => this.hasPermission(role, permission));
    }

    // Check if user has any of the permissions
    hasAnyPermission(role, permissions) {
        return permissions.some(permission => this.hasPermission(role, permission));
    }

    // Permission middleware
    checkPermission(permission) {
        return (req, res, next) => {
            const userRole = req.session?.user?.role;

            if (!userRole || !this.hasPermission(userRole, permission)) {
                logger.warn(`Permission denied: ${permission} for role ${userRole}`);
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para realizar esta acción'
                });
            }

            next();
        };
    }

    // Multiple permissions middleware
    checkPermissions(permissions) {
        return (req, res, next) => {
            const userRole = req.session?.user?.role;

            if (!userRole || !this.hasPermissions(userRole, permissions)) {
                logger.warn(`Permissions denied: ${permissions.join(', ')} for role ${userRole}`);
                return res.status(403).json({
                    success: false,
                    message: 'No tienes los permisos necesarios'
                });
            }

            next();
        };
    }

    // Any permission middleware
    checkAnyPermission(permissions) {
        return (req, res, next) => {
            const userRole = req.session?.user?.role;

            if (!userRole || !this.hasAnyPermission(userRole, permissions)) {
                logger.warn(`Any permission denied: ${permissions.join(', ')} for role ${userRole}`);
                return res.status(403).json({
                    success: false,
                    message: 'No tienes ninguno de los permisos necesarios'
                });
            }

            next();
        };
    }

    // Role middleware
    checkRole(roles) {
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        return (req, res, next) => {
            const userRole = req.session?.user?.role;

            if (!userRole || !allowedRoles.includes(userRole)) {
                logger.warn(`Role denied: ${userRole} not in [${allowedRoles.join(', ')}]`);
                return res.status(403).json({
                    success: false,
                    message: 'No tienes el rol necesario'
                });
            }

            next();
        };
    }

    // Authentication middleware
    authenticate() {
        return (req, res, next) => {
            if (!req.session?.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Debes iniciar sesión'
                });
            }

            next();
        };
    }

    // Resource ownership middleware
    checkOwnership(resourceType) {
        return async (req, res, next) => {
            const userId = req.session?.user?.id;
            const userRole = req.session?.user?.role;
            const resourceId = req.params.id;

            // Librarians can access all resources
            if (userRole === UserRoles.LIBRARIAN) {
                return next();
            }

            try {
                const { models } = require('../models');
                let resource;

                switch (resourceType) {
                    case 'loan':
                        resource = await models.Loan.findByPk(resourceId);
                        if (resource?.userId !== userId) {
                            throw new Error('No tienes acceso a este préstamo');
                        }
                        break;

                    case 'profile':
                        if (resourceId !== userId.toString()) {
                            throw new Error('Solo puedes acceder a tu perfil');
                        }
                        break;

                    default:
                        throw new Error('Tipo de recurso no válido');
                }

                next();
            } catch (error) {
                logger.warn(`Ownership check failed: ${error.message}`);
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }
        };
    }
}

// Create permission service instance
const permissionService = new PermissionService();

// Export permission service
module.exports = permissionService;