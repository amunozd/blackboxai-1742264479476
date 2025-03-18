'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create users
    await queryInterface.bulkInsert('users', [
      {
        username: 'bibliotecario',
        password: await bcrypt.hash('biblioteca123', 10),
        email: 'bibliotecario@example.com',
        full_name: 'Bibliotecario Principal',
        role: 'bibliotecario',
        active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        username: 'docente',
        password: await bcrypt.hash('docente123', 10),
        email: 'docente@example.com',
        full_name: 'Docente Demo',
        role: 'docente',
        active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        username: 'alumno',
        password: await bcrypt.hash('alumno123', 10),
        email: 'alumno@example.com',
        full_name: 'Alumno Demo',
        role: 'alumno',
        active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});

    // Create books
    await queryInterface.bulkInsert('books', [
      {
        title: 'Don Quijote de la Mancha',
        author: 'Miguel de Cervantes',
        isbn: '9788424922580',
        category: 'Literatura Clásica',
        publisher: 'Editorial Demo',
        publication_year: 1605,
        quantity: 5,
        available_quantity: 5,
        description: 'La obra cumbre de la literatura española.',
        status: 'available',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Cien años de soledad',
        author: 'Gabriel García Márquez',
        isbn: '9780307474728',
        category: 'Literatura Latinoamericana',
        publisher: 'Editorial Demo',
        publication_year: 1967,
        quantity: 3,
        available_quantity: 3,
        description: 'La saga de la familia Buendía en Macondo.',
        status: 'available',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'El principito',
        author: 'Antoine de Saint-Exupéry',
        isbn: '9788498381498',
        category: 'Literatura Infantil',
        publisher: 'Editorial Demo',
        publication_year: 1943,
        quantity: 4,
        available_quantity: 4,
        description: 'Un clásico de la literatura infantil.',
        status: 'available',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: '1984',
        author: 'George Orwell',
        isbn: '9780451524935',
        category: 'Ciencia Ficción',
        publisher: 'Editorial Demo',
        publication_year: 1949,
        quantity: 2,
        available_quantity: 2,
        description: 'Una distopía sobre el control totalitario.',
        status: 'available',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Rayuela',
        author: 'Julio Cortázar',
        isbn: '9788437604572',
        category: 'Literatura Latinoamericana',
        publisher: 'Editorial Demo',
        publication_year: 1963,
        quantity: 3,
        available_quantity: 3,
        description: 'Una novela experimental que revolucionó la narrativa.',
        status: 'available',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});

    // Create some initial loans
    const [users] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE username != "bibliotecario"'
    );
    const [books] = await queryInterface.sequelize.query(
      'SELECT id FROM books LIMIT 2'
    );

    await queryInterface.bulkInsert('loans', [
      {
        user_id: users[0].id,
        book_id: books[0].id,
        loan_date: new Date(),
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        user_id: users[1].id,
        book_id: books[1].id,
        loan_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        due_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        status: 'overdue',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});

    // Update book available quantities for loaned books
    await queryInterface.sequelize.query(
      'UPDATE books SET available_quantity = quantity - 1 WHERE id IN (:bookIds)',
      {
        replacements: { bookIds: books.map(book => book.id) }
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all seeded data
    await queryInterface.bulkDelete('loans', null, {});
    await queryInterface.bulkDelete('books', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};