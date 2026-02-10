# LearnHub - Learning Management System

## Overview
A comprehensive LMS mobile app built with Expo React Native (frontend) and Express + PostgreSQL (backend). Features role-based access control with secure admin authentication, course management, enrollment with coupon codes, assignments with file uploads via Cloudinary, auto-graded quizzes, leaderboard, meetings, attendance, real-time chat, and notifications.

## Architecture
- **Frontend**: Expo React Native (file-based routing via expo-router)
- **Backend**: Express.js with TypeScript on port 5000
- **Database**: PostgreSQL via Drizzle ORM
- **File Storage**: Cloudinary (course images, PDFs, assignments, submissions)
- **Real-time**: Socket.io for chat
- **Auth**: JWT with access/refresh tokens

## Key Security Features
- Single login screen for all users (admin and student)
- Role-based routing: admin role from database determines dashboard access
- Admin cannot register through public registration (student-only)
- Rate limiting on auth endpoints (10 attempts per 15 min)
- Refresh token rotation for session management
- Default admin seeded on startup: admin@learnhub.com / Admin@123

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `SESSION_SECRET` - JWT signing secret
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

## Project Structure
```
app/                    # Expo Router screens
  (auth)/               # Login, Register
  (student)/            # Student tabs (dashboard, courses, leaderboard, profile)
  (admin)/              # Admin tabs (dashboard, courses, users, settings)
  course/[id].tsx       # Course detail
  quiz/[id].tsx         # Quiz taking
  assignment/[id].tsx   # Assignment submission with file upload
  chat/[id].tsx         # Chat
  notifications.tsx     # Notifications
server/
  index.ts              # Express server setup with CORS
  routes.ts             # All API routes
  storage.ts            # Database operations
  auth.ts               # JWT auth with refresh tokens
  cloudinary.ts         # Cloudinary upload utilities
  db.ts                 # Database connection
shared/
  schema.ts             # Drizzle schema (16 tables)
lib/
  auth-context.tsx      # Auth context with role-based routing + refresh tokens
  query-client.ts       # React Query setup with auth headers
  api.ts                # API helper functions with file upload
constants/
  colors.ts             # App color theme
```

## Database Tables
users, courses, modules, lessons, enrollments, assignments, submissions, quizzes, questions, quiz_attempts, coupons, meetings, attendance, groups, messages, notifications, leaderboard

## Recent Changes (Feb 2026)
- Simplified auth: single login screen, role-based routing from database
- Removed hidden admin login, secret key, and separate admin-login screen
- Login API returns user role, frontend navigates directly to correct dashboard
- Added Cloudinary file upload system for all file types
- Added refresh token mechanism for session management
- Rate limiting on login endpoints
- Admin cannot register (student-only registration)
- Admin seeded on server startup
- File upload UI on assignment submission screen
- Updated CORS to allow Authorization header
