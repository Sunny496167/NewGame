import jwt from "jsonwebtoken";
import User from "../user/user.model.js";
import ApiError from "../../utils/ApiError.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";

/**
 * Verify JWT token and authenticate user
 */
export const authenticate = asyncHandler(async (req, res, next) => {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw ApiError.unauthorized("Access token is required");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        throw ApiError.unauthorized("Access token is required");
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        // Find user
        const user = await User.findById(decoded._id);

        if (!user) {
            throw ApiError.unauthorized("User not found");
        }

        if (!user.isActive) {
            throw ApiError.forbidden("Account has been deactivated");
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            throw ApiError.unauthorized("Invalid token");
        }
        if (error.name === "TokenExpiredError") {
            throw ApiError.unauthorized("Token expired");
        }
        throw error;
    }
});

/**
 * Optional authentication - doesn't throw error if no token
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next();
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        const user = await User.findById(decoded._id);

        if (user && user.isActive) {
            req.user = user;
        }
    } catch (error) {
        // Silently fail for optional auth
    }

    next();
});

/**
 * Role-based access control middleware
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw ApiError.unauthorized("Authentication required");
        }

        if (!roles.includes(req.user.role)) {
            throw ApiError.forbidden(
                `Access denied. Required role: ${roles.join(" or ")}`
            );
        }

        next();
    };
};

/**
 * Check if email is verified
 */
export const requireEmailVerification = (req, res, next) => {
    if (!req.user) {
        throw ApiError.unauthorized("Authentication required");
    }

    if (!req.user.isEmailVerified) {
        throw ApiError.forbidden(
            "Email verification required. Please verify your email to access this resource."
        );
    }

    next();
};

/**
 * Check if user owns the resource
 */
export const checkOwnership = (resourceUserIdField = "userId") => {
    return (req, res, next) => {
        if (!req.user) {
            throw ApiError.unauthorized("Authentication required");
        }

        const resourceUserId =
            req.params[resourceUserIdField] ||
            req.body[resourceUserIdField] ||
            req.query[resourceUserIdField];

        if (!resourceUserId) {
            throw ApiError.badRequest("Resource user ID not found");
        }

        // Allow if user is admin or owns the resource
        if (
            req.user.role === "admin" ||
            req.user._id.toString() === resourceUserId.toString()
        ) {
            return next();
        }

        throw ApiError.forbidden("You don't have permission to access this resource");
    };
};
