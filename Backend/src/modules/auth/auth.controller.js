import authService from "./auth.service.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../middlewares/error.middleware.js";

/**
 * Auth Controllers
 * Handle HTTP requests and responses for authentication
 */

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);

    res
        .status(201)
        .json(
            ApiResponse.created(
                result,
                "Registration successful. Please verify your email."
            )
        );
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);

    // Set refresh token in httpOnly cookie
    res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json(ApiResponse.success(result, "Login successful"));
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
export const refreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    const result = await authService.refreshAccessToken(refreshToken);

    res
        .status(200)
        .json(ApiResponse.success(result, "Token refreshed successfully"));
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    await authService.logout(req.user._id, refreshToken);

    // Clear refresh token cookie
    res.clearCookie("refreshToken");

    res.status(200).json(ApiResponse.success(null, "Logged out successfully"));
});

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify user email
 * @access  Public
 */
export const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.body;

    const result = await authService.verifyEmail(token);

    res
        .status(200)
        .json(ApiResponse.success(result, "Email verified successfully"));
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const result = await authService.requestPasswordReset(email);

    res
        .status(200)
        .json(
            ApiResponse.success(result, "Password reset link sent to your email")
        );
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    const result = await authService.resetPassword(token, newPassword);

    res
        .status(200)
        .json(ApiResponse.success(result, "Password reset successful"));
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (for authenticated users)
 * @access  Private
 */
export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const result = await authService.changePassword(
        req.user._id,
        currentPassword,
        newPassword
    );

    res
        .status(200)
        .json(ApiResponse.success(result, "Password changed successfully"));
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user._id);

    res.status(200).json(ApiResponse.success(user, "User profile retrieved"));
});
