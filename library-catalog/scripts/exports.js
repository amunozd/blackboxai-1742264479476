const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');
const Utils = require('./utils');

class ExportService {
    constructor() {
        this.exportDir = path.join(__dirname, '../public/exports');
        Utils.ensureDirectoryExists(this.exportDir);
    }

    // Generate unique filename
    generateFilename(prefix, extension) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${prefix}-${timestamp}${extension}`;
    }

    // Export to Excel
    async toExcel(data, options = {}) {
        const {
            filename = this.generateFilename('export', '.xlsx'),
            sheets = [{ name: 'Sheet1', data }],
            columns = null
        } = options;

        try {
            const workbook = new ExcelJS.Workbook();
            const filepath = path.join(this.exportDir, filename);

            sheets.forEach(sheet => {
                const worksheet = workbook.addWorksheet(sheet.name);

                // Set columns if provided
                if (columns) {
                    worksheet.columns = columns;
                } else if (sheet.data.length > 0) {
                    // Auto-generate columns from data
                    worksheet.columns = Object.keys(sheet.data[0]).map(key => ({
                        header: key,
                        key: key,
                        width: 15
                    }));
                }

                // Add data
                worksheet.addRows(sheet.data);

                // Style the header row
                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE0E0E0' }
                };
            });

            await workbook.xlsx.writeFile(filepath);
            logger.info(`Excel file created: ${filename}`);

            return {
                filename,
                filepath,
                url: `/exports/${filename}`
            };
        } catch (error) {
            logger.error('Error exporting to Excel:', error);
            throw error;
        }
    }

    // Export to PDF
    async toPDF(data, options = {}) {
        const {
            filename = this.generateFilename('export', '.pdf'),
            title = 'Report',
            subtitle = '',
            orientation = 'portrait'
        } = options;

        try {
            const filepath = path.join(this.exportDir, filename);
            const doc = new PDFDocument({
                size: 'A4',
                layout: orientation,
                margins: { top: 50, bottom: 50, left: 50, right: 50 }
            });

            // Pipe output to file
            doc.pipe(fs.createWriteStream(filepath));

            // Add title
            doc.fontSize(20)
               .text(title, { align: 'center' });

            // Add subtitle if provided
            if (subtitle) {
                doc.moveDown()
                   .fontSize(14)
                   .text(subtitle, { align: 'center' });
            }

            // Add timestamp
            doc.moveDown()
               .fontSize(10)
               .text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });

            // Add content
            doc.moveDown()
               .fontSize(12);

            if (Array.isArray(data)) {
                // Handle array of objects
                data.forEach((item, index) => {
                    doc.moveDown()
                       .text(`${index + 1}. ${JSON.stringify(item, null, 2)}`);
                });
            } else if (typeof data === 'object') {
                // Handle single object
                Object.entries(data).forEach(([key, value]) => {
                    doc.moveDown()
                       .text(`${key}: ${JSON.stringify(value, null, 2)}`);
                });
            } else {
                // Handle other types
                doc.text(data.toString());
            }

            // Finalize PDF
            doc.end();

            logger.info(`PDF file created: ${filename}`);

            return {
                filename,
                filepath,
                url: `/exports/${filename}`
            };
        } catch (error) {
            logger.error('Error exporting to PDF:', error);
            throw error;
        }
    }

    // Export to CSV
    async toCSV(data, options = {}) {
        const {
            filename = this.generateFilename('export', '.csv'),
            delimiter = ',',
            headers = null
        } = options;

        try {
            const filepath = path.join(this.exportDir, filename);
            let csvContent = '';

            // Add headers
            if (headers) {
                csvContent += headers.join(delimiter) + '\n';
            } else if (data.length > 0) {
                csvContent += Object.keys(data[0]).join(delimiter) + '\n';
            }

            // Add data rows
            data.forEach(row => {
                const values = headers 
                    ? headers.map(header => row[header] || '')
                    : Object.values(row);
                
                csvContent += values
                    .map(value => {
                        // Handle values with delimiters or newlines
                        if (typeof value === 'string' && 
                            (value.includes(delimiter) || value.includes('\n'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    })
                    .join(delimiter) + '\n';
            });

            fs.writeFileSync(filepath, csvContent);
            logger.info(`CSV file created: ${filename}`);

            return {
                filename,
                filepath,
                url: `/exports/${filename}`
            };
        } catch (error) {
            logger.error('Error exporting to CSV:', error);
            throw error;
        }
    }

    // Clean old export files
    async cleanOldExports(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
        try {
            const files = await fs.promises.readdir(this.exportDir);
            const now = Date.now();
            let deletedCount = 0;

            for (const file of files) {
                const filepath = path.join(this.exportDir, file);
                const stats = await fs.promises.stat(filepath);

                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.promises.unlink(filepath);
                    deletedCount++;
                }
            }

            logger.info(`Cleaned up ${deletedCount} old export files`);
        } catch (error) {
            logger.error('Error cleaning old exports:', error);
        }
    }
}

module.exports = new ExportService();