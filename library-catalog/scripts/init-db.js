const { sequelize } = require('../config/database');
const User = require('../models/User');
const Book = require('../models/Book');
const Loan = require('../models/Loan');
const bcrypt = require('bcrypt');

async function initializeDatabase() {
    try {
        // Sync database models
        console.log('Sincronizando modelos de base de datos...');
        await sequelize.sync({ force: true }); // WARNING: This will drop existing tables

        // Create default admin user
        console.log('Creando usuario administrador por defecto...');
        const adminPassword = 'admin123'; // Change this in production
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        await User.create({
            username: 'admin',
            password: hashedPassword,
            email: 'admin@biblioteca.com',
            fullName: 'Administrador del Sistema',
            role: 'bibliotecario',
            active: true
        });

        // Create some sample users
        console.log('Creando usuarios de ejemplo...');
        const users = await User.bulkCreate([
            {
                username: 'profesor1',
                password: await bcrypt.hash('profesor123', 10),
                email: 'profesor1@biblioteca.com',
                fullName: 'Juan Pérez',
                role: 'docente',
                active: true
            },
            {
                username: 'alumno1',
                password: await bcrypt.hash('alumno123', 10),
                email: 'alumno1@biblioteca.com',
                fullName: 'María García',
                role: 'alumno',
                active: true
            }
        ]);

        // Create sample books
        console.log('Creando libros de ejemplo...');
        const books = await Book.bulkCreate([
            {
                title: 'Don Quijote de la Mancha',
                author: 'Miguel de Cervantes',
                isbn: '9788424922580',
                category: 'Literatura Clásica',
                publisher: 'Editorial Ejemplo',
                publicationYear: 2020,
                quantity: 5,
                availableQuantity: 5,
                description: 'La obra cumbre de la literatura española.',
                status: 'available',
                cover_url: 'https://images.pexels.com/photos/1907785/pexels-photo-1907785.jpeg'
            },
            {
                title: 'Cien años de soledad',
                author: 'Gabriel García Márquez',
                isbn: '9780307474728',
                category: 'Literatura Contemporánea',
                publisher: 'Editorial Ejemplo',
                publicationYear: 2019,
                quantity: 3,
                availableQuantity: 3,
                description: 'La obra maestra del realismo mágico.',
                status: 'available',
                cover_url: 'https://images.pexels.com/photos/1907784/pexels-photo-1907784.jpeg'
            },
            {
                title: 'Matemáticas Avanzadas',
                author: 'John Smith',
                isbn: '9780123456789',
                category: 'Académico',
                publisher: 'Editorial Académica',
                publicationYear: 2021,
                quantity: 10,
                availableQuantity: 10,
                description: 'Manual completo de matemáticas universitarias.',
                status: 'available',
                cover_url: 'https://images.pexels.com/photos/1907783/pexels-photo-1907783.jpeg'
            }
        ]);

        // Create sample loans
        console.log('Creando préstamos de ejemplo...');
        const today = new Date();
        const futureDate = new Date(today.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days from now
        
        await Loan.create({
            userId: users[0].id, // profesor1
            bookId: books[0].id, // Don Quijote
            loanDate: today,
            dueDate: futureDate,
            status: 'active'
        });

        await Loan.create({
            userId: users[1].id, // alumno1
            bookId: books[1].id, // Cien años de soledad
            loanDate: new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000)), // 7 days ago
            dueDate: new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000)), // 7 days from now
            status: 'active'
        });

        console.log('Base de datos inicializada correctamente!');
        console.log('\nCredenciales de acceso:');
        console.log('------------------------');
        console.log('Administrador:');
        console.log('Usuario: admin');
        console.log('Contraseña: admin123');
        console.log('\nProfesor:');
        console.log('Usuario: profesor1');
        console.log('Contraseña: profesor123');
        console.log('\nAlumno:');
        console.log('Usuario: alumno1');
        console.log('Contraseña: alumno123');

    } catch (error) {
        console.error('Error al inicializar la base de datos:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// Run the initialization
initializeDatabase();