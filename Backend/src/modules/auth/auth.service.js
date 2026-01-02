import User from "../user/user.model.js";
import ApiError from "../../utils/ApiError.js";
import logger from "../../utils/logger.js";
import {
    validateRegistrationInput,
    validateLoginInput,
    validateEmail,
} from "../../utils/validation.js";
import jwt from "jsonwebtoken";

/**
 * Auth Service Layer
 * Contains business logic for authentication operations
 */

class AuthService {
    /**
     * Register a new user
     */
    async register(userData) {
        try {
            // Validate input
            validateRegistrationInput(userData);

            const { email, username, password, fullName } = userData;

            // Check if user already exists
            const existingUser = await User.findOne({
                $or: [{ email }, { username }],
            });

            if (existingUser) {
                if (existingUser.email === email) {
                    throw ApiError.conflict("Email already registered");
                }
                if (existingUser.username === username) {
                    throw ApiError.conflict("Username already taken");
                }
            }

            // Create new user
            const user = await User.create({
                email,
                username,
                password,
                fullName,
            });

            // Generate email verification token
            const verificationToken = user.generateEmailVerificationToken();
            await user.save({ validateBeforeSave: false });

            logger.info(`New user registered: ${user.email}`);

            // Return user without sensitive data
            const userObject = user.toJSON();

            return {
                user: userObject,
                verificationToken, // In production, send this via email
            };
        } catch (error) {
            logger.error("Registration error", error);
            throw error;
        }
    }

    /**
     * Login user
     */
    async login(credentials) {
        try {
            // Validate input
            validateLoginInput(credentials);

            const { email, username, password } = credentials;

            // Find user by email or username
            const user = await User.findOne({
                $or: [{ email }, { username }],
            }).select("+password +loginAttempts +lockUntil");

            if (!user) {
                throw ApiError.unauthorized("Invalid credentials");
            }

            // Check if account is locked
            if (user.isLocked) {
                throw ApiError.forbidden(
                    "Account is temporarily locked due to multiple failed login attempts. Please try again later."
                );
            }

            // Check if account is active
            if (!user.isActive) {
                throw ApiError.forbidden("Account has been deactivated");
            }

            // Verify password
            const isPasswordValid = await user.comparePassword(password);

            if (!isPasswordValid) {
                await user.incLoginAttempts();
                throw ApiError.unauthorized("Invalid credentials");
            }

            // Reset login attempts on successful login
            await user.resetLoginAttempts();

            // Update last login
            user.lastLogin = new Date();
            await user.save({ validateBeforeSave: false });

            // Generate tokens
            const accessToken = user.generateAccessToken();
            const refreshToken = user.generateRefreshToken();

            // Store refresh token
            await user.storeRefreshToken(refreshToken);

            // Clean expired tokens
            await user.cleanExpiredTokens();

            logger.info(`User logged in: ${user.email}`);

            // Return user without sensitive data
            const userObject = user.toJSON();

            return {
                user: userObject,
                accessToken,
                refreshToken,
            };
        } catch (error) {
            logger.error("Login error", error);
            throw error;
        }
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken(refreshToken) {
        try {
            if (!refreshToken) {
                throw ApiError.unauthorized("Refresh token is required");
            }

            // Verify refresh token
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

            // Find user
            const user = await User.findById(decoded._id);

            if (!user) {
                throw ApiError.unauthorized("Invalid refresh token");
            }

            // Check if refresh token exists in user's tokens
            const tokenExists = user.refreshTokens.some((rt) => rt.token === refreshToken);

            if (!tokenExists) {
                throw ApiError.unauthorized("Invalid refresh token");
            }

            // Generate new access token
            const accessToken = user.generateAccessToken();

            logger.info(`Access token refreshed for user: ${user.email}`);

            return {
                accessToken,
            };
        } catch (error) {
            if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
                throw ApiError.unauthorized("Invalid or expired refresh token");
            }
            logger.error("Token refresh error", error);
            throw error;
        }
    }

    /**
     * Logout user
     */
    async logout(userId, refreshToken) {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw ApiError.notFound("User not found");
            }

            // Remove refresh token
            if (refreshToken) {
                await user.removeRefreshToken(refreshToken);
            }

            logger.info(`User logged out: ${user.email}`);

            return { message: "Logged out successfully" };
        } catch (error) {
            logger.error("Logout error", error);
            throw error;
        }
    }

    /**
     * Verify email
     */
    async verifyEmail(token) {
        try {
            if (!token) {
                throw ApiError.badRequest("Verification token is required");
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_EMAIL_SECRET);

            // Find user
            const user = await User.findById(decoded._id).select(
                "+emailVerificationToken +emailVerificationExpires"
            );

            if (!user) {
                throw ApiError.notFound("User not found");
            }

            // Check if already verified
            if (user.isEmailVerified) {
                throw ApiError.badRequest("Email already verified");
            }

            // Check if token matches and not expired
            if (
                user.emailVerificationToken !== token ||
                user.emailVerificationExpires < Date.now()
            ) {
                throw ApiError.badRequest("Invalid or expired verification token");
            }

            // Update user
            user.isEmailVerified = true;
            user.emailVerificationToken = undefined;
            user.emailVerificationExpires = undefined;
            await user.save({ validateBeforeSave: false });

            logger.info(`Email verified for user: ${user.email}`);

            return { message: "Email verified successfully" };
        } catch (error) {
            if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
                throw ApiError.badRequest("Invalid or expired verification token");
            }
            logger.error("Email verification error", error);
            throw error;
        }
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(email) {
        try {
            validateEmail(email);

            const user = await User.findOne({ email });

            if (!user) {
                // Don't reveal if user exists
                logger.warn(`Password reset requested for non-existent email: ${email}`);
                return { message: "If the email exists, a reset link has been sent" };
            }

            // Generate reset token
            const resetToken = user.generatePasswordResetToken();
            await user.save({ validateBeforeSave: false });

            logger.info(`Password reset requested for user: ${user.email}`);

            // In production, send this via email
            return {
                message: "If the email exists, a reset link has been sent",
                resetToken, // Remove this in production
            };
        } catch (error) {
            logger.error("Password reset request error", error);
            throw error;
        }
    }

    /**
     * Reset password
     */
    async resetPassword(token, newPassword) {
        try {
            if (!token || !newPassword) {
                throw ApiError.badRequest("Token and new password are required");
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);

            // Find user
            const user = await User.findById(decoded._id).select(
                "+password +passwordResetToken +passwordResetExpires"
            );

            if (!user) {
                throw ApiError.notFound("User not found");
            }

            // Check if token matches and not expired
            if (user.passwordResetToken !== token || user.passwordResetExpires < Date.now()) {
                throw ApiError.badRequest("Invalid or expired reset token");
            }

            // Update password
            user.password = newPassword;
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            user.refreshTokens = []; // Invalidate all refresh tokens
            await user.save();

            logger.info(`Password reset successful for user: ${user.email}`);

            return { message: "Password reset successful" };
        } catch (error) {
            if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
                throw ApiError.badRequest("Invalid or expired reset token");
            }
            logger.error("Password reset error", error);
            throw error;
        }
    }

    /**
     * Change password (for authenticated users)
     */
    async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = await User.findById(userId).select("+password");

            if (!user) {
                throw ApiError.notFound("User not found");
            }

            // Verify current password
            const isPasswordValid = await user.comparePassword(currentPassword);

            if (!isPasswordValid) {
                throw ApiError.unauthorized("Current password is incorrect");
            }

            // Update password
            user.password = newPassword;
            user.refreshTokens = []; // Invalidate all refresh tokens
            await user.save();

            logger.info(`Password changed for user: ${user.email}`);

            return { message: "Password changed successfully" };
        } catch (error) {
            logger.error("Password change error", error);
            throw error;
        }
    }

    /**
     * Get current user profile
     */
    async getCurrentUser(userId) {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw ApiError.notFound("User not found");
            }

            return user.toJSON();
        } catch (error) {
            logger.error("Get current user error", error);
            throw error;
        }
    }
}

export default new AuthService();
