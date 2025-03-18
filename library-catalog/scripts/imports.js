const csv = require('csv-parse');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');
const Utils = require('./utils');
const { ValidationError } = require('./errors');

class ImportService {
    constructor(models) {
        this.models = models;
        this.importDir = path.join(__dirname, '../public/imports');
        Utils.ensureDirectoryExists(this.importDir);
    }

    // Process CSV file
    async processCSV(filepath, options = {}) {
        const {
            type = 'books',
            skipHeader = true,
            delimiter = ',',
            validateOnly = false
        } = options;

        return new Promise((resolve, reject) => {
            const results = {
                processed: 0,
                success: 0,
                errors: [],
                data: []
            };

            fs.createReadStream(filepath)
                .pipe(csv.parse({
                    delimiter,
                    columns: true,
                    skip_empty_lines: true,
                    trim: true
                }))
                .on('data', async (row) => {
                    try {
                        const processedRow = await this.processRow(row, type, validateOnly);
                        results.processed++;
                        if (processedRow.success) {
                            results.success++;
                            results.data.push(processedRow.data);
                        } else {
                            results.errors.push({
                                row: results.processed,
                                errors: processedRow.errors
                            });
                        }
                    } catch (error) {
                        results.errors.push({
                            row: results.processed,
                            errors: [error.message]
                        });
                    }
                })
                .on('end', () => {
                    resolve(results);
                })
                .on('error', (error) => {
                    reject(error);
                });
        });
    }

    // Process individual row
    async processRow(row, type, validateOnly = false) {
        switch (type) {
            case 'books':
                return await this.processBookRow(row, validateOnly);
            case 'users':
                return await this.processUserRow(row, validateOnly);
            default:
                throw new Error(`Tipo de importación no soportado: ${type}`);
        }
    }

    // Process book row
    async processBookRow(row, validateOnly) {
        const result = {
            success: false,
            data: null,
            errors: []
        };

        try {
            // Validate required fields
            if (!row.title) result.errors.push('Título es requerido');
            if (!row.author) result.errors.push('Autor es requerido');
            if (!row.isbn) result.errors.push('ISBN es requerido');
            if (!row.quantity) result.errors.push('Cantidad es requerida');

            // Validate ISBN
            if (row.isbn && !Utils.validateISBN(row.isbn)) {
                result.errors.push('ISBN inválido');
            }

            // Validate quantity
            if (row.quantity && isNaN(row.quantity)) {
                result.errors.push('Cantidad debe ser un número');
            }

            if (result.errors.length > 0) {
                return result;
            }

            // Check if book already exists
            const existingBook = await this.models.Book.findOne({
                where: { isbn: row.isbn }
            });

            if (existingBook) {
                result.errors.push('ISBN ya existe en el sistema');
                return result;
            }

            // Create book if not validate only
            if (!validateOnly) {
                const book = await this.models.Book.create({
                    title: row.title,
                    author: row.author,
                    isbn: row.isbn,
                    category: row.category || 'Sin categoría',
                    quantity: parseInt(row.quantity),
                    availableQuantity: parseInt(row.quantity),
                    publisher: row.publisher,
                    publicationYear: row.publicationYear,
                    description: row.description,
                    status: 'available'
                });

                result.data = book;
            }

            result.success = true;
        } catch (error) {
            result.errors.push(error.message);
        }

        return result;
    }

    // Process user row
    async processUserRow(row, validateOnly) {
        const result = {
            success: false,
            data: null,
            errors: []
        };

        try {
            // Validate required fields
            if (!row.username) result.errors.push('Nombre de usuario es requerido');
            if (!row.email) result.errors.push('Email es requerido');
            if (!row.fullName) result.errors.push('Nombre completo es requerido');
            if (!row.role) result.errors.push('Rol es requerido');

            // Validate email
            if (row.email && !Utils.validateEmail(row.email)) {
                result.errors.push('Email inválido');
            }

            // Validate role
            const validRoles = ['alumno', 'docente', 'bibliotecario'];
            if (row.role && !validRoles.includes(row.role.toLowerCase())) {
                result.errors.push('Rol inválido');
            }

            if (result.errors.length > 0) {
                return result;
            }

            // Check if user already exists
            const existingUser = await this.models.User.findOne({
                where: {
                    [Op.or]: [
                        { username: row.username },
                        { email: row.email }
                    ]
                }
            });

            if (existingUser) {
                result.errors.push('Usuario o email ya existe en el sistema');
                return result;
            }

            // Create user if not validate only
            if (!validateOnly) {
                const user = await this.models.User.create({
                    username: row.username,
                    email: row.email,
                    fullName: row.fullName,
                    role: row.role.toLowerCase(),
                    password: Utils.generateRandomString(10), // Temporary password
                    active: true
                });

                result.data = user;
            }

            result.success = true;
        } catch (error) {
            result.errors.push(error.message);
        }

        return result;
    }

    // Clean up temporary files
    async cleanupTempFiles(maxAge = 60 * 60 * 1000) { // 1 hour
        try {
            const files = await fs.promises.readdir(this.importDir);
            const now = Date.now();
            let deletedCount = 0;

            for (const file of files) {
                const filepath = path.join(this.importDir, file);
                const stats = await fs.promises.stat(filepath);

                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.promises.unlink(filepath);
                    deletedCount++;
                }
            }

            logger.info(`Cleaned up ${deletedCount} temporary import files`);
        } catch (error) {
            logger.error('Error cleaning temporary files:', error);
        }
    }
}

module.exports = ImportService;