const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage for book covers
const coverStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        const bookCoversDir = path.join(uploadDir, 'covers');
        if (!fs.existsSync(bookCoversDir)) {
            fs.mkdirSync(bookCoversDir, { recursive: true });
        }
        cb(null, bookCoversDir);
    },
    filename: function(req, file, cb) {
        // Generate unique filename: timestamp-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'cover-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Configure storage for bulk imports
const importStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        const importsDir = path.join(uploadDir, 'imports');
        if (!fs.existsSync(importsDir)) {
            fs.mkdirSync(importsDir, { recursive: true });
        }
        cb(null, importsDir);
    },
    filename: function(req, file, cb) {
        // Generate unique filename: timestamp-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'import-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for images
const imageFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
        req.fileValidationError = 'Solo se permiten archivos de imagen!';
        return cb(new Error('Solo se permiten archivos de imagen!'), false);
    }
    cb(null, true);
};

// File filter for CSV imports
const csvFilter = (req, file, cb) => {
    // Accept CSV files only
    if (!file.originalname.match(/\.(csv|CSV)$/)) {
        req.fileValidationError = 'Solo se permiten archivos CSV!';
        return cb(new Error('Solo se permiten archivos CSV!'), false);
    }
    cb(null, true);
};

// Multer upload instances
const uploadBookCover = multer({
    storage: coverStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    }
}).single('cover');

const uploadBulkBooks = multer({
    storage: importStorage,
    fileFilter: csvFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    }
}).single('file');

// Middleware to handle book cover upload
const handleBookCoverUpload = (req, res, next) => {
    uploadBookCover(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    error: 'El archivo es demasiado grande. Tamaño máximo: 5MB'
                });
            }
            return res.status(400).json({
                error: 'Error al subir el archivo: ' + err.message
            });
        } else if (err) {
            // An unknown error occurred
            return res.status(400).json({
                error: err.message || 'Error al subir el archivo'
            });
        }

        // Check for file validation error
        if (req.fileValidationError) {
            return res.status(400).json({
                error: req.fileValidationError
            });
        }

        // Everything went fine
        next();
    });
};

// Middleware to handle bulk book import
const handleBulkBookUpload = (req, res, next) => {
    uploadBulkBooks(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    error: 'El archivo es demasiado grande. Tamaño máximo: 10MB'
                });
            }
            return res.status(400).json({
                error: 'Error al subir el archivo: ' + err.message
            });
        } else if (err) {
            // An unknown error occurred
            return res.status(400).json({
                error: err.message || 'Error al subir el archivo'
            });
        }

        // Check for file validation error
        if (req.fileValidationError) {
            return res.status(400).json({
                error: req.fileValidationError
            });
        }

        // Everything went fine
        next();
    });
};

// Function to delete uploaded file
const deleteUploadedFile = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Error deleting file:', err);
            }
        });
    }
};

module.exports = {
    handleBookCoverUpload,
    handleBulkBookUpload,
    deleteUploadedFile
};