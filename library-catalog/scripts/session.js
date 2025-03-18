const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { sequelize } = require('../config/database');
const { config } = require('../config/app');
const { logger } = require('./logger');
const { ErrorFactory } = require('./errors');

class SessionService {
    constructor() {
        this.store = new SequelizeStore({
            db: sequelize,
            tableName: 'sessions',
            checkExpirationInterval: 15 * 60 * 1000, // Clean up expired sessions every 15 minutes
            expiration: 24 * 60 * 60 * 1000 // Sessions expire in 24 hours
        });

        // Initialize session store
        this.store.sync();
    }

    // Get session configuration
    getConfig() {
        return {
            store: this.store,
            secret: config.session.secret,
            name: config.session.name,
            resave: false,
            saveUninitialized: false,
            rolling: true, // Reset expiration on every request
            cookie: {
                secure: config.app.env === 'production',
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
                sameSite: 'lax'
            }
        };
    }

    // Create session middleware
    middleware() {
        return session(this.getConfig());
    }

    // Session management middleware
    manage() {
        return (req, res, next) => {
            // Regenerate session ID periodically
            if (req.session.user && req.session.lastRotation) {
                const rotationInterval = 15 * 60 * 1000; // 15 minutes
                if (Date.now() - req.session.lastRotation >= rotationInterval) {
                    return this.regenerateSession(req, res, next);
                }
            }

            // Set last rotation time for new sessions
            if (req.session.user && !req.session.lastRotation) {
                req.session.lastRotation = Date.now();
            }

            next();
        };
    }

    // Regenerate session
    regenerateSession(req, res, next) {
        const user = req.session.user;
        req.session.regenerate((err) => {
            if (err) {
                logger.error('Error regenerating session:', err);
                return next(ErrorFactory.create('auth', 'Error en la sesión'));
            }
            req.session.user = user;
            req.session.lastRotation = Date.now();
            req.session.save((err) => {
                if (err) {
                    logger.error('Error saving regenerated session:', err);
                    return next(ErrorFactory.create('auth', 'Error guardando la sesión'));
                }
                next();
            });
        });
    }

    // Create user session
    createUserSession(req, user) {
        return new Promise((resolve, reject) => {
            req.session.regenerate((err) => {
                if (err) {
                    logger.error('Error creating user session:', err);
                    return reject(ErrorFactory.create('auth', 'Error creando la sesión'));
                }

                // Set session data
                req.session.user = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    fullName: user.fullName
                };
                req.session.lastRotation = Date.now();

                req.session.save((err) => {
                    if (err) {
                        logger.error('Error saving user session:', err);
                        return reject(ErrorFactory.create('auth', 'Error guardando la sesión'));
                    }
                    resolve(req.session);
                });
            });
        });
    }

    // Destroy user session
    destroyUserSession(req) {
        return new Promise((resolve, reject) => {
            req.session.destroy((err) => {
                if (err) {
                    logger.error('Error destroying session:', err);
                    return reject(ErrorFactory.create('auth', 'Error cerrando la sesión'));
                }
                resolve();
            });
        });
    }

    // Get active sessions
    async getActiveSessions() {
        try {
            const sessions = await this.store.findAll();
            return sessions.map(session => {
                const data = JSON.parse(session.data);
                return {
                    id: session.sid,
                    user: data.user,
                    createdAt: session.createdAt,
                    expiresAt: new Date(session.expires)
                };
            });
        } catch (error) {
            logger.error('Error getting active sessions:', error);
            throw ErrorFactory.create('database', 'Error obteniendo sesiones activas');
        }
    }

    // Clear expired sessions
    async clearExpiredSessions() {
        try {
            await this.store.clearExpiredSessions();
            logger.info('Cleared expired sessions');
        } catch (error) {
            logger.error('Error clearing expired sessions:', error);
            throw ErrorFactory.create('database', 'Error limpiando sesiones expiradas');
        }
    }

    // Clear all sessions
    async clearAllSessions() {
        try {
            await this.store.clear();
            logger.info('Cleared all sessions');
        } catch (error) {
            logger.error('Error clearing all sessions:', error);
            throw ErrorFactory.create('database', 'Error limpiando todas las sesiones');
        }
    }

    // Clear user sessions
    async clearUserSessions(userId) {
        try {
            const sessions = await this.store.findAll();
            let clearedCount = 0;

            for (const session of sessions) {
                const data = JSON.parse(session.data);
                if (data.user && data.user.id === userId) {
                    await this.store.destroy(session.sid);
                    clearedCount++;
                }
            }

            logger.info(`Cleared ${clearedCount} sessions for user ${userId}`);
            return clearedCount;
        } catch (error) {
            logger.error(`Error clearing sessions for user ${userId}:`, error);
            throw ErrorFactory.create('database', 'Error limpiando sesiones de usuario');
        }
    }
}

// Create session service instance
const sessionService = new SessionService();

// Export session service
module.exports = sessionService;