import express from "express";
import {
    register,
    login,
    logout,
    refreshToken,
    verifyEmail,
    forgotPassword,
    resetPassword,
    changePassword,
    getCurrentUser,
} from "./auth.controller.js";
import { authenticate } from "./auth.middleware.js";

const router = express.Router();

/**
 * Public Routes
 */

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", login);

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post("/refresh", refreshToken);

// @route   POST /api/auth/verify-email
// @desc    Verify user email
// @access  Public
router.post("/verify-email", verifyEmail);

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post("/forgot-password", forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post("/reset-password", resetPassword);

/**
 * Protected Routes (require authentication)
 */

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post("/logout", authenticate, logout);

// @route   POST /api/auth/change-password
// @desc    Change password (for authenticated users)
// @access  Private
router.post("/change-password", authenticate, changePassword);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get("/me", authenticate, getCurrentUser);

export default router;
