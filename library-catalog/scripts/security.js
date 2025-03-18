const helmet = require('helmet');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { config } = require('../config/app');
const { logger } = require('./logger');
const { ErrorFactory } = require('./errors');

class SecurityService {
    constructor() {
        this.saltRounds = 10;
    }

    // Configure security middleware
    getMiddleware() {
        return [
            this.getHelmetConfig(),
            this.getCorsConfig(),
            this.getSecurityHeaders(),
            this.preventClickjacking(),
            this.preventMimeSniffing(),
            this.enableHSTS(),
            this.setCSP(),
            this.setReferrerPolicy()
        ];
    }

    // Configure Helmet
    getHelmetConfig() {
        return helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.tailwindcss.com', 'cdnjs.cloudflare.com'],
                    styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdn.tailwindcss.com'],
                    imgSrc: ["'self'", 'data:', 'https:'],
                    fontSrc: ["'self'", 'fonts.gstatic.com'],
                    connectSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"]
                }
            },
            crossOriginEmbedderPolicy: true,
            crossOriginOpenerPolicy: true,
            crossOriginResourcePolicy: true,
            dnsPrefetchControl: true,
            frameguard: true,
            hidePoweredBy: true,
            hsts: true,
            ieNoOpen: true,
            noSniff: true,
            permittedCrossDomainPolicies: true,
            referrerPolicy: true,
            xssFilter: true
        });
    }

    // Configure CORS
    getCorsConfig() {
        return cors({
            origin: config.security.allowedOrigins,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            exposedHeaders: ['Content-Range', 'X-Content-Range'],
            credentials: true,
            maxAge: 86400 // 24 hours
        });
    }

    // Set security headers
    getSecurityHeaders() {
        return (req, res, next) => {
            // Set security headers
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('X-Download-Options', 'noopen');
            res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
            next();
        };
    }

    // Prevent clickjacking
    preventClickjacking() {
        return (req, res, next) => {
            res.setHeader('X-Frame-Options', 'DENY');
            next();
        };
    }

    // Prevent MIME type sniffing
    preventMimeSniffing() {
        return (req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            next();
        };
    }

    // Enable HTTP Strict Transport Security
    enableHSTS() {
        return (req, res, next) => {
            res.setHeader(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains; preload'
            );
            next();
        };
    }

    // Set Content Security Policy
    setCSP() {
        return (req, res, next) => {
            res.setHeader(
                'Content-Security-Policy',
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline' cdn.tailwindcss.com cdnjs.cloudflare.com; " +
                "style-src 'self' 'unsafe-inline' fonts.googleapis.com cdn.tailwindcss.com; " +
                "img-src 'self' data: https:; " +
                "font-src 'self' fonts.gstatic.com; " +
                "connect-src 'self'; " +
                "object-src 'none'; " +
                "media-src 'self'; " +
                "frame-src 'none';"
            );
            next();
        };
    }

    // Set Referrer Policy
    setReferrerPolicy() {
        return (req, res, next) => {
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            next();
        };
    }

    // Hash password
    async hashPassword(password) {
        try {
            return await bcrypt.hash(password, this.saltRounds);
        } catch (error) {
            logger.error('Error hashing password:', error);
            throw ErrorFactory.create('auth', 'Error al encriptar la contraseña');
        }
    }

    // Compare password
    async comparePassword(password, hash) {
        try {
            return await bcrypt.compare(password, hash);
        } catch (error) {
            logger.error('Error comparing password:', error);
            throw ErrorFactory.create('auth', 'Error al verificar la contraseña');
        }
    }

    // Generate secure random string
    generateSecureString(length = 32) {
        return require('crypto')
            .randomBytes(Math.ceil(length / 2))
            .toString('hex')
            .slice(0, length);
    }

    // Sanitize user input
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input
            .replace(/[<>]/g, '') // Remove < and >
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .trim();
    }

    // Validate file type
    validateFileType(file, allowedTypes) {
        const fileType = require('file-type');
        return allowedTypes.includes(fileType(file.buffer).mime);
    }

    // Scan file for viruses (mock implementation)
    async scanFile(file) {
        // In a real implementation, you would integrate with an antivirus service
        logger.info(`Scanning file: ${file.originalname}`);
        return true;
    }

    // Encrypt data
    encryptData(data, key = config.security.encryptionKey) {
        const crypto = require('crypto');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
        
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    // Decrypt data
    decryptData(encryptedData, key = config.security.encryptionKey) {
        const crypto = require('crypto');
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            Buffer.from(key, 'hex'),
            Buffer.from(encryptedData.iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    }
}

// Create security service instance
const securityService = new SecurityService();

// Export security service
module.exports = securityService;