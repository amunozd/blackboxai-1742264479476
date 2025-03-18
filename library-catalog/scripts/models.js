const { Model, DataTypes } = require('sequelize');
const { logger } = require('./logger');
const { UserRoles, BookStatus, LoanStatus } = require('./constants');

// Base model with common functionality
class BaseModel extends Model {
    static init(sequelize, options = {}) {
        super.init(this.schema, {
            sequelize,
            modelName: this.name,
            ...options
        });
        return this;
    }
}

// User model
class User extends BaseModel {
    static schema = {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                len: [3, 20]
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        fullName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM(Object.values(UserRoles)),
            allowNull: false,
            defaultValue: UserRoles.STUDENT
        },
        active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        lastLogin: {
            type: DataTypes.DATE
        }
    };

    static associate(models) {
        this.hasMany(models.Loan, {
            foreignKey: 'userId',
            as: 'loans'
        });
    }
}

// Book model
class Book extends BaseModel {
    static schema = {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        author: {
            type: DataTypes.STRING,
            allowNull: false
        },
        isbn: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isISBN: true
            }
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false
        },
        publisher: {
            type: DataTypes.STRING
        },
        publicationYear: {
            type: DataTypes.INTEGER,
            validate: {
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
            type: DataTypes.TEXT
        },
        coverUrl: {
            type: DataTypes.STRING
        },
        coverImage: {
            type: DataTypes.BLOB('long')
        },
        status: {
            type: DataTypes.ENUM(Object.values(BookStatus)),
            allowNull: false,
            defaultValue: BookStatus.AVAILABLE
        }
    };

    static associate(models) {
        this.hasMany(models.Loan, {
            foreignKey: 'bookId',
            as: 'loans'
        });
    }
}

// Loan model
class Loan extends BaseModel {
    static schema = {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        bookId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'books',
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
            allowNull: false
        },
        returnDate: {
            type: DataTypes.DATE
        },
        status: {
            type: DataTypes.ENUM(Object.values(LoanStatus)),
            allowNull: false,
            defaultValue: LoanStatus.ACTIVE
        },
        notes: {
            type: DataTypes.TEXT
        }
    };

    static associate(models) {
        this.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
        this.belongsTo(models.Book, {
            foreignKey: 'bookId',
            as: 'book'
        });
    }
}

// Session model
class Session extends BaseModel {
    static schema = {
        sid: {
            type: DataTypes.STRING(36),
            primaryKey: true
        },
        expires: {
            type: DataTypes.DATE,
            allowNull: false
        },
        data: {
            type: DataTypes.TEXT
        }
    };
}

// Model registry
const models = {
    User,
    Book,
    Loan,
    Session
};

// Initialize models
async function initializeModels(sequelize) {
    try {
        // Initialize each model
        Object.values(models).forEach(model => {
            model.init(sequelize);
        });

        // Set up associations
        Object.values(models).forEach(model => {
            if (typeof model.associate === 'function') {
                model.associate(models);
            }
        });

        logger.info('Models initialized successfully');
    } catch (error) {
        logger.error('Error initializing models:', error);
        throw error;
    }
}

module.exports = {
    models,
    initializeModels,
    User,
    Book,
    Loan,
    Session
};