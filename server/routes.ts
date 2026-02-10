import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { hashPassword, comparePassword, generateTokens, generateToken, verifyToken, authMiddleware, adminMiddleware } from "./auth";
import { registerSchema, loginSchema, adminLoginSchema } from "@shared/schema";
import { Server as SocketServer } from "socket.io";
import rateLimit from "express-rate-limit";
import { uploadImage, uploadDocument, uploadAny, uploadToCloudinary, type CloudinaryFolder } from "./cloudinary";

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "learnhub-admin-2024-secure";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

async function seedAdminUser() {
  try {
    const adminEmail = "admin@learnhub.com";
    const existing = await storage.getUserByEmail(adminEmail);
    if (!existing) {
      const hashedPassword = await hashPassword("Admin@123");
      await storage.createUser({
        email: adminEmail,
        password: hashedPassword,
        name: "System Admin",
        role: "admin",
      });
      console.log("Default admin user seeded: admin@learnhub.com / Admin@123");
    }
  } catch (e) {
    console.error("Failed to seed admin:", e);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  await seedAdminUser();

  const io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    socket.on("join", (userId: number) => {
      socket.join(`user-${userId}`);
    });

    socket.on("send-message", async (data: { senderId: number; receiverId?: number; groupId?: number; content: string }) => {
      const msg = await storage.createMessage(data);
      if (data.receiverId) {
        io.to(`user-${data.receiverId}`).emit("new-message", msg);
        io.to(`user-${data.senderId}`).emit("new-message", msg);
      }
      if (data.groupId) {
        io.emit(`group-${data.groupId}`, msg);
      }
    });
  });

  app.post("/api/auth/register", loginLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const { email, password, name } = parsed.data;
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({ email, password: hashedPassword, name, role: "student" });
      const tokens = generateTokens(user.id, user.role);
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token: tokens.accessToken, refreshToken: tokens.refreshToken });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", loginLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const { email, password } = parsed.data;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      if (!user.isActive) {
        return res.status(403).json({ message: "Account disabled" });
      }
      const valid = await comparePassword(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      if (user.role === "admin") {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const tokens = generateTokens(user.id, user.role);
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token: tokens.accessToken, refreshToken: tokens.refreshToken });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/secure-admin-auth", loginLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = adminLoginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request" });
      }
      const { email, password, adminKey } = parsed.data;
      if (adminKey !== ADMIN_SECRET_KEY) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      if (user.role !== "admin") {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      if (!user.isActive) {
        return res.status(403).json({ message: "Account disabled" });
      }
      const valid = await comparePassword(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const tokens = generateTokens(user.id, user.role);
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token: tokens.accessToken, refreshToken: tokens.refreshToken });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token required" });
      }
      const decoded = verifyToken(refreshToken);
      if (!decoded || decoded.type !== "refresh") {
        return res.status(401).json({ message: "Invalid refresh token" });
      }
      const user = await storage.getUserById(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "User not found or disabled" });
      }
      const tokens = generateTokens(user.id, user.role);
      res.json({ token: tokens.accessToken, refreshToken: tokens.refreshToken });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUserById(req.user!.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/auth/profile", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { name, phone, college, skills, photoUrl } = req.body;
      const user = await storage.updateUser(req.user!.userId, { name, phone, college, skills, photoUrl });
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/upload/course-image", authMiddleware, adminMiddleware, uploadImage.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const result = await uploadToCloudinary(req.file.buffer, "lms/course-images", { resourceType: "image" });
      res.json({ url: result.url, publicId: result.publicId });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/upload/course-pdf", authMiddleware, adminMiddleware, uploadDocument.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const result = await uploadToCloudinary(req.file.buffer, "lms/course-pdfs", { resourceType: "raw" });
      res.json({ url: result.url, publicId: result.publicId });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/upload/assignment", authMiddleware, adminMiddleware, uploadAny.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const result = await uploadToCloudinary(req.file.buffer, "lms/assignments", { resourceType: "raw" });
      res.json({ url: result.url, publicId: result.publicId });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/upload/submission", authMiddleware, uploadAny.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const result = await uploadToCloudinary(req.file.buffer, "lms/submissions", { resourceType: "raw" });
      res.json({ url: result.url, publicId: result.publicId });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/stats", authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/users", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const search = req.query.search as string | undefined;
      const users = await storage.getUsers(search);
      const usersWithoutPasswords = users.map(({ password: _, ...u }) => u);
      res.json(usersWithoutPasswords);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/admin/users/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.updateUser(id, req.body);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/courses", async (req: Request, res: Response) => {
    try {
      const publishedOnly = req.query.published === "true";
      const courses = await storage.getCourses(publishedOnly);
      res.json(courses);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/courses", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const course = await storage.createCourse({ ...req.body, createdBy: req.user!.userId });
      res.json(course);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/courses/:id", async (req: Request, res: Response) => {
    try {
      const course = await storage.getCourseById(parseInt(req.params.id));
      if (!course) return res.status(404).json({ message: "Course not found" });
      const mods = await storage.getModulesByCourse(course.id);
      const modulesWithLessons = await Promise.all(
        mods.map(async (mod) => {
          const lessons = await storage.getLessonsByModule(mod.id);
          return { ...mod, lessons };
        })
      );
      res.json({ ...course, modules: modulesWithLessons });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/courses/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const course = await storage.updateCourse(parseInt(req.params.id), req.body);
      res.json(course);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/courses/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteCourse(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/modules", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const mod = await storage.createModule(req.body);
      res.json(mod);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/modules/:courseId", async (req: Request, res: Response) => {
    try {
      const mods = await storage.getModulesByCourse(parseInt(req.params.courseId));
      res.json(mods);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/modules/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const mod = await storage.updateModule(parseInt(req.params.id), req.body);
      res.json(mod);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/modules/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteModule(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/lessons", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const lesson = await storage.createLesson(req.body);
      res.json(lesson);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/lessons/:moduleId", async (req: Request, res: Response) => {
    try {
      const lessons = await storage.getLessonsByModule(parseInt(req.params.moduleId));
      res.json(lessons);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/lessons/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const lesson = await storage.updateLesson(parseInt(req.params.id), req.body);
      res.json(lesson);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/lessons/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteLesson(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/enroll", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { courseId, couponCode } = req.body;
      const course = await storage.getCourseById(courseId);
      if (!course) return res.status(404).json({ message: "Course not found" });

      if (couponCode) {
        const coupon = await storage.getCouponByCode(couponCode);
        if (!coupon) return res.status(400).json({ message: "Invalid coupon code" });
        if (coupon.courseId !== courseId) return res.status(400).json({ message: "Coupon not valid for this course" });
        if (!coupon.isActive) return res.status(400).json({ message: "Coupon is inactive" });
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return res.status(400).json({ message: "Coupon expired" });
        if (coupon.usedCount >= coupon.maxUses) return res.status(400).json({ message: "Coupon usage limit reached" });

        await storage.updateCoupon(coupon.id, { usedCount: coupon.usedCount + 1 });
      } else if (course.price > 0) {
        return res.status(400).json({ message: "A coupon code is required to enroll in paid courses" });
      }

      const enrollment = await storage.enrollUser(req.user!.userId, courseId);
      await storage.createNotification({
        userId: req.user!.userId,
        title: "Enrollment Successful",
        message: `You have been enrolled in ${course.title}`,
        type: "success",
      });
      await storage.updateLeaderboard(req.user!.userId, {});
      res.json(enrollment);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/enrollments", authMiddleware, async (req: Request, res: Response) => {
    try {
      const enrollments = await storage.getEnrollmentsByUser(req.user!.userId);
      res.json(enrollments);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/enrollments/check/:courseId", authMiddleware, async (req: Request, res: Response) => {
    try {
      const enrollment = await storage.getEnrollment(req.user!.userId, parseInt(req.params.courseId));
      res.json({ enrolled: !!enrollment, enrollment });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/assignments", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const assignment = await storage.createAssignment({ ...req.body, createdBy: req.user!.userId });
      res.json(assignment);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/assignments/:courseId", async (req: Request, res: Response) => {
    try {
      const assignments = await storage.getAssignmentsByCourse(parseInt(req.params.courseId));
      res.json(assignments);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/assignment/:id", async (req: Request, res: Response) => {
    try {
      const assignment = await storage.getAssignmentById(parseInt(req.params.id));
      if (!assignment) return res.status(404).json({ message: "Assignment not found" });
      res.json(assignment);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/assignments/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const assignment = await storage.updateAssignment(parseInt(req.params.id), req.body);
      res.json(assignment);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/assignments/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteAssignment(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/submissions", authMiddleware, async (req: Request, res: Response) => {
    try {
      const existing = await storage.getSubmissionByUser(req.body.assignmentId, req.user!.userId);
      if (existing) {
        const updated = await storage.updateSubmission(existing.id, { content: req.body.content, fileUrl: req.body.fileUrl, status: "submitted", submittedAt: new Date() });
        return res.json(updated);
      }
      const submission = await storage.createSubmission({ ...req.body, userId: req.user!.userId });
      res.json(submission);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/submissions/:assignmentId", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (req.user!.role === "admin") {
        const subs = await storage.getSubmissionsByAssignment(parseInt(req.params.assignmentId));
        return res.json(subs);
      }
      const sub = await storage.getSubmissionByUser(parseInt(req.params.assignmentId), req.user!.userId);
      res.json(sub || null);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/submissions/:id/review", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const { marks, feedback } = req.body;
      const sub = await storage.updateSubmission(parseInt(req.params.id), { marks, feedback, status: "reviewed" });
      if (sub) {
        await storage.updateLeaderboard(sub.userId, { assignmentPoints: marks });
        await storage.createNotification({
          userId: sub.userId,
          title: "Assignment Reviewed",
          message: `Your assignment has been reviewed. Score: ${marks}`,
          type: "info",
        });
      }
      res.json(sub);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/quizzes", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const quiz = await storage.createQuiz({ ...req.body, createdBy: req.user!.userId });
      res.json(quiz);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/quizzes/:courseId", async (req: Request, res: Response) => {
    try {
      const quizzes = await storage.getQuizzesByCourse(parseInt(req.params.courseId));
      res.json(quizzes);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/quiz/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const quiz = await storage.getQuizById(parseInt(req.params.id));
      if (!quiz) return res.status(404).json({ message: "Quiz not found" });
      const questions = await storage.getQuestionsByQuiz(quiz.id);
      const attempt = await storage.getQuizAttempt(quiz.id, req.user!.userId);
      const questionsForStudent = req.user!.role === "admin"
        ? questions
        : questions.map(({ correctAnswer, ...q }) => q);
      res.json({ ...quiz, questions: questionsForStudent, attempt });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/quizzes/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const quiz = await storage.updateQuiz(parseInt(req.params.id), req.body);
      res.json(quiz);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/quizzes/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteQuiz(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/questions", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const question = await storage.createQuestion(req.body);
      res.json(question);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/questions/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const question = await storage.updateQuestion(parseInt(req.params.id), req.body);
      res.json(question);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/questions/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteQuestion(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/quiz-attempt", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { quizId } = req.body;
      const existing = await storage.getQuizAttempt(quizId, req.user!.userId);
      if (existing?.finishedAt) {
        return res.status(400).json({ message: "Quiz already completed" });
      }
      if (existing) return res.json(existing);
      const attempt = await storage.createQuizAttempt({ quizId, userId: req.user!.userId });
      res.json(attempt);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/quiz-submit", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { quizId, answers } = req.body;
      const quiz = await storage.getQuizById(quizId);
      if (!quiz) return res.status(404).json({ message: "Quiz not found" });

      const questions = await storage.getQuestionsByQuiz(quizId);
      let score = 0;
      let totalMarks = 0;

      for (const q of questions) {
        totalMarks += q.marks;
        const userAnswer = answers[q.id.toString()];
        if (userAnswer === q.correctAnswer) {
          score += q.marks;
        } else if (quiz.negativeMarking && userAnswer !== undefined) {
          score -= q.marks * 0.25;
        }
      }

      score = Math.max(0, score);

      const attempt = await storage.getQuizAttempt(quizId, req.user!.userId);
      if (attempt) {
        const updated = await storage.updateQuizAttempt(attempt.id, {
          answers,
          score,
          totalMarks,
          finishedAt: new Date(),
        });
        await storage.updateLeaderboard(req.user!.userId, { quizPoints: score });
        await storage.recalculateRanks();
        return res.json(updated);
      }

      res.status(400).json({ message: "No active attempt found" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/coupons", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const coupon = await storage.createCoupon({ ...req.body, createdBy: req.user!.userId });
      res.json(coupon);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/coupons", authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
    try {
      const coupons = await storage.getCoupons();
      res.json(coupons);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/coupons/validate", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { code, courseId } = req.body;
      const coupon = await storage.getCouponByCode(code);
      if (!coupon) return res.json({ valid: false, message: "Invalid coupon code" });
      if (coupon.courseId !== courseId) return res.json({ valid: false, message: "Coupon not valid for this course" });
      if (!coupon.isActive) return res.json({ valid: false, message: "Coupon is inactive" });
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return res.json({ valid: false, message: "Coupon expired" });
      if (coupon.usedCount >= coupon.maxUses) return res.json({ valid: false, message: "Coupon usage limit reached" });
      res.json({ valid: true, message: "Coupon is valid" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/meetings", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const meeting = await storage.createMeeting({ ...req.body, createdBy: req.user!.userId });
      res.json(meeting);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/meetings", authMiddleware, async (req: Request, res: Response) => {
    try {
      const courseId = req.query.courseId ? parseInt(req.query.courseId as string) : undefined;
      const meetings = await storage.getMeetings(courseId);
      res.json(meetings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/meetings/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteMeeting(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/attendance", authMiddleware, async (req: Request, res: Response) => {
    try {
      const record = await storage.markAttendance({ meetingId: req.body.meetingId, userId: req.user!.userId });
      await storage.updateLeaderboard(req.user!.userId, { attendancePoints: 5 });
      res.json(record);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/attendance/:meetingId", authMiddleware, async (req: Request, res: Response) => {
    try {
      const records = await storage.getAttendanceByMeeting(parseInt(req.params.meetingId));
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/my-attendance", authMiddleware, async (req: Request, res: Response) => {
    try {
      const records = await storage.getAttendanceByUser(req.user!.userId);
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/leaderboard", async (_req: Request, res: Response) => {
    try {
      const entries = await storage.getLeaderboard();
      res.json(entries);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/notifications", authMiddleware, async (req: Request, res: Response) => {
    try {
      const notifications = await storage.getNotificationsByUser(req.user!.userId);
      res.json(notifications);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/notifications/unread-count", authMiddleware, async (req: Request, res: Response) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.user!.userId);
      res.json({ count });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/notifications/:id/read", authMiddleware, async (req: Request, res: Response) => {
    try {
      const n = await storage.markNotificationRead(parseInt(req.params.id));
      res.json(n);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/notifications/read-all", authMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.markAllNotificationsRead(req.user!.userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/messages/:partnerId", authMiddleware, async (req: Request, res: Response) => {
    try {
      const messages = await storage.getMessages(req.user!.userId, parseInt(req.params.partnerId));
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/chat-list", authMiddleware, async (req: Request, res: Response) => {
    try {
      const partners = await storage.getChatList(req.user!.userId);
      res.json(partners);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/messages", authMiddleware, async (req: Request, res: Response) => {
    try {
      const msg = await storage.createMessage({ ...req.body, senderId: req.user!.userId });
      res.json(msg);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/groups", authMiddleware, async (_req: Request, res: Response) => {
    try {
      const groups = await storage.getGroups();
      res.json(groups);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/groups", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const group = await storage.createGroup({ ...req.body, createdBy: req.user!.userId });
      res.json(group);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
