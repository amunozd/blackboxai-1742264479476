const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { models } = require('./models');
const { logger } = require('./logger');
const { ErrorFactory } = require('./errors');
const { UserRoles } = require('./constants');
const configService = require('./config');
const sessionService = require('./session');

class AuthService {
    constructor() {
        this.saltRounds = 10;
        this.jwtSecret = configService.get('security.jwtSecret');
        this.jwtExpiration = configService.get('security.jwtExpiration');
    }

    // Register new user
    async register(userData) {
        try {
            // Check if user already exists
            const existingUser = await models.User.findOne({
                where: {
                    [Op.or]: [
                        { username: userData.username },
                        { email: userData.email }
                    ]
                }
            });

            if (existingUser) {
                throw ErrorFactory.create(
                    'conflict',
                    'Usuario o email ya registrado'
                );
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(
                userData.password,
                this.saltRounds
            );

            // Create user
            const user = await models.User.create({
                ...userData,
                password: hashedPassword,
                role: userData.role || UserRoles.STUDENT
            });

            // Remove password from response
            const { password, ...userWithoutPassword } = user.toJSON();
            return userWithoutPassword;
        } catch (error) {
            logger.error('Error registering user:', error);
            throw error;
        }
    }

    // Login user
    async login(username, password) {
        try {
            // Find user
            const user = await models.User.findOne({
                where: {
                    [Op.or]: [
                        { username },
                        { email: username }
                    ]
                }
            });

            if (!user) {
                throw ErrorFactory.create(
                    'auth',
                    'Credenciales inválidas'
                );
            }

            // Check if user is active
            if (!user.active) {
                throw ErrorFactory.create(
                    'auth',
                    'Usuario inactivo'
                );
            }

            // Verify password
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                throw ErrorFactory.create(
                    'auth',
                    'Credenciales inválidas'
                );
            }

            // Update last login
            await user.update({
                lastLogin: new Date()
            });

            // Remove password from response
            const { password: _, ...userWithoutPassword } = user.toJSON();
            return userWithoutPassword;
        } catch (error) {
            logger.error('Error logging in user:', error);
            throw error;
        }
    }

    // Create session
    async createSession(req, user) {
        try {
            // Create JWT token
            const token = this.generateToken(user);

            // Create session
            await sessionService.createUserSession(req, user);

            return {
                user,
                token
            };
        } catch (error) {
            logger.error('Error creating session:', error);
            throw error;
        }
    }

    // Destroy session
    async destroySession(req) {
        try {
            await sessionService.destroyUserSession(req);
        } catch (error) {
            logger.error('Error destroying session:', error);
            throw error;
        }
    }

    // Generate JWT token
    generateToken(user) {
        return jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role
            },
            this.jwtSecret,
            {
                expiresIn: this.jwtExpiration
            }
        );
    }

    // Verify JWT token
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            throw ErrorFactory.create(
                'auth',
                'Token inválido o expirado'
            );
        }
    }

    // Change password
    async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = await models.User.findByPk(userId);
            if (!user) {
                throw ErrorFactory.create(
                    'notFound',
                    'Usuario no encontrado'
                );
            }

            // Verify current password
            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid) {
                throw ErrorFactory.create(
                    'auth',
                    'Contraseña actual incorrecta'
                );
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(
                newPassword,
                this.saltRounds
            );

            // Update password
            await user.update({
                password: hashedPassword
            });

            return true;
        } catch (error) {
            logger.error('Error changing password:', error);
            throw error;
        }
    }

    // Reset password
    async resetPassword(email) {
        try {
            const user = await models.User.findOne({
                where: { email }
            });

            if (!user) {
                throw ErrorFactory.create(
                    'notFound',
                    'Usuario no encontrado'
                );
            }

            // Generate reset token
            const resetToken = this.generateResetToken(user);

            // Send reset email
            const notificationService = require('./notifications');
            await notificationService.sendEmail(
                user.email,
                'Restablecer Contraseña',
                'reset-password',
                {
                    userName: user.fullName,
                    resetToken
                }
            );

            return true;
        } catch (error) {
            logger.error('Error resetting password:', error);
            throw error;
        }
    }

    // Generate password reset token
    generateResetToken(user) {
        return jwt.sign(
            {
                id: user.id,
                type: 'password-reset'
            },
            this.jwtSecret,
            {
                expiresIn: '1h'
            }
        );
    }

    // Verify reset token and update password
    async verifyResetToken(token, newPassword) {
        try {
            const decoded = this.verifyToken(token);
            if (decoded.type !== 'password-reset') {
                throw ErrorFactory.create(
                    'auth',
                    'Token inválido'
                );
            }

            const user = await models.User.findByPk(decoded.id);
            if (!user) {
                throw ErrorFactory.create(
                    'notFound',
                    'Usuario no encontrado'
                );
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(
                newPassword,
                this.saltRounds
            );

            // Update password
            await user.update({
                password: hashedPassword
            });

            return true;
        } catch (error) {
            logger.error('Error verifying reset token:', error);
            throw error;
        }
    }

    // Check permissions
    checkPermission(user, permission) {
        const permissionService = require('./permissions');
        return permissionService.hasPermission(user.role, permission);
    }

    // Check role
    checkRole(user, roles) {
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        return allowedRoles.includes(user.role);
    }
}

// Create auth service instance
const authService = new AuthService();

// Export auth service
module.exports = authService;