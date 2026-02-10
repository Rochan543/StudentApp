# LearnHub - Learning Management System

## Overview
A comprehensive LMS mobile app built with Expo React Native (frontend) and Express + PostgreSQL (backend). Features role-based access control with secure admin authentication, course management, enrollment with coupon codes, assignments with file uploads via Cloudinary, auto-graded quizzes, leaderboard, meetings, attendance, real-time chat, notifications, and a banner/showcase system.

## Architecture
- **Frontend**: Expo React Native (file-based routing via expo-router)
- **Backend**: Express.js with TypeScript on port 5000
- **Database**: PostgreSQL via Drizzle ORM
- **File Storage**: Cloudinary (course images, PDFs, assignments, submissions, banners)
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
  (admin)/              # Admin tabs (dashboard, courses, users, settings/more)
  course/[id].tsx       # Course detail
  quiz/[id].tsx         # Quiz taking
  assignment/[id].tsx   # Assignment submission with file upload
  chat/[id].tsx         # Chat room
  notifications.tsx     # Notifications
  admin-coupons.tsx     # Admin: coupon management (CRUD)
  admin-banners.tsx     # Admin: banner management (CRUD)
  admin-assignments.tsx # Admin: all assignments overview
  admin-quizzes.tsx     # Admin: all quizzes overview
  admin-meetings.tsx    # Admin: meeting management
  admin-groups.tsx      # Admin: group/chat management
  admin-reports.tsx     # Admin: reports & analytics dashboard
  meetings.tsx          # Student: meetings list
  assignments-list.tsx  # Student: all assignments across enrolled courses
  quizzes-list.tsx      # Student: all quizzes across enrolled courses
  chat-list.tsx         # Student: chat groups list
  groups.tsx            # Student: study groups overview
server/
  index.ts              # Express server setup with CORS
  routes.ts             # All API routes
  storage.ts            # Database operations
  auth.ts               # JWT auth with refresh tokens
  cloudinary.ts         # Cloudinary upload utilities
  db.ts                 # Database connection
shared/
  schema.ts             # Drizzle schema (18 tables including banners)
lib/
  auth-context.tsx      # Auth context with role-based routing + refresh tokens
  query-client.ts       # React Query setup with auth headers
  api.ts                # API helper functions with file upload
constants/
  colors.ts             # App color theme
```

## Database Tables
users, courses, modules, lessons, enrollments, assignments, submissions, quizzes, questions, quiz_attempts, coupons, meetings, attendance, groups, messages, notifications, leaderboard, banners

## API Endpoints (Key)
- Auth: POST /api/login, POST /api/register, POST /api/auth/refresh
- Courses: GET/POST /api/courses, GET /api/courses/:id
- Enrollments: POST /api/enroll, GET /api/enrollments, GET /api/enrollments/check/:courseId
- Coupons: GET/POST /api/coupons, PUT/DELETE /api/coupons/:id
- Banners: GET/POST /api/banners, PUT/DELETE /api/banners/:id (GET supports ?active=true)
- Assignments: GET /api/all-assignments (role-based: admin sees all, student sees enrolled)
- Quizzes: GET /api/all-quizzes (role-based)
- Meetings: GET/POST /api/meetings
- Groups: GET/POST /api/groups, DELETE /api/groups/:id
- Reports: GET /api/admin/stats

## Recent Changes (Feb 2026)
- Added banners table and CRUD API for admin banner/showcase management
- Added /api/all-assignments and /api/all-quizzes endpoints (role-based)
- Added coupon update/delete endpoints (soft delete)
- Added group delete endpoint
- Admin "More" tab redesigned as navigation hub with grid + list layout
  - Links to: Coupons, Banners, Meetings, Groups, Assignments, Quizzes, Reports
- Student dashboard enhanced with:
  - Banner carousel showing active banners
  - Quick Access grid (Assignments, Quizzes, Meetings, Chat, Groups, Rankings)
  - Improved layout with stats + upcoming sessions
- Created 7 admin sub-pages: coupons, banners, assignments, quizzes, meetings, groups, reports
- Created 5 student sub-pages: meetings, assignments-list, quizzes-list, chat-list, groups
- All sub-pages registered as stack screens with slide_from_right animation
- Added testID props on navigation buttons for testing
- Cloudinary file upload system for all file types
- Refresh token mechanism for session management
- Rate limiting on login endpoints
