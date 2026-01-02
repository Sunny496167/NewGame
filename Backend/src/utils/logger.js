/**
 * Custom Logger utility for consistent logging
 * Supports different log levels and formatted output
 */

const LOG_LEVELS = {
    ERROR: "ERROR",
    WARN: "WARN",
    INFO: "INFO",
    DEBUG: "DEBUG",
};

const COLORS = {
    ERROR: "\x1b[31m", // Red
    WARN: "\x1b[33m", // Yellow
    INFO: "\x1b[36m", // Cyan
    DEBUG: "\x1b[35m", // Magenta
    RESET: "\x1b[0m",
};

class Logger {
    constructor() {
        this.isDevelopment = process.env.NODE_ENV !== "production";
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const color = COLORS[level] || COLORS.RESET;
        const reset = COLORS.RESET;

        const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : "";

        return `${color}[${timestamp}] [${level}]${reset} ${message} ${metaString}`;
    }

    error(message, error = null) {
        const meta = error ? { error: error.message, stack: error.stack } : {};
        console.error(this.formatMessage(LOG_LEVELS.ERROR, message, meta));
    }

    warn(message, meta = {}) {
        console.warn(this.formatMessage(LOG_LEVELS.WARN, message, meta));
    }

    info(message, meta = {}) {
        console.info(this.formatMessage(LOG_LEVELS.INFO, message, meta));
    }

    debug(message, meta = {}) {
        if (this.isDevelopment) {
            console.debug(this.formatMessage(LOG_LEVELS.DEBUG, message, meta));
        }
    }

    // HTTP request logger
    logRequest(req) {
        this.info(`${req.method} ${req.originalUrl}`, {
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
    }

    // HTTP response logger
    logResponse(req, res, duration) {
        const level = res.statusCode >= 400 ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO;
        const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;

        if (level === LOG_LEVELS.ERROR) {
            this.error(message);
        } else {
            this.info(message);
        }
    }
}

export default new Logger();
