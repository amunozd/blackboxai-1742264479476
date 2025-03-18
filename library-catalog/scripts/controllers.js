const { models } = require('./models');
const { logger } = require('./logger');
const { ResponseHandler } = require('./responses');
const { ErrorFactory } = require('./errors');
const { LoanStatus, BookStatus } = require('./constants');
const exportService = require('./exports');
const searchService = require('./search');

class BaseController {
    constructor(model) {
        this.model = model;
    }

    // List all records
    async list(req, res, next) {
        try {
            const { page = 1, limit = 10, sort, ...filters } = req.query;
            const offset = (page - 1) * limit;

            const { rows, count } = await this.model.findAndCountAll({
                where: filters,
                limit,
                offset,
                order: sort ? [[sort, 'ASC']] : undefined
            });

            return res.sendPaginated(rows, page, count, limit);
        } catch (error) {
            next(error);
        }
    }

    // Get single record
    async get(req, res, next) {
        try {
            const record = await this.model.findByPk(req.params.id);
            if (!record) {
                throw ErrorFactory.create('notFound', `${this.model.name} no encontrado`);
            }
            return res.sendSuccess(record);
        } catch (error) {
            next(error);
        }
    }

    // Create record
    async create(req, res, next) {
        try {
            const record = await this.model.create(req.body);
            return res.sendCreated(record);
        } catch (error) {
            next(error);
        }
    }

    // Update record
    async update(req, res, next) {
        try {
            const record = await this.model.findByPk(req.params.id);
            if (!record) {
                throw ErrorFactory.create('notFound', `${this.model.name} no encontrado`);
            }
            await record.update(req.body);
            return res.sendSuccess(record);
        } catch (error) {
            next(error);
        }
    }

    // Delete record
    async delete(req, res, next) {
        try {
            const record = await this.model.findByPk(req.params.id);
            if (!record) {
                throw ErrorFactory.create('notFound', `${this.model.name} no encontrado`);
            }
            await record.destroy();
            return res.sendSuccess({ message: 'Registro eliminado exitosamente' });
        } catch (error) {
            next(error);
        }
    }
}

class BookController extends BaseController {
    constructor() {
        super(models.Book);
        this.searchService = new searchService(models.Book)
            .setSearchableFields(['title', 'author', 'isbn', 'category'])
            .setSortableFields(['title', 'author', 'publicationYear'])
            .setRelationFields({
                loans: {
                    model: models.Loan,
                    as: 'loans'
                }
            });
    }

    // Search books
    async search(req, res, next) {
        try {
            const result = await this.searchService.search(req.query);
            return res.sendSuccess(result);
        } catch (error) {
            next(error);
        }
    }

    // Import books
    async import(req, res, next) {
        try {
            const importService = require('./imports');
            const result = await importService.processCSV(req.file.path, {
                type: 'books',
                validateOnly: false
            });
            return res.sendSuccess(result);
        } catch (error) {
            next(error);
        }
    }

    // Export books
    async export(req, res, next) {
        try {
            const books = await this.model.findAll();
            const result = await exportService.toExcel(books, {
                filename: 'books-export.xlsx'
            });
            return res.sendSuccess(result);
        } catch (error) {
            next(error);
        }
    }
}

class LoanController extends BaseController {
    constructor() {
        super(models.Loan);
    }

    // Create loan
    async create(req, res, next) {
        try {
            const { userId, bookId, dueDate } = req.body;

            // Check book availability
            const book = await models.Book.findByPk(bookId);
            if (!book || book.status !== BookStatus.AVAILABLE || book.availableQuantity < 1) {
                throw ErrorFactory.create('business', 'Libro no disponible');
            }

            // Create loan and update book quantity
            const result = await models.sequelize.transaction(async (t) => {
                const loan = await this.model.create({
                    userId,
                    bookId,
                    dueDate,
                    status: LoanStatus.ACTIVE
                }, { transaction: t });

                await book.update({
                    availableQuantity: book.availableQuantity - 1,
                    status: book.availableQuantity === 1 ? BookStatus.UNAVAILABLE : BookStatus.AVAILABLE
                }, { transaction: t });

                return loan;
            });

            return res.sendCreated(result);
        } catch (error) {
            next(error);
        }
    }

    // Return book
    async return(req, res, next) {
        try {
            const loan = await this.model.findByPk(req.params.id, {
                include: [{ model: models.Book, as: 'book' }]
            });

            if (!loan) {
                throw ErrorFactory.create('notFound', 'Préstamo no encontrado');
            }

            if (loan.status === LoanStatus.RETURNED) {
                throw ErrorFactory.create('business', 'El libro ya fue devuelto');
            }

            // Return book and update quantities
            const result = await models.sequelize.transaction(async (t) => {
                await loan.update({
                    status: LoanStatus.RETURNED,
                    returnDate: new Date()
                }, { transaction: t });

                await loan.book.update({
                    availableQuantity: loan.book.availableQuantity + 1,
                    status: BookStatus.AVAILABLE
                }, { transaction: t });

                return loan;
            });

            return res.sendSuccess(result);
        } catch (error) {
            next(error);
        }
    }

    // Extend loan
    async extend(req, res, next) {
        try {
            const loan = await this.model.findByPk(req.params.id);
            if (!loan) {
                throw ErrorFactory.create('notFound', 'Préstamo no encontrado');
            }

            if (loan.status !== LoanStatus.ACTIVE) {
                throw ErrorFactory.create('business', 'No se puede extender este préstamo');
            }

            // Extend due date by 7 days
            const newDueDate = new Date(loan.dueDate);
            newDueDate.setDate(newDueDate.getDate() + 7);

            await loan.update({ dueDate: newDueDate });
            return res.sendSuccess(loan);
        } catch (error) {
            next(error);
        }
    }

    // List overdue loans
    async listOverdue(req, res, next) {
        try {
            const loans = await this.model.findAll({
                where: {
                    status: LoanStatus.ACTIVE,
                    dueDate: {
                        [Op.lt]: new Date()
                    }
                },
                include: [
                    { model: models.User, as: 'user' },
                    { model: models.Book, as: 'book' }
                ]
            });

            return res.sendSuccess(loans);
        } catch (error) {
            next(error);
        }
    }
}

class UserController extends BaseController {
    constructor() {
        super(models.User);
    }

    // Get user loans
    async getLoans(req, res, next) {
        try {
            const loans = await models.Loan.findAll({
                where: { userId: req.params.id },
                include: [{ model: models.Book, as: 'book' }]
            });

            return res.sendSuccess(loans);
        } catch (error) {
            next(error);
        }
    }
}

// Export controllers
module.exports = {
    BookController: new BookController(),
    LoanController: new LoanController(),
    UserController: new UserController()
};