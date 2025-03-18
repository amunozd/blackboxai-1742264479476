const NodeCache = require('node-cache');
const { logger } = require('./logger');
const { metricsService } = require('./metrics');

class CacheService {
    constructor() {
        // Initialize cache with default settings
        this.cache = new NodeCache({
            stdTTL: 600, // 10 minutes
            checkperiod: 120, // Check for expired keys every 2 minutes
            useClones: false // Store/retrieve references to objects
        });

        // Setup cache events
        this.setupEvents();
    }

    // Setup cache events
    setupEvents() {
        this.cache.on('set', (key, value) => {
            logger.debug('Cache set:', { key });
        });

        this.cache.on('del', (key, value) => {
            logger.debug('Cache delete:', { key });
        });

        this.cache.on('expired', (key, value) => {
            logger.debug('Cache expired:', { key });
        });

        this.cache.on('flush', () => {
            logger.debug('Cache flushed');
        });
    }

    // Get value from cache
    get(key) {
        try {
            const value = this.cache.get(key);
            metricsService.trackCacheActivity(value !== undefined);
            return value;
        } catch (error) {
            logger.error('Error getting from cache:', error);
            return undefined;
        }
    }

    // Set value in cache
    set(key, value, ttl = 600) {
        try {
            return this.cache.set(key, value, ttl);
        } catch (error) {
            logger.error('Error setting cache:', error);
            return false;
        }
    }

    // Delete value from cache
    delete(key) {
        try {
            return this.cache.del(key);
        } catch (error) {
            logger.error('Error deleting from cache:', error);
            return false;
        }
    }

    // Clear all cache
    clear() {
        try {
            return this.cache.flushAll();
        } catch (error) {
            logger.error('Error clearing cache:', error);
            return false;
        }
    }

    // Get multiple values
    getMultiple(keys) {
        try {
            const values = this.cache.mget(keys);
            keys.forEach(key => {
                metricsService.trackCacheActivity(values[key] !== undefined);
            });
            return values;
        } catch (error) {
            logger.error('Error getting multiple from cache:', error);
            return {};
        }
    }

    // Set multiple values
    setMultiple(keyValuePairs, ttl = 600) {
        try {
            return this.cache.mset(
                Object.entries(keyValuePairs).map(([key, value]) => ({
                    key,
                    val: value,
                    ttl
                }))
            );
        } catch (error) {
            logger.error('Error setting multiple to cache:', error);
            return false;
        }
    }

    // Delete multiple values
    deleteMultiple(keys) {
        try {
            return this.cache.del(keys);
        } catch (error) {
            logger.error('Error deleting multiple from cache:', error);
            return false;
        }
    }

    // Check if key exists
    has(key) {
        try {
            return this.cache.has(key);
        } catch (error) {
            logger.error('Error checking cache key:', error);
            return false;
        }
    }

    // Get cache keys
    keys() {
        try {
            return this.cache.keys();
        } catch (error) {
            logger.error('Error getting cache keys:', error);
            return [];
        }
    }

    // Get cache statistics
    getStats() {
        try {
            return this.cache.getStats();
        } catch (error) {
            logger.error('Error getting cache stats:', error);
            return {};
        }
    }

    // Get or set cache value
    async getOrSet(key, callback, ttl = 600) {
        try {
            let value = this.get(key);
            
            if (value === undefined) {
                value = await callback();
                this.set(key, value, ttl);
                metricsService.trackCacheActivity(false);
            } else {
                metricsService.trackCacheActivity(true);
            }

            return value;
        } catch (error) {
            logger.error('Error in getOrSet:', error);
            throw error;
        }
    }

    // Cache decorator for class methods
    static cacheMethod(ttl = 600) {
        return function(target, propertyKey, descriptor) {
            const originalMethod = descriptor.value;

            descriptor.value = async function(...args) {
                const key = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
                
                return await cacheService.getOrSet(
                    key,
                    () => originalMethod.apply(this, args),
                    ttl
                );
            };

            return descriptor;
        };
    }

    // Cache middleware for routes
    middleware(ttl = 600) {
        return async (req, res, next) => {
            if (req.method !== 'GET') {
                return next();
            }

            const key = `route:${req.originalUrl || req.url}`;
            
            try {
                const cachedResponse = this.get(key);

                if (cachedResponse) {
                    return res.json(cachedResponse);
                }

                // Store original res.json method
                const originalJson = res.json.bind(res);

                // Override res.json method
                res.json = (body) => {
                    // Cache the response
                    this.set(key, body, ttl);
                    // Call original res.json
                    return originalJson(body);
                };

                next();
            } catch (error) {
                logger.error('Error in cache middleware:', error);
                next();
            }
        };
    }

    // Clear cache by pattern
    clearByPattern(pattern) {
        try {
            const keys = this.keys();
            const regex = new RegExp(pattern);
            const matchingKeys = keys.filter(key => regex.test(key));
            return this.deleteMultiple(matchingKeys);
        } catch (error) {
            logger.error('Error clearing cache by pattern:', error);
            return false;
        }
    }

    // Set cache with tags
    setWithTags(key, value, tags = [], ttl = 600) {
        try {
            // Store the value
            this.set(key, value, ttl);

            // Store tags
            tags.forEach(tag => {
                const tagKey = `tag:${tag}`;
                const taggedKeys = this.get(tagKey) || [];
                if (!taggedKeys.includes(key)) {
                    taggedKeys.push(key);
                    this.set(tagKey, taggedKeys, ttl);
                }
            });

            return true;
        } catch (error) {
            logger.error('Error setting cache with tags:', error);
            return false;
        }
    }

    // Clear cache by tag
    clearByTag(tag) {
        try {
            const tagKey = `tag:${tag}`;
            const taggedKeys = this.get(tagKey) || [];
            
            // Delete all tagged keys
            this.deleteMultiple(taggedKeys);
            // Delete the tag itself
            this.delete(tagKey);

            return true;
        } catch (error) {
            logger.error('Error clearing cache by tag:', error);
            return false;
        }
    }
}

// Create cache service instance
const cacheService = new CacheService();

// Export cache service
module.exports = cacheService;