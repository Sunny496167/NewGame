import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";

/**
 * Global error handling middleware
 * Catches all errors and sends formatted responses
 */
export const errorHandler = (err, req, res, next) => {
    let error = err;

    // If error is not an instance of ApiError, convert it
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Internal server error";
        error = new ApiError(statusCode, message, [], error.stack);
    }

    // Log error
    logger.error(`Error: ${error.message}`, {
        statusCode: error.statusCode,
        path: req.path,
        method: req.method,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    // Prepare response
    const response = {
        success: false,
        message: error.message,
        statusCode: error.statusCode,
        ...(error.errors.length > 0 && { errors: error.errors }),
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    };

    res.status(error.statusCode).json(response);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res, next) => {
    const error = ApiError.notFound(`Route ${req.originalUrl} not found`);
    next(error);
};

/**
 * Mongoose validation error handler
 */
export const handleMongooseValidationError = (error) => {
    const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
    }));

    return ApiError.unprocessableEntity("Validation failed", errors);
};

/**
 * Mongoose duplicate key error handler
 */
export const handleMongooseDuplicateKeyError = (error) => {
    const field = Object.keys(error.keyPattern)[0];
    const message = `${field} already exists`;
    return ApiError.conflict(message);
};

/**
 * JWT error handler
 */
export const handleJWTError = (error) => {
    if (error.name === "JsonWebTokenError") {
        return ApiError.unauthorized("Invalid token");
    }
    if (error.name === "TokenExpiredError") {
        return ApiError.unauthorized("Token expired");
    }
    return error;
};

/**
 * Enhanced error handler with specific error type handling
 */
export const enhancedErrorHandler = (err, req, res, next) => {
    let error = err;

    // Handle specific error types
    if (error.name === "ValidationError") {
        error = handleMongooseValidationError(error);
    } else if (error.code === 11000) {
        error = handleMongooseDuplicateKeyError(error);
    } else if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
        error = handleJWTError(error);
    } else if (error.name === "CastError") {
        error = ApiError.badRequest(`Invalid ${error.path}: ${error.value}`);
    }

    // Pass to main error handler
    errorHandler(error, req, res, next);
};
