const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

class ThemeService {
    constructor() {
        this.themes = {};
        this.defaultTheme = 'light';
        this.themesDir = path.join(__dirname, '../public/css/themes');
        this.loadedThemes = new Set();

        // Ensure themes directory exists
        if (!fs.existsSync(this.themesDir)) {
            fs.mkdirSync(this.themesDir, { recursive: true });
        }

        // Load default themes
        this.loadTheme('light');
        this.loadTheme('dark');
    }

    // Load theme configuration
    loadTheme(themeName) {
        try {
            const filePath = path.join(this.themesDir, `${themeName}.json`);
            if (!fs.existsSync(filePath)) {
                logger.warn(`Theme file not found: ${themeName}`);
                return false;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            this.themes[themeName] = JSON.parse(content);
            this.loadedThemes.add(themeName);
            logger.info(`Loaded theme: ${themeName}`);
            return true;
        } catch (error) {
            logger.error(`Error loading theme ${themeName}:`, error);
            return false;
        }
    }

    // Get theme variables
    getThemeVariables(themeName = this.defaultTheme) {
        if (!this.loadedThemes.has(themeName)) {
            this.loadTheme(themeName);
        }

        return this.themes[themeName] || this.themes[this.defaultTheme];
    }

    // Generate CSS variables
    generateCSSVariables(themeName = this.defaultTheme) {
        const theme = this.getThemeVariables(themeName);
        let css = ':root {\n';

        // Add theme variables
        Object.entries(theme).forEach(([key, value]) => {
            if (typeof value === 'object') {
                Object.entries(value).forEach(([subKey, subValue]) => {
                    css += `  --${key}-${subKey}: ${subValue};\n`;
                });
            } else {
                css += `  --${key}: ${value};\n`;
            }
        });

        css += '}';
        return css;
    }

    // Generate theme stylesheet
    generateThemeStylesheet(themeName = this.defaultTheme) {
        const theme = this.getThemeVariables(themeName);
        let css = this.generateCSSVariables(themeName);

        // Add dark mode support
        if (themeName === 'dark') {
            css = '@media (prefers-color-scheme: dark) {\n' + css + '\n}';
        }

        // Add theme-specific styles
        css += `\n\n[data-theme="${themeName}"] {\n`;
        Object.entries(theme).forEach(([key, value]) => {
            if (typeof value === 'object') {
                Object.entries(value).forEach(([subKey, subValue]) => {
                    css += `  --${key}-${subKey}: ${subValue};\n`;
                });
            } else {
                css += `  --${key}: ${value};\n`;
            }
        });
        css += '}';

        return css;
    }

    // Save theme stylesheet
    saveThemeStylesheet(themeName, css) {
        try {
            const filePath = path.join(this.themesDir, `${themeName}.css`);
            fs.writeFileSync(filePath, css);
            logger.info(`Saved theme stylesheet: ${themeName}`);
            return true;
        } catch (error) {
            logger.error(`Error saving theme stylesheet ${themeName}:`, error);
            return false;
        }
    }

    // Add new theme
    addTheme(themeName, variables) {
        try {
            const filePath = path.join(this.themesDir, `${themeName}.json`);
            fs.writeFileSync(filePath, JSON.stringify(variables, null, 2));
            this.themes[themeName] = variables;
            this.loadedThemes.add(themeName);

            // Generate and save CSS
            const css = this.generateThemeStylesheet(themeName);
            this.saveThemeStylesheet(themeName, css);

            logger.info(`Added new theme: ${themeName}`);
            return true;
        } catch (error) {
            logger.error(`Error adding theme ${themeName}:`, error);
            return false;
        }
    }

    // Get available themes
    getAvailableThemes() {
        try {
            return fs.readdirSync(this.themesDir)
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', ''));
        } catch (error) {
            logger.error('Error getting available themes:', error);
            return [];
        }
    }

    // Set default theme
    setDefaultTheme(themeName) {
        if (this.loadTheme(themeName)) {
            this.defaultTheme = themeName;
            return true;
        }
        return false;
    }

    // Get theme middleware
    middleware() {
        return (req, res, next) => {
            // Get theme from query, cookie, or default
            const theme = req.query.theme || 
                         req.cookies.theme || 
                         this.defaultTheme;

            // Set theme for request
            req.theme = theme;

            // Add theme helper to response locals
            res.locals.theme = theme;
            res.locals.themes = this.getAvailableThemes();
            res.locals.getThemeVariables = (themeName) => 
                this.getThemeVariables(themeName);

            next();
        };
    }
}

// Create theme service instance
const themeService = new ThemeService();

// Export theme service
module.exports = themeService;