# Production-Ready Authentication System

## Overview
This is a complete, production-ready authentication system with custom error handling for your game backend. The system includes user registration, login, JWT-based authentication, email verification, password reset, and comprehensive security features.

## Features

### ✅ Core Authentication
- User registration with validation
- Secure login with JWT tokens
- Access token & refresh token mechanism
- Logout functionality
- Get current user profile

### ✅ Security Features
- Password hashing with bcrypt (12 rounds)
- JWT token-based authentication
- Account locking after failed login attempts
- Secure HTTP-only cookies for refresh tokens
- Role-based access control (RBAC)
- Email verification requirement option
- Resource ownership validation

### ✅ Password Management
- Password reset via email token
- Change password for authenticated users
- Strong password validation (min 8 chars, uppercase, lowercase, number, special char)

### ✅ Error Handling
- Custom ApiError class with factory methods
- Global error middleware
- Mongoose validation error handling
- JWT error handling
- Duplicate key error handling
- Standardized error responses

### ✅ Logging
- Custom logger with colored output
- Different log levels (ERROR, WARN, INFO, DEBUG)
- Request/response logging
- Error stack traces in development

## Project Structure

```
Backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.js    # Request handlers
│   │   │   ├── auth.service.js       # Business logic
│   │   │   ├── auth.routes.js        # Route definitions
│   │   │   └── auth.middleware.js    # Auth middleware
│   │   └── user/
│   │       └── user.model.js         # User schema & methods
│   ├── middlewares/
│   │   └── error.middleware.js       # Error handling
│   ├── utils/
│   │   ├── ApiError.js               # Custom error class
│   │   ├── ApiResponse.js            # Standard response class
│   │   ├── logger.js                 # Logging utility
│   │   └── validation.js             # Input validation
│   ├── app.js                        # Express app setup
│   └── server.js                     # Server entry point
└── .env.example                      # Environment variables template
```

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the following critical variables in `.env`:
   - `MONGODB_URI` - Your MongoDB connection string
   - `JWT_ACCESS_SECRET` - Generate a secure random string
   - `JWT_REFRESH_SECRET` - Generate a secure random string
   - `JWT_EMAIL_SECRET` - Generate a secure random string
   - `JWT_RESET_SECRET` - Generate a secure random string

3. Generate secure secrets (run in terminal):
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

## API Endpoints

### Public Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

#### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "email_verification_token"
}
```

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token",
  "newPassword": "NewSecurePass123!"
}
```

### Protected Endpoints (Require Authentication)

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer your_access_token
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

#### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

## Using Auth Middleware

### Protect Routes
```javascript
import { authenticate } from "./modules/auth/auth.middleware.js";

router.get("/protected", authenticate, (req, res) => {
  // req.user is available here
  res.json({ user: req.user });
});
```

### Role-Based Access
```javascript
import { authenticate, authorize } from "./modules/auth/auth.middleware.js";

router.get("/admin", authenticate, authorize("admin"), (req, res) => {
  res.json({ message: "Admin only" });
});
```

### Require Email Verification
```javascript
import { authenticate, requireEmailVerification } from "./modules/auth/auth.middleware.js";

router.get("/verified-only", authenticate, requireEmailVerification, (req, res) => {
  res.json({ message: "Email verified users only" });
});
```

### Check Resource Ownership
```javascript
import { authenticate, checkOwnership } from "./modules/auth/auth.middleware.js";

router.delete("/posts/:userId", authenticate, checkOwnership("userId"), (req, res) => {
  // Only the owner or admin can delete
  res.json({ message: "Deleted" });
});
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 400,
  "errors": [
    {
      "field": "email",
      "message": "Email already registered"
    }
  ]
}
```

## Security Best Practices

1. **Passwords**: Hashed with bcrypt (12 rounds)
2. **Tokens**: Stored in HTTP-only cookies
3. **Account Locking**: After 5 failed login attempts (2 hours lock)
4. **Token Expiry**: Access tokens expire in 15 minutes, refresh tokens in 7 days
5. **Input Validation**: All inputs are validated before processing
6. **CORS**: Configured with credentials support
7. **Rate Limiting**: Ready to implement (see rateLimiter.js)

## Testing the Auth System

1. Start the server:
   ```bash
   npm run dev
   ```

2. Test registration:
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testuser",
       "email": "test@example.com",
       "password": "Test123!@#",
       "fullName": "Test User"
     }'
   ```

3. Test login:
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test123!@#"
     }'
   ```

4. Test protected route:
   ```bash
   curl -X GET http://localhost:5000/api/auth/me \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

## Next Steps

1. **Email Service**: Integrate an email service (SendGrid, AWS SES, etc.) for:
   - Email verification
   - Password reset emails
   - Welcome emails

2. **Rate Limiting**: Implement rate limiting on sensitive endpoints:
   ```javascript
   import rateLimiter from "./middlewares/rateLimiter.js";
   router.post("/login", rateLimiter, login);
   ```

3. **Social Auth**: Add OAuth providers (Google, Facebook, etc.)

4. **Two-Factor Authentication**: Implement 2FA for enhanced security

5. **Session Management**: Add ability to view and revoke active sessions

## Dependencies

- `express` - Web framework
- `mongoose` - MongoDB ODM
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT tokens
- `cookie-parser` - Cookie parsing
- `cors` - CORS middleware
- `morgan` - HTTP request logger
- `dotenv` - Environment variables

## Support

For issues or questions, please refer to the code comments or create an issue in your repository.
