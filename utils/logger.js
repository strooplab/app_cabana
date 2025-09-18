// utils/logger.js
import { createLogger, format as _format, transports as _transports } from 'winston';

const logger = createLogger({
    format: _format.json(),
    transports: [
    new _transports.File({ filename: 'access.log' })
    ]
});

// Log todos los accesos y descargas
logger.info('Download attempt', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    version: versionId,
    timestamp: new Date()
});