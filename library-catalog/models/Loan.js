const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Book = require('./Book');
const User = require('./User');

const Loan = sequelize.define('Loan', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    bookId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Book,
            key: 'id'
        }
    },
    loanDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    dueDate: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            isAfterLoanDate(value) {
                if (value <= this.loanDate) {
                    throw new Error('Due date must be after loan date');
                }
            }
        }
    },
    returnDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('active', 'overdue', 'returned', 'lost'),
        allowNull: false,
        defaultValue: 'active'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    hooks: {
        beforeCreate: async (loan) => {
            // Set default due date (14 days from loan date)
            if (!loan.dueDate) {
                const dueDate = new Date(loan.loanDate);
                dueDate.setDate(dueDate.getDate() + 14);
                loan.dueDate = dueDate;
            }

            // Update book availability
            const book = await Book.findByPk(loan.bookId);
            if (!book || !book.isAvailable()) {
                throw new Error('Book is not available for loan');
            }
            await book.updateQuantities('loan');
        },
        beforeUpdate: async (loan) => {
            if (loan.changed('status') && loan.status === 'returned') {
                loan.returnDate = new Date();
                const book = await Book.findByPk(loan.bookId);
                await book.updateQuantities('return');
            }
        }
    }
});

// Associations
Loan.belongsTo(User);
Loan.belongsTo(Book);
User.hasMany(Loan);
Book.hasMany(Loan);

// Instance Methods
Loan.prototype.isOverdue = function() {
    return !this.returnDate && new Date() > this.dueDate;
};

// Class Methods
Loan.findActiveLoans = async function(userId = null) {
    const where = {
        status: ['active', 'overdue']
    };
    
    if (userId) {
        where.userId = userId;
    }

    return await this.findAll({
        where,
        include: [
            { model: User, attributes: ['id', 'fullName', 'email'] },
            { model: Book, attributes: ['id', 'title', 'author', 'isbn'] }
        ],
        order: [['dueDate', 'ASC']]
    });
};

Loan.findOverdueLoans = async function() {
    return await this.findAll({
        where: {
            status: 'active',
            dueDate: {
                [sequelize.Op.lt]: new Date()
            }
        },
        include: [
            { model: User, attributes: ['id', 'fullName', 'email'] },
            { model: Book, attributes: ['id', 'title', 'author', 'isbn'] }
        ],
        order: [['dueDate', 'ASC']]
    });
};

// Update overdue loans status
Loan.updateOverdueStatus = async function() {
    const overdueLoans = await this.findAll({
        where: {
            status: 'active',
            dueDate: {
                [sequelize.Op.lt]: new Date()
            }
        }
    });

    for (const loan of overdueLoans) {
        loan.status = 'overdue';
        await loan.save();
    }
};

module.exports = Loan;