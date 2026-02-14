# RepatiKosam Group - Learning Management System

## Overview
A comprehensive LMS mobile app built with Expo React Native (frontend) and Express + PostgreSQL (backend). Features role-based access control with secure admin authentication, course management with Cloudinary storage (images, brochures, PDFs), enrollment with coupon codes, assignments with per-user question sets, auto-graded quizzes with exam mode, leaderboard with auto-update, meetings with granular assignment (course/group/user), attendance with streak tracking, leave request system with admin approval, user-specific roadmaps with course locking, real-time chat, notifications, group member management, and banner/showcase system.

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
  course/[id].tsx       # Course detail (image, brochure download, enrollment)
  quiz/[id].tsx         # Quiz taking (exam mode with timer)
  assignment/[id].tsx   # Assignment submission with file upload
  chat/[id].tsx         # Chat room
  notifications.tsx     # Notifications
  admin-coupons.tsx     # Admin: coupon management (CRUD)
  admin-banners.tsx     # Admin: banner management (CRUD)
  admin-assignments.tsx # Admin: all assignments overview
  admin-quizzes.tsx     # Admin: all quizzes overview
  admin-meetings.tsx    # Admin: meeting management (assignTo: course/group/user)
  admin-groups.tsx      # Admin: group/chat management with member selection
  admin-reports.tsx     # Admin: reports & analytics dashboard
  admin-leave-requests.tsx # Admin: leave request approval/rejection
  admin-roadmaps.tsx    # Admin: user-specific roadmap management with locking
  meetings.tsx          # Student: meetings list
  assignments-list.tsx  # Student: all assignments across enrolled courses
  quizzes-list.tsx      # Student: all quizzes across enrolled courses
  chat-list.tsx         # Student: chat groups list
  groups.tsx            # Student: study groups overview
  student-attendance.tsx # Student: attendance with streak tracking & calendar
  student-leave.tsx     # Student: leave request submission
  student-roadmap.tsx   # Student: visual roadmap timeline with locked/unlocked items
server/
  index.ts              # Express server setup with CORS
  routes.ts             # All API routes (40+ endpoints)
  storage.ts            # Database operations (60+ functions)
  auth.ts               # JWT auth with refresh tokens
  cloudinary.ts         # Cloudinary upload utilities
  db.ts                 # Database connection
shared/
  schema.ts             # Drizzle schema (23 tables)
lib/
  auth-context.tsx      # Auth context with role-based routing + refresh tokens
  query-client.ts       # React Query setup with auth headers
  api.ts                # API helper functions with file upload
constants/
  colors.ts             # App color theme
```

## Database Tables
users, courses, modules, lessons, enrollments, assignments, submissions, quizzes, questions, quiz_attempts, coupons, meetings, attendance, groups, messages, notifications, leaderboard, banners, group_members, leave_requests, attendance_streak, roadmaps, roadmap_items

## API Endpoints (Key)
- Auth: POST /api/auth/login, POST /api/auth/register, POST /api/auth/refresh
- Courses: GET/POST /api/courses, GET /api/courses/:id
- Enrollments: POST /api/enroll, GET /api/enrollments, GET /api/enrollments/check/:courseId
- Coupons: GET/POST /api/coupons, PUT/DELETE /api/coupons/:id
- Banners: GET/POST /api/banners, PUT/DELETE /api/banners/:id (GET supports ?active=true)
- Assignments: GET /api/all-assignments (role-based), POST /api/assignments/:courseId
- Quizzes: GET /api/all-quizzes (role-based), POST /api/quizzes/:courseId
- Meetings: GET/POST /api/meetings, DELETE /api/meetings/:id (assignTo: course/group/user)
- Groups: GET/POST /api/groups, DELETE /api/groups/:id
- Group Members: GET/POST /api/groups/:id/members, DELETE /api/groups/:groupId/members/:userId
- Leave Requests: GET/POST /api/leave-requests, PUT /api/leave-requests/:id (admin approval)
- Attendance: GET/POST /api/attendance, GET /api/attendance/streak
- Roadmaps: GET/POST /api/roadmaps, GET /api/roadmaps/user/:userId
- Roadmap Items: POST /api/roadmap-items, PUT /api/roadmap-items/:id, DELETE /api/roadmap-items/:id
- Users: GET /api/users (admin, excludes passwords)
- Submissions: GET /api/all-submissions (role-based), GET /api/my-submissions, GET /api/user-submissions/:userId, PUT /api/submissions/:id/review
- Reports: GET /api/admin/stats

## Recent Changes (Feb 2026)
- Added 5 new database tables: group_members, leave_requests, attendance_streak, roadmaps, roadmap_items
- Extended courses table with brochureUrl and duration fields
- Extended meetings table with groupId, assignedUserId, assignTo fields
- Extended assignments/quizzes with assignedTo and questionSet fields
- Extended messages with messageType field
- Admin meetings page now supports assigning to course/group/individual user
- Admin groups page has member management modal with checkbox selection
- Course detail displays image, duration, and downloadable PDF brochure
- Student attendance page shows 30-day calendar grid (green=present, red=absent, grey=holiday)
- Student leave request page for submitting leave with reason
- Admin leave request approval/rejection system
- Student roadmap with visual timeline and locked/unlocked progression
- Admin roadmap management for creating user-specific learning paths
- Quiz auto-grades and creates notification, leaderboard auto-updates on submission
- GET /api/users endpoint added (admin only, passwords excluded from response)
- All new screens registered in _layout.tsx with slide_from_right animation
- Cloudinary file upload system for all file types
- Refresh token mechanism for session management
- Rate limiting on login endpoints
- Fixed leave request API to return flat data structure (not nested)
- Fixed 40+ TypeScript LSP errors with paramId() helper for route params
- Added group call notification system (POST /api/groups/:id/call)
- Added JSON file upload for quiz bulk questions (admin-quizzes)
- Added file attachment upload for assignment creation (admin-assignments)
- Admin roadmap detail refetches fresh data after unlock/complete actions
- Chat messages ordered DESC for inverted FlatList compatibility
- Groups API includes memberCount in response
- Added admin-submissions.tsx: view all student submissions, review with marks/feedback, filter by status
- Added student-submissions.tsx: view own submissions with status, marks, feedback, progress bars
- Added submission API routes: /api/all-submissions, /api/my-submissions, /api/user-submissions/:userId
- Submission creation defaults status to "submitted"
- Review flow: admin submits marks/feedback → status changes to "reviewed" → notification sent → leaderboard updated
