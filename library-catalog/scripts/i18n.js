const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

class I18nService {
    constructor() {
        this.translations = {};
        this.defaultLocale = 'es';
        this.fallbackLocale = 'es';
        this.loadedLocales = new Set();
        this.localesDir = path.join(__dirname, '../locales');

        // Ensure locales directory exists
        if (!fs.existsSync(this.localesDir)) {
            fs.mkdirSync(this.localesDir, { recursive: true });
        }

        // Load default locale
        this.loadLocale(this.defaultLocale);
    }

    // Load locale translations
    loadLocale(locale) {
        try {
            const filePath = path.join(this.localesDir, `${locale}.json`);
            if (!fs.existsSync(filePath)) {
                logger.warn(`Translation file not found for locale: ${locale}`);
                return false;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            this.translations[locale] = JSON.parse(content);
            this.loadedLocales.add(locale);
            logger.info(`Loaded translations for locale: ${locale}`);
            return true;
        } catch (error) {
            logger.error(`Error loading translations for locale ${locale}:`, error);
            return false;
        }
    }

    // Get translation
    translate(key, locale = this.defaultLocale, params = {}) {
        // Load locale if not loaded
        if (!this.loadedLocales.has(locale)) {
            this.loadLocale(locale);
        }

        // Get translation
        let translation = this.getNestedTranslation(
            this.translations[locale] || {},
            key
        );

        // Fallback to default locale if translation not found
        if (!translation && locale !== this.fallbackLocale) {
            translation = this.getNestedTranslation(
                this.translations[this.fallbackLocale] || {},
                key
            );
        }

        // Return key if translation not found
        if (!translation) {
            logger.warn(`Translation not found for key: ${key} (${locale})`);
            return key;
        }

        // Replace parameters
        return this.replaceParams(translation, params);
    }

    // Get nested translation
    getNestedTranslation(translations, key) {
        return key.split('.').reduce((obj, k) => obj && obj[k], translations);
    }

    // Replace parameters in translation
    replaceParams(text, params) {
        return text.replace(/\{(\w+)\}/g, (match, key) => {
            return params.hasOwnProperty(key) ? params[key] : match;
        });
    }

    // Add translation
    addTranslation(locale, key, value) {
        try {
            // Load locale if not loaded
            if (!this.loadedLocales.has(locale)) {
                this.loadLocale(locale);
            }

            // Initialize locale object if needed
            if (!this.translations[locale]) {
                this.translations[locale] = {};
            }

            // Set nested translation
            const keys = key.split('.');
            let current = this.translations[locale];
            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = current[keys[i]] || {};
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;

            // Save to file
            this.saveTranslations(locale);
            return true;
        } catch (error) {
            logger.error(`Error adding translation for ${locale}.${key}:`, error);
            return false;
        }
    }

    // Save translations to file
    saveTranslations(locale) {
        try {
            const filePath = path.join(this.localesDir, `${locale}.json`);
            fs.writeFileSync(
                filePath,
                JSON.stringify(this.translations[locale], null, 2),
                'utf8'
            );
            logger.info(`Saved translations for locale: ${locale}`);
            return true;
        } catch (error) {
            logger.error(`Error saving translations for ${locale}:`, error);
            return false;
        }
    }

    // Get available locales
    getAvailableLocales() {
        try {
            return fs.readdirSync(this.localesDir)
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', ''));
        } catch (error) {
            logger.error('Error getting available locales:', error);
            return [];
        }
    }

    // Set default locale
    setDefaultLocale(locale) {
        if (this.loadLocale(locale)) {
            this.defaultLocale = locale;
            return true;
        }
        return false;
    }

    // Format date
    formatDate(date, locale = this.defaultLocale, options = {}) {
        try {
            return new Date(date).toLocaleDateString(locale, options);
        } catch (error) {
            logger.error(`Error formatting date for locale ${locale}:`, error);
            return date.toString();
        }
    }

    // Format number
    formatNumber(number, locale = this.defaultLocale, options = {}) {
        try {
            return new Intl.NumberFormat(locale, options).format(number);
        } catch (error) {
            logger.error(`Error formatting number for locale ${locale}:`, error);
            return number.toString();
        }
    }

    // Format currency
    formatCurrency(amount, currency = 'MXN', locale = this.defaultLocale) {
        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currency
            }).format(amount);
        } catch (error) {
            logger.error(`Error formatting currency for locale ${locale}:`, error);
            return amount.toString();
        }
    }

    // Get middleware
    middleware() {
        return (req, res, next) => {
            // Get locale from query, cookie, or header
            const locale = req.query.locale || 
                          req.cookies.locale || 
                          req.acceptsLanguages(this.getAvailableLocales()) ||
                          this.defaultLocale;

            // Set locale for request
            req.locale = locale;

            // Add translation helper to response locals
            res.locals.t = (key, params = {}) => 
                this.translate(key, locale, params);
            res.locals.formatDate = (date, options = {}) => 
                this.formatDate(date, locale, options);
            res.locals.formatNumber = (number, options = {}) => 
                this.formatNumber(number, locale, options);
            res.locals.formatCurrency = (amount, currency = 'MXN') => 
                this.formatCurrency(amount, currency, locale);

            next();
        };
    }
}

// Create i18n service instance
const i18n = new I18nService();

// Export i18n service
module.exports = i18n;