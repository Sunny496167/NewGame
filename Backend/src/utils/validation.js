import ApiError from "../utils/ApiError.js";

/**
 * Input validation utilities
 */

export const validateEmail = (email) => {
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email || !emailRegex.test(email)) {
        throw ApiError.badRequest("Please provide a valid email address");
    }
    return true;
};

export const validatePassword = (password) => {
    if (!password || password.length < 8) {
        throw ApiError.badRequest("Password must be at least 8 characters long");
    }

    // Check for at least one uppercase, one lowercase, one number, and one special character
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
        throw ApiError.badRequest(
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
        );
    }

    return true;
};

export const validateUsername = (username) => {
    if (!username || username.length < 3 || username.length > 30) {
        throw ApiError.badRequest("Username must be between 3 and 30 characters");
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        throw ApiError.badRequest("Username can only contain letters, numbers, and underscores");
    }

    return true;
};

export const validateRegistrationInput = (data) => {
    const errors = [];

    try {
        validateEmail(data.email);
    } catch (error) {
        errors.push({ field: "email", message: error.message });
    }

    try {
        validateUsername(data.username);
    } catch (error) {
        errors.push({ field: "username", message: error.message });
    }

    try {
        validatePassword(data.password);
    } catch (error) {
        errors.push({ field: "password", message: error.message });
    }

    if (errors.length > 0) {
        throw ApiError.unprocessableEntity("Validation failed", errors);
    }

    return true;
};

export const validateLoginInput = (data) => {
    const errors = [];

    if (!data.email && !data.username) {
        errors.push({ field: "identifier", message: "Email or username is required" });
    }

    if (!data.password) {
        errors.push({ field: "password", message: "Password is required" });
    }

    if (errors.length > 0) {
        throw ApiError.unprocessableEntity("Validation failed", errors);
    }

    return true;
};
