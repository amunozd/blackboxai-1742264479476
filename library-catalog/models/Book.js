const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Book = sequelize.define('Book', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255]
        }
    },
    author: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255]
        }
    },
    isbn: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            len: [10, 13]
        }
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    publisher: {
        type: DataTypes.STRING,
        allowNull: true
    },
    publicationYear: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            isInt: true,
            min: 1000,
            max: new Date().getFullYear()
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
            min: 0
        }
    },
    availableQuantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
            min: 0
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    cover_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cover_image: {
        type: DataTypes.BLOB('long'),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('available', 'unavailable'),
        allowNull: false,
        defaultValue: 'available'
    }
}, {
    hooks: {
        beforeCreate: (book) => {
            if (book.availableQuantity > book.quantity) {
                book.availableQuantity = book.quantity;
            }
            book.status = book.availableQuantity > 0 ? 'available' : 'unavailable';
        },
        beforeUpdate: (book) => {
            if (book.availableQuantity > book.quantity) {
                book.availableQuantity = book.quantity;
            }
            book.status = book.availableQuantity > 0 ? 'available' : 'unavailable';
        }
    }
});

// Class method to search books
Book.searchBooks = async function(query) {
    const searchCondition = {
        [sequelize.Op.or]: [
            { title: { [sequelize.Op.like]: `%${query}%` } },
            { author: { [sequelize.Op.like]: `%${query}%` } },
            { isbn: { [sequelize.Op.like]: `%${query}%` } },
            { category: { [sequelize.Op.like]: `%${query}%` } }
        ]
    };

    return await this.findAll({
        where: searchCondition,
        order: [['title', 'ASC']]
    });
};

// Instance method to check availability
Book.prototype.isAvailable = function() {
    return this.availableQuantity > 0;
};

// Instance method to update quantities after loan/return
Book.prototype.updateQuantities = async function(action) {
    if (action === 'loan' && this.availableQuantity > 0) {
        this.availableQuantity -= 1;
    } else if (action === 'return' && this.availableQuantity < this.quantity) {
        this.availableQuantity += 1;
    }
    
    this.status = this.availableQuantity > 0 ? 'available' : 'unavailable';
    await this.save();
};

module.exports = Book;