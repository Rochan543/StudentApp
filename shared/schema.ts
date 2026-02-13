import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  serial,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("student"),
  phone: text("phone"),
  college: text("college"),
  photoUrl: text("photo_url"),
  skills: text("skills"),
  groupId: integer("group_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  brochureUrl: text("brochure_url"),
  price: real("price").notNull().default(0),
  duration: integer("duration").default(60),
  createdBy: integer("created_by").notNull(),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  contentType: text("content_type").default("text"),
  videoUrl: text("video_url"),
  documentUrl: text("document_url"),
  duration: integer("duration"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  courseId: integer("course_id").notNull(),
  progress: real("progress").notNull().default(0),
  completedLessons: jsonb("completed_lessons").$type<number[]>().default([]),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  fileUrl: text("file_url"),
  dueDate: timestamp("due_date"),
  maxMarks: integer("max_marks").notNull().default(100),
  assignedTo: jsonb("assigned_to").$type<number[]>(),
  questionSet: text("question_set"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content"),
  fileUrl: text("file_url"),
  status: text("status").notNull().default("pending"),
  marks: integer("marks"),
  feedback: text("feedback"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  timeLimit: integer("time_limit").notNull().default(30),
  negativeMarking: boolean("negative_marking").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(false),
  assignedTo: jsonb("assigned_to").$type<number[]>(),
  questionSet: text("question_set"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull(),
  text: text("text").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correctAnswer: integer("correct_answer").notNull(),
  marks: integer("marks").notNull().default(1),
  questionSet: text("question_set"),
  orderIndex: integer("order_index").notNull().default(0),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull(),
  userId: integer("user_id").notNull(),
  answers: jsonb("answers").$type<Record<string, number>>().default({}),
  score: real("score").notNull().default(0),
  totalMarks: real("total_marks").notNull().default(0),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
});

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  courseId: integer("course_id").notNull(),
  maxUses: integer("max_uses").notNull().default(1),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  link: text("link").notNull(),
  courseId: integer("course_id"),
  groupId: integer("group_id"),
  assignedUserId: integer("assigned_user_id"),
  meetingType: text("meeting_type").notNull().default("class"),
  assignTo: text("assign_to").notNull().default("course"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("present"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id"),
  groupId: integer("group_id"),
  content: text("content"),
  mediaUrl: text("media_url"),
  messageType: text("message_type").notNull().default("text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leaderboard = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  attendancePoints: real("attendance_points").notNull().default(0),
  assignmentPoints: real("assignment_points").notNull().default(0),
  quizPoints: real("quiz_points").notNull().default(0),
  streakPoints: real("streak_points").notNull().default(0),
  totalPoints: real("total_points").notNull().default(0),
  rank: integer("rank"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  imageUrl: text("image_url"),
  link: text("link"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dailyWork = pgTable("daily_work", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content"),
  fileUrl: text("file_url"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendanceStreak = pgTable("attendance_streak", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull().default("present"),
});

export const roadmaps = pgTable("roadmaps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const roadmapItems = pgTable("roadmap_items", {
  id: serial("id").primaryKey(),
  roadmapId: integer("roadmap_id").notNull(),
  courseId: integer("course_id").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  isUnlocked: boolean("is_unlocked").notNull().default(false),
  isCompleted: boolean("is_completed").notNull().default(false),
  unlockRequested: boolean("unlock_requested").notNull().default(false),
  unlockRequestedAt: timestamp("unlock_requested_at"),
  unlockedAt: timestamp("unlocked_at"),
  completedAt: timestamp("completed_at"),
  brochureUrl: text("brochure_url"),
  videoUrl: text("video_url"),
  cheatSheetUrl: text("cheat_sheet_url"),
  tipsUrl: text("tips_url"),
  telegramLink: text("telegram_link"),
  whatsappLink: text("whatsapp_link"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  role: true,
  phone: true,
  college: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.literal("student").optional().default("student"),
});

export const insertBannerSchema = createInsertSchema(banners).pick({
  title: true,
  subtitle: true,
  imageUrl: true,
  link: true,
  isActive: true,
});

export const insertCourseSchema = createInsertSchema(courses).pick({
  title: true,
  description: true,
  imageUrl: true,
  price: true,
  isPublished: true,
});

export const insertModuleSchema = createInsertSchema(modules).pick({
  courseId: true,
  title: true,
  description: true,
  orderIndex: true,
});

export const insertLessonSchema = createInsertSchema(lessons).pick({
  moduleId: true,
  title: true,
  content: true,
  videoUrl: true,
  documentUrl: true,
  orderIndex: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).pick({
  courseId: true,
  title: true,
  description: true,
  dueDate: true,
  maxMarks: true,
});

export const insertQuizSchema = createInsertSchema(quizzes).pick({
  courseId: true,
  title: true,
  description: true,
  timeLimit: true,
  negativeMarking: true,
  isPublished: true,
});

export const insertQuestionSchema = createInsertSchema(questions).pick({
  quizId: true,
  text: true,
  options: true,
  correctAnswer: true,
  marks: true,
  orderIndex: true,
});

export const insertCouponSchema = createInsertSchema(coupons).pick({
  code: true,
  courseId: true,
  maxUses: true,
  expiresAt: true,
});

export const insertMeetingSchema = createInsertSchema(meetings).pick({
  title: true,
  description: true,
  link: true,
  courseId: true,
  meetingType: true,
  scheduledAt: true,
});

export const insertGroupSchema = createInsertSchema(groups).pick({
  name: true,
  description: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Course = typeof courses.$inferSelect;
export type Module = typeof modules.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Quiz = typeof quizzes.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type LeaderboardEntry = typeof leaderboard.$inferSelect;
export type Banner = typeof banners.$inferSelect;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type AttendanceStreak = typeof attendanceStreak.$inferSelect;
export type Roadmap = typeof roadmaps.$inferSelect;
export type RoadmapItem = typeof roadmapItems.$inferSelect;
