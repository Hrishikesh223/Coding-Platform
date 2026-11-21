const { createClient } = require('redis');

const redisClient = createClient({
    username: 'default',
    password: process.env.REDIS_PASS,
    socket: {
        host: 'playful-macrostylish-run-62573.db.redis.io',
        port: 11992,
        
    }
});

module.exports = redisClient;