const fs = require('fs');
const path = require('path');

// Directories to create
const directories = [
    'public',
    'public/uploads',
    'public/uploads/covers',
    'public/uploads/imports',
    'public/uploads/temp',
    'logs',
    'config',
    'middleware',
    'models',
    'routes',
    'views',
    'views/auth',
    'views/books',
    'views/loans',
    'views/users',
    'migrations',
    'seeders',
    '__tests__',
    '__tests__/unit',
    '__tests__/integration'
];

// Create directories
directories.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dir}`);
    } else {
        console.log(`Directory already exists: ${dir}`);
    }
});

// Create .gitkeep files in empty directories
directories.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    const files = fs.readdirSync(dirPath);
    if (files.length === 0) {
        const gitkeepPath = path.join(dirPath, '.gitkeep');
        fs.writeFileSync(gitkeepPath, '');
        console.log(`Created .gitkeep in: ${dir}`);
    }
});

// Create public directories for static files
const publicDirs = [
    'css',
    'js',
    'img',
    'fonts'
];

publicDirs.forEach(dir => {
    const dirPath = path.join(__dirname, '..', 'public', dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created public directory: ${dir}`);
        
        // Add .gitkeep file
        const gitkeepPath = path.join(dirPath, '.gitkeep');
        fs.writeFileSync(gitkeepPath, '');
    }
});

// Add script to package.json if it doesn't exist
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = require(packageJsonPath);

if (!packageJson.scripts.init) {
    packageJson.scripts.init = 'node scripts/init.js';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Added init script to package.json');
}

console.log('\nInitialization complete! Project structure has been set up.');
console.log('\nNext steps:');
console.log('1. Run npm install to install dependencies');
console.log('2. Configure your .env file');
console.log('3. Run npm run migrate to set up the database');
console.log('4. Run npm run seed to add initial data');
console.log('5. Start the application with npm run dev\n');