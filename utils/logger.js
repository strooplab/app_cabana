// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
    format: winston.format.json(),
    transports: [
    new winston.transports.File({ filename: 'access.log' })
    ]
});

// Log todos los accesos y descargas
logger.info('Download attempt', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    version: versionId,
    timestamp: new Date()
});