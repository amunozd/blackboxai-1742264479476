const { Op } = require('sequelize');
const { SearchConfig } = require('./constants');
const { logger } = require('./logger');

class SearchService {
    constructor(model) {
        this.model = model;
        this.searchableFields = [];
        this.relationFields = {};
        this.sortableFields = [];
        this.defaultSort = ['id', 'DESC'];
    }

    // Set searchable fields
    setSearchableFields(fields) {
        this.searchableFields = fields;
        return this;
    }

    // Set relation fields for eager loading
    setRelationFields(fields) {
        this.relationFields = fields;
        return this;
    }

    // Set sortable fields
    setSortableFields(fields) {
        this.sortableFields = fields;
        return this;
    }

    // Set default sort
    setDefaultSort(field, direction = 'DESC') {
        this.defaultSort = [field, direction.toUpperCase()];
        return this;
    }

    // Build search query
    buildSearchQuery(query, filters = {}) {
        const searchConditions = [];
        
        // Add text search conditions
        if (query && query.length >= SearchConfig.MIN_QUERY_LENGTH) {
            const searchTerms = query.split(' ').filter(term => 
                term.length >= SearchConfig.MIN_QUERY_LENGTH
            );

            searchTerms.forEach(term => {
                const termConditions = this.searchableFields.map(field => ({
                    [field]: {
                        [Op.like]: `%${term}%`
                    }
                }));
                searchConditions.push({ [Op.or]: termConditions });
            });
        }

        // Add filter conditions
        Object.entries(filters).forEach(([field, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                if (Array.isArray(value)) {
                    searchConditions.push({
                        [field]: {
                            [Op.in]: value
                        }
                    });
                } else if (typeof value === 'object') {
                    searchConditions.push({
                        [field]: value
                    });
                } else {
                    searchConditions.push({
                        [field]: value
                    });
                }
            }
        });

        return searchConditions.length > 0 
            ? { [Op.and]: searchConditions }
            : {};
    }

    // Build sort options
    buildSortOptions(sort) {
        if (!sort) {
            return [this.defaultSort];
        }

        const sortParams = sort.split(',').map(param => {
            const [field, direction] = param.split(':');
            return [
                field,
                (direction || 'DESC').toUpperCase()
            ];
        });

        return sortParams.filter(([field]) => 
            this.sortableFields.includes(field)
        );
    }

    // Build include options for relations
    buildIncludeOptions(include = []) {
        return include
            .filter(relation => this.relationFields[relation])
            .map(relation => this.relationFields[relation]);
    }

    // Perform search
    async search(options = {}) {
        const {
            query = '',
            filters = {},
            page = 1,
            limit = SearchConfig.RESULTS_PER_PAGE,
            sort = null,
            include = []
        } = options;

        try {
            const where = this.buildSearchQuery(query, filters);
            const order = this.buildSortOptions(sort);
            const includes = this.buildIncludeOptions(include);

            const offset = (page - 1) * limit;

            const { count, rows } = await this.model.findAndCountAll({
                where,
                order,
                include: includes,
                limit: Math.min(limit, SearchConfig.MAX_PAGE_SIZE),
                offset,
                distinct: true
            });

            return {
                results: rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalItems: count,
                    totalPages: Math.ceil(count / limit)
                },
                query: query || null,
                filters: Object.keys(filters).length > 0 ? filters : null
            };
        } catch (error) {
            logger.error('Search error:', error);
            throw error;
        }
    }

    // Perform faceted search
    async facetedSearch(options = {}) {
        const {
            query = '',
            filters = {},
            facets = [],
            page = 1,
            limit = SearchConfig.RESULTS_PER_PAGE
        } = options;

        try {
            const where = this.buildSearchQuery(query, filters);
            const facetResults = {};

            // Get facet counts
            for (const facet of facets) {
                if (this.searchableFields.includes(facet)) {
                    const counts = await this.model.findAll({
                        where,
                        attributes: [
                            facet,
                            [sequelize.fn('COUNT', sequelize.col(facet)), 'count']
                        ],
                        group: [facet],
                        raw: true
                    });
                    facetResults[facet] = counts;
                }
            }

            // Get search results
            const { results, pagination } = await this.search({
                query,
                filters,
                page,
                limit
            });

            return {
                results,
                pagination,
                facets: facetResults,
                query: query || null,
                filters: Object.keys(filters).length > 0 ? filters : null
            };
        } catch (error) {
            logger.error('Faceted search error:', error);
            throw error;
        }
    }

    // Perform autocomplete search
    async autocomplete(query, field, limit = 10) {
        if (!this.searchableFields.includes(field)) {
            throw new Error(`Campo ${field} no es buscable`);
        }

        try {
            const results = await this.model.findAll({
                where: {
                    [field]: {
                        [Op.like]: `${query}%`
                    }
                },
                attributes: [field],
                limit,
                group: [field],
                raw: true
            });

            return results.map(result => result[field]);
        } catch (error) {
            logger.error('Autocomplete error:', error);
            throw error;
        }
    }
}

module.exports = SearchService;