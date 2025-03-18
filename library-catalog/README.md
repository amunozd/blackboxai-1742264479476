# Library Catalog System

Sistema de Catálogo de Biblioteca - A comprehensive library management system built with Node.js and Express.

## Features

- User authentication and authorization
- Book management
- Loan management
- Search functionality
- Reports generation
- Email notifications
- Internationalization support
- Theme customization
- Real-time monitoring
- Automated backups

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT, Session-based
- **Caching**: Node-Cache
- **Email**: Nodemailer
- **Logging**: Winston
- **Testing**: Jest, Supertest
- **Documentation**: JSDoc
- **Code Quality**: ESLint, Prettier

## Prerequisites

- Node.js (>= 18.0.0)
- MySQL (>= 8.0)
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd library-catalog
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`

5. Create the database:
   ```bash
   mysql -u root -p
   CREATE DATABASE library_catalog;
   ```

6. Run migrations:
   ```bash
   npm run migrate
   ```

7. Seed the database (optional):
   ```bash
   npm run seed
   ```

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Testing
```bash
npm test
```

## Project Structure

```
library-catalog/
├── config/             # Configuration files
├── locales/           # Internationalization files
├── logs/              # Application logs
├── migrations/        # Database migrations
├── public/           # Static files
├── scripts/          # Application scripts
│   ├── app.js        # Application entry point
│   ├── auth.js       # Authentication logic
│   ├── backup.js     # Backup functionality
│   ├── cache.js      # Caching logic
│   ├── constants.js  # Application constants
│   ├── controllers.js # Request handlers
│   ├── database.js   # Database configuration
│   ├── errors.js     # Error definitions
│   ├── events.js     # Event handling
│   ├── exports.js    # Export functionality
│   ├── health.js     # Health monitoring
│   ├── i18n.js       # Internationalization
│   ├── logger.js     # Logging configuration
│   ├── metrics.js    # Metrics collection
│   ├── middleware.js # Express middleware
│   ├── migrations.js # Migration handling
│   ├── models.js     # Database models
│   ├── notifications.js # Email notifications
│   ├── permissions.js # Access control
│   ├── queue.js      # Background jobs
│   ├── ratelimit.js  # Rate limiting
│   ├── routes.js     # Route definitions
│   ├── scheduler.js  # Task scheduling
│   ├── security.js   # Security measures
│   ├── session.js    # Session handling
│   ├── startup.js    # Application startup
│   ├── themes.js     # Theme management
│   ├── utils.js      # Utility functions
│   └── validators.js # Input validation
├── seeders/          # Database seeders
├── tests/            # Test files
└── views/            # Email templates

## API Documentation

API documentation is available at `/api-docs` when running in development mode.

## Available Scripts

- `npm start`: Start the application
- `npm run dev`: Start the application in development mode
- `npm test`: Run tests
- `npm run test:watch`: Run tests in watch mode
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Fix ESLint errors
- `npm run migrate`: Run database migrations
- `npm run migrate:undo`: Rollback migrations
- `npm run seed`: Run database seeders
- `npm run backup`: Create a backup
- `npm run restore`: Restore from backup
- `npm run docs`: Generate documentation

## Environment Variables

See `.env.example` for all available environment variables.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For support, email support@library-catalog.com or open an issue in the repository.