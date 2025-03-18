const express = require('express');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const path = require('path');
const methodOverride = require('method-override');
const { sequelize, testConnection } = require('./config/database');
const { config } = require('./config/app');

// Import middleware
const {
    errorLogger,
    notFoundHandler,
    errorHandler,
    handleSequelizeError,
    handleRateLimitError,
    handleSessionError
} = require('./middleware/error');

const {
    loginLimiter,
    apiLimiter,
    helmetConfig,
    corsOptions,
    sessionSecurity,
    xssProtection,
    sqlInjectionProtection,
    validateRequest,
    configuredHelmet,
    configuredCors
} = require('./middleware/security');

// Import routes
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const loanRoutes = require('./routes/loans');
const userRoutes = require('./routes/users');

// Create Express app
const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(configuredHelmet);
app.use(configuredCors);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: config.session.secret,
    store: new SequelizeStore({
        db: sequelize,
        tableName: 'sessions'
    }),
    name: config.session.name,
    resave: config.session.resave,
    saveUninitialized: config.session.saveUninitialized,
    cookie: config.session.cookie
}));

// Security middleware
app.use(sessionSecurity);
app.use(xssProtection);
app.use(sqlInjectionProtection);
app.use(validateRequest);

// Rate limiting
app.use('/auth/login', loginLimiter);
app.use('/api', apiLimiter);

// Make user data available to all views
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    res.locals.userRole = req.session.userRole;
    res.locals.path = req.path;
    next();
});

// Routes
app.get('/', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    res.redirect('/books');
});

app.use('/auth', authRoutes);
app.use('/books', bookRoutes);
app.use('/loans', loanRoutes);
app.use('/users', userRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorLogger);
app.use(handleSequelizeError);
app.use(handleRateLimitError);
app.use(handleSessionError);
app.use(errorHandler);

// Start server
const PORT = config.app.port;

async function startServer() {
    try {
        // Test database connection
        await testConnection();
        
        // Start listening
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Environment: ${config.app.env}`);
            console.log(`URL: ${config.app.url}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    process.exit(1);
});

// Start the server
if (require.main === module) {
    startServer();
}

module.exports = app;