const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { logger } = require('./logger');

class Utils {
    // File system utilities
    static ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    static deleteFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
            return false;
        } catch (error) {
            logger.error('Error deleting file:', error);
            return false;
        }
    }

    static getFileExtension(filename) {
        return path.extname(filename).toLowerCase();
    }

    static getFileSize(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return stats.size;
        } catch (error) {
            logger.error('Error getting file size:', error);
            return 0;
        }
    }

    // String utilities
    static generateRandomString(length = 32) {
        return crypto
            .randomBytes(Math.ceil(length / 2))
            .toString('hex')
            .slice(0, length);
    }

    static slugify(text) {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-');
    }

    static truncate(str, length = 100, ending = '...') {
        if (str.length > length) {
            return str.substring(0, length - ending.length) + ending;
        }
        return str;
    }

    static capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Date utilities
    static formatDate(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    static isWeekend(date) {
        const day = date.getDay();
        return day === 0 || day === 6;
    }

    static getDaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Validation utilities
    static validateEmail(email) {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(email);
    }

    static validatePassword(password) {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return re.test(password);
    }

    static validateISBN(isbn) {
        // Remove hyphens and spaces
        isbn = isbn.replace(/[-\s]/g, '');

        // Check for ISBN-10 or ISBN-13
        if (isbn.length === 10) {
            return this.validateISBN10(isbn);
        } else if (isbn.length === 13) {
            return this.validateISBN13(isbn);
        }
        return false;
    }

    static validateISBN10(isbn) {
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += (10 - i) * parseInt(isbn.charAt(i));
        }
        const lastChar = isbn.charAt(9);
        const checksum = (lastChar.toLowerCase() === 'x') ? 10 : parseInt(lastChar);
        sum += checksum;
        return sum % 11 === 0;
    }

    static validateISBN13(isbn) {
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += (i % 2 === 0 ? 1 : 3) * parseInt(isbn.charAt(i));
        }
        const checksum = (10 - (sum % 10)) % 10;
        return checksum === parseInt(isbn.charAt(12));
    }

    // Object utilities
    static omit(obj, keys) {
        const result = { ...obj };
        keys.forEach(key => delete result[key]);
        return result;
    }

    static pick(obj, keys) {
        return keys.reduce((acc, key) => {
            if (obj.hasOwnProperty(key)) {
                acc[key] = obj[key];
            }
            return acc;
        }, {});
    }

    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    static mergeDeep(target, source) {
        const isObject = (obj) => obj && typeof obj === 'object';
        
        if (!isObject(target) || !isObject(source)) {
            return source;
        }

        Object.keys(source).forEach(key => {
            const targetValue = target[key];
            const sourceValue = source[key];

            if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
                target[key] = targetValue.concat(sourceValue);
            } else if (isObject(targetValue) && isObject(sourceValue)) {
                target[key] = this.mergeDeep(Object.assign({}, targetValue), sourceValue);
            } else {
                target[key] = sourceValue;
            }
        });

        return target;
    }

    // Array utilities
    static chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    static unique(array) {
        return [...new Set(array)];
    }

    static groupBy(array, key) {
        return array.reduce((acc, item) => {
            const group = item[key];
            acc[group] = acc[group] || [];
            acc[group].push(item);
            return acc;
        }, {});
    }

    // Number utilities
    static formatNumber(number, decimals = 2) {
        return Number(number).toFixed(decimals);
    }

    static formatCurrency(amount, currency = 'MXN') {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    static randomInteger(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Security utilities
    static hashPassword(password) {
        return crypto
            .createHash('sha256')
            .update(password)
            .digest('hex');
    }

    static generateToken() {
        return crypto
            .randomBytes(32)
            .toString('hex');
    }

    static sanitizeHTML(html) {
        return html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

module.exports = Utils;