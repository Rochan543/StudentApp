import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { hashPassword, comparePassword, generateTokens, generateToken, verifyToken, authMiddleware, adminMiddleware } from "./auth";
import { registerSchema, loginSchema } from "@shared/schema";
import { Server as SocketServer } from "socket.io";
import rateLimit from "express-rate-limit";
import { uploadImage, uploadDocument, uploadAny, uploadToCloudinary, type CloudinaryFolder } from "./cloudinary";

function paramId(param: string | string[]): number {
  return parseInt(String(param));
}

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
  app.set("io", io);


  io.on("connection", (socket) => {
    socket.on("join-group", (groupId: number) => {
  socket.join(`group-${groupId}`);
});

    socket.on("join", (userId: number) => {
      socket.join(`user-${userId}`);
    });

    socket.on("send-message", async (data: { senderId: number; receiverId?: number; groupId?: number; content: string }) => {
      const msg = await storage.createMessage(data);
      if (data.receiverId) {
        io.to(`user-${data.receiverId}`).emit("new-message", msg);
        io.to(`user-${data.senderId}`).emit("new-message", msg);
      }
      // if (data.groupId) {
      //   io.emit(`group-${data.groupId}`, msg);
      // }
          if (data.groupId) {
      io.to(`group-${data.groupId}`).emit("new-group-message", msg);
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
      const id = paramId(req.params.id);
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
      const course = await storage.getCourseById(paramId(req.params.id));
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
      const course = await storage.updateCourse(paramId(req.params.id), req.body);
      res.json(course);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/courses/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteCourse(paramId(req.params.id));
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
      const mods = await storage.getModulesByCourse(paramId(req.params.courseId));
      res.json(mods);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/modules/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const mod = await storage.updateModule(paramId(req.params.id), req.body);
      res.json(mod);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/modules/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteModule(paramId(req.params.id));
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
      const lessons = await storage.getLessonsByModule(paramId(req.params.moduleId));
      res.json(lessons);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/lessons/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const lesson = await storage.updateLesson(paramId(req.params.id), req.body);
      res.json(lesson);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/lessons/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteLesson(paramId(req.params.id));
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
      const enrollment = await storage.getEnrollment(req.user!.userId, paramId(req.params.courseId));
      res.json({ enrolled: !!enrollment, enrollment });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/assignments", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const data = { ...req.body, createdBy: req.user!.userId };
      if (data.dueDate && typeof data.dueDate === "string") {
        data.dueDate = new Date(data.dueDate);
      }
      if (data.dueDate && isNaN((data.dueDate as Date).getTime())) {
        data.dueDate = null;
      }
      const assignment = await storage.createAssignment(data);
      res.json(assignment);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/assignments/:courseId", async (req: Request, res: Response) => {
    try {
      const assignments = await storage.getAssignmentsByCourse(paramId(req.params.courseId));
      res.json(assignments);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/assignment/:id", async (req: Request, res: Response) => {
    try {
      const assignment = await storage.getAssignmentById(paramId(req.params.id));
      if (!assignment) return res.status(404).json({ message: "Assignment not found" });
      res.json(assignment);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/assignments/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const assignment = await storage.updateAssignment(paramId(req.params.id), req.body);
      res.json(assignment);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/assignments/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteAssignment(paramId(req.params.id));
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
      const submission = await storage.createSubmission({ ...req.body, userId: req.user!.userId, status: "submitted" });
      res.json(submission);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/submissions/:assignmentId", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (req.user!.role === "admin") {
        const subs = await storage.getSubmissionsByAssignment(paramId(req.params.assignmentId));
        return res.json(subs);
      }
      const sub = await storage.getSubmissionByUser(paramId(req.params.assignmentId), req.user!.userId);
      res.json(sub || null);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/all-submissions", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (req.user!.role === "admin") {
        const subs = await storage.getAllSubmissions();
        return res.json(subs);
      }
      const subs = await storage.getSubmissionsByUser(req.user!.userId);
      res.json(subs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/my-submissions", authMiddleware, async (req: Request, res: Response) => {
    try {
      const subs = await storage.getSubmissionsByUser(req.user!.userId);
      res.json(subs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/user-submissions/:userId", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const subs = await storage.getUserSubmissions(paramId(req.params.userId));
      res.json(subs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/submissions/:id/review", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const { marks, feedback } = req.body;
      const sub = await storage.updateSubmission(paramId(req.params.id), { marks, feedback, status: "reviewed" });
      if (sub) {
        await storage.updateLeaderboard(sub.userId, { assignmentPoints: marks });
        await storage.recalculateRanks();
        await storage.createNotification({
          userId: sub.userId,
          title: "Assignment Reviewed",
          message: `Your assignment has been reviewed. Score: ${marks}/${req.body.maxMarks || marks}`,
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
      const quizzes = await storage.getQuizzesByCourse(paramId(req.params.courseId));
      res.json(quizzes);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/quiz/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const quiz = await storage.getQuizById(paramId(req.params.id));
      if (!quiz) return res.status(404).json({ message: "Quiz not found" });
      const quizAny = quiz as any;
      let questions;
      if (req.user!.role !== "admin" && quizAny.questionSet) {
        questions = await storage.getQuestionsByQuizAndSet(quiz.id, quizAny.questionSet);
      } else {
        questions = await storage.getQuestionsByQuiz(quiz.id);
      }
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
      const quiz = await storage.updateQuiz(paramId(req.params.id), req.body);
      res.json(quiz);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/quizzes/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteQuiz(paramId(req.params.id));
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
      const question = await storage.updateQuestion(paramId(req.params.id), req.body);
      res.json(question);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/questions/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteQuestion(paramId(req.params.id));
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
        await storage.createNotification({
          userId: req.user!.userId,
          title: "Quiz Completed",
          message: `You scored ${score}/${totalMarks} in ${quiz.title}`,
          type: "info",
        });
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

  app.delete("/api/coupons/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.updateCoupon(paramId(req.params.id), { isActive: false });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/coupons/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const coupon = await storage.updateCoupon(paramId(req.params.id), req.body);
      res.json(coupon);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/banners", authMiddleware, adminMiddleware, uploadImage.single("file"), async (req: Request, res: Response) => {
    try {
      let imageUrl = req.body.imageUrl;
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer, "lms/banners", { resourceType: "image" });
        imageUrl = result.url;
      }
      const banner = await storage.createBanner({ ...req.body, imageUrl, createdBy: req.user!.userId });
      res.json(banner);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/banners", async (req: Request, res: Response) => {
    try {
      const activeOnly = req.query.active === "true";
      const banners = await storage.getBanners(activeOnly);
      res.json(banners);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/banners/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const banner = await storage.updateBanner(paramId(req.params.id), req.body);
      res.json(banner);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/banners/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteBanner(paramId(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/all-assignments", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (req.user!.role === "admin") {
        const assignments = await storage.getAllAssignments();
        return res.json(assignments);
      }
      const assignments = await storage.getAssignmentsForUser(req.user!.userId);
      res.json(assignments);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/all-quizzes", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (req.user!.role === "admin") {
        const quizzes = await storage.getAllQuizzes();
        return res.json(quizzes);
      }
      const quizzes = await storage.getQuizzesForUser(req.user!.userId);
      res.json(quizzes);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/groups/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteGroup(paramId(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/meetings", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const { scheduledAt, ...rest } = req.body;
      const parsedDate = scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 86400000);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      const meeting = await storage.createMeeting({ ...rest, scheduledAt: parsedDate, createdBy: req.user!.userId });
      res.json(meeting);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/meetings", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (req.user!.role === "admin") {
        const courseId = req.query.courseId ? parseInt(req.query.courseId as string) : undefined;
        const meetings = await storage.getMeetings(courseId);
        return res.json(meetings);
      }
      const meetings = await storage.getMeetingsForUser(req.user!.userId);
      res.json(meetings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/meetings/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteMeeting(paramId(req.params.id));
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
      const records = await storage.getAttendanceByMeeting(paramId(req.params.meetingId));
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
      const n = await storage.markNotificationRead(paramId(req.params.id));
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
      const messages = await storage.getMessages(req.user!.userId, paramId(req.params.partnerId));
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
    const io = req.app.get("io");

    const msg = await storage.createMessage({
      ...req.body,
      senderId: req.user!.userId,
    });

    if (msg.receiverId) {
      io.to(`user-${msg.receiverId}`).emit("new-message", msg);
      io.to(`user-${msg.senderId}`).emit("new-message", msg);
    }
    if (msg.groupId) {
      io.to(`group-${msg.groupId}`).emit("new-group-message", msg);
    }


    res.json(msg);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});


  app.get("/api/groups", authMiddleware, async (_req: Request, res: Response) => {
    try {
      const groups = await storage.getGroups();
      const groupsWithCount = await Promise.all(
        groups.map(async (g) => {
          const members = await storage.getGroupMembers(g.id);
          return { ...g, memberCount: members.length };
        })
      );
      res.json(groupsWithCount);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/groups", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const group = await storage.createGroup({ ...req.body, createdBy: req.user!.userId });
      await storage.addGroupMember({ groupId: group.id, userId: req.user!.userId });
      res.json(group);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Group Member routes
  app.post("/api/groups/:id/members", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const groupId = paramId(req.params.id);
      const { userId } = req.body;
      await storage.addGroupMember({ groupId, userId: req.user!.userId });
      const member = await storage.addGroupMember({ groupId, userId });
      await storage.createNotification({
        userId,
        title: "Added to Group",
        message: `You have been added to a group`,
        type: "info",
      });
      res.json(member);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/groups/:id/members/:userId", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const groupId = paramId(req.params.id);
      const userId = paramId(req.params.userId);
      await storage.removeGroupMember(groupId, userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/groups/:id/members", authMiddleware, async (req: Request, res: Response) => {
    try {
      const groupId = paramId(req.params.id);
      const members = await storage.getGroupMembers(groupId);
      res.json(members);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/groups/:id/call", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const groupId = paramId(req.params.id);
      const group = await storage.getGroupById(groupId);
      if (!group) return res.status(404).json({ message: "Group not found" });
      const members = await storage.getGroupMembers(groupId);
      const { callType } = req.body;
      const label = callType === "video" ? "Video Call" : "Voice Call";
      for (const member of members) {
        const userId = (member as any).userId || (member as any).id;
        if (userId && userId !== req.user!.userId) {
          await storage.createNotification({
            userId,
            title: `${label} Started`,
            message: `A ${label.toLowerCase()} has been started in "${group.name}". Join now!`,
            type: "meeting",
          });
        }
      }
      res.json({ message: `${label} notification sent to ${members.length} members` });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/my-groups", authMiddleware, async (req: Request, res: Response) => {
    try {
      const groups = await storage.getGroupsByUser(req.user!.userId);
      res.json(groups);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Leave Request routes
  app.post("/api/leave-requests", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { date, reason } = req.body;
      const leaveRequest = await storage.createLeaveRequest({ userId: req.user!.userId, date, reason });
      res.json(leaveRequest);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/leave-requests", authMiddleware, async (req: Request, res: Response) => {
    try {
      if (req.user!.role === "admin") {
        const leaveRequests = await storage.getAllLeaveRequests();
        const flat = leaveRequests.map((lr: any) => ({
          ...lr.leaveRequest,
          user: lr.user,
          userName: lr.user?.name,
        }));
        return res.json(flat);
      }
      const leaveRequests = await storage.getLeaveRequestsByUser(req.user!.userId);
      res.json(leaveRequests);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/leave-requests/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const leaveRequest = await storage.updateLeaveRequest(paramId(req.params.id), { status, reviewedBy: req.user!.userId });
      if (leaveRequest && status === "approved") {
        await storage.markDailyAttendance({ userId: leaveRequest.userId, date: leaveRequest.date, status: "holiday" });
      }
      if (leaveRequest) {
        await storage.createNotification({
          userId: leaveRequest.userId,
          title: "Leave Request " + (status === "approved" ? "Approved" : "Rejected"),
          message: `Your leave request for ${leaveRequest.date} has been ${status}`,
          type: status === "approved" ? "success" : "warning",
        });
      }
      res.json(leaveRequest);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Attendance Streak routes
  app.post("/api/attendance-streak", authMiddleware, async (req: Request, res: Response) => {
    try {
      const date = req.body.date || new Date().toISOString().split("T")[0];
      const record = await storage.markDailyAttendance({ userId: req.user!.userId, date });
      res.json(record);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/attendance-streak", authMiddleware, async (req: Request, res: Response) => {
    try {
      const records = await storage.getAttendanceStreakByUser(req.user!.userId);
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/attendance-streak/stats", authMiddleware, async (req: Request, res: Response) => {
    try {
      const stats = await storage.calculateStreak(req.user!.userId);
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Roadmap routes
  app.post("/api/roadmaps", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const { userId, items } = req.body;
      await storage.deleteRoadmapsByUser(userId);
      const roadmap = await storage.createRoadmap({ userId, createdBy: req.user!.userId });
      if (items && Array.isArray(items)) {
        for (let i = 0; i < items.length; i++) {
          await storage.addRoadmapItem({
            roadmapId: roadmap.id,
            courseId: items[i].courseId,
            orderIndex: items[i].orderIndex ?? i,
            isUnlocked: i === 0,
          });
        }
      }
      await storage.createNotification({
        userId,
        title: "Roadmap Created",
        message: "A learning roadmap has been created for you",
        type: "info",
      });
      res.json(roadmap);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/roadmaps", authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
    try {
      const rawRoadmaps = await storage.getAllRoadmaps();
      const roadmapsWithItems = await Promise.all(
        rawRoadmaps.map(async (r: any) => {
          const items = await storage.getRoadmapItems(r.roadmap.id);
          const flatItems = items.map((i: any) => ({
            id: i.roadmapItem.id,
            roadmapId: i.roadmapItem.roadmapId,
            courseId: i.roadmapItem.courseId,
            orderIndex: i.roadmapItem.orderIndex,
            isUnlocked: i.roadmapItem.isUnlocked,
            isCompleted: i.roadmapItem.isCompleted,
            unlockRequested: i.roadmapItem.unlockRequested,
            unlockRequestedAt: i.roadmapItem.unlockRequestedAt,
            unlockedAt: i.roadmapItem.unlockedAt,
            completedAt: i.roadmapItem.completedAt,
            brochureUrl: i.roadmapItem.brochureUrl,
            videoUrl: i.roadmapItem.videoUrl,
            cheatSheetUrl: i.roadmapItem.cheatSheetUrl,
            tipsUrl: i.roadmapItem.tipsUrl,
            telegramLink: i.roadmapItem.telegramLink,
            whatsappLink: i.roadmapItem.whatsappLink,
            course: i.course,
          }));
          return {
            id: r.roadmap.id,
            userId: r.roadmap.userId,
            createdBy: r.roadmap.createdBy,
            createdAt: r.roadmap.createdAt,
            user: r.user,
            items: flatItems,
          };
        })
      );
      res.json(roadmapsWithItems);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/my-roadmap", authMiddleware, async (req: Request, res: Response) => {
    try {
      const roadmap = await storage.getRoadmapByUser(req.user!.userId);
      if (!roadmap) return res.json(null);
      const rawItems = await storage.getRoadmapItems(roadmap.id);
      const items = rawItems.map((i: any) => ({
        id: i.roadmapItem.id,
        roadmapId: i.roadmapItem.roadmapId,
        courseId: i.roadmapItem.courseId,
        orderIndex: i.roadmapItem.orderIndex,
        isUnlocked: i.roadmapItem.isUnlocked,
        isCompleted: i.roadmapItem.isCompleted,
        unlockRequested: i.roadmapItem.unlockRequested,
        unlockRequestedAt: i.roadmapItem.unlockRequestedAt,
        unlockedAt: i.roadmapItem.unlockedAt,
        completedAt: i.roadmapItem.completedAt,
        brochureUrl: i.roadmapItem.brochureUrl,
        videoUrl: i.roadmapItem.videoUrl,
        cheatSheetUrl: i.roadmapItem.cheatSheetUrl,
        tipsUrl: i.roadmapItem.tipsUrl,
        telegramLink: i.roadmapItem.telegramLink,
        whatsappLink: i.roadmapItem.whatsappLink,
        course: i.course,
      }));
      res.json({ ...roadmap, items });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/roadmap-items/:id/request-unlock", authMiddleware, async (req: Request, res: Response) => {
    try {
      const itemId = paramId(req.params.id);
      const item = await storage.updateRoadmapItem(itemId, {
        unlockRequested: true,
        unlockRequestedAt: new Date(),
      } as any);
      if (item) {
        const admins = await storage.getUsers();
        for (const admin of admins) {
          if (admin.role === "admin") {
            await storage.createNotification({
              userId: admin.id,
              title: "Unlock Request",
              message: `A student has requested to unlock a roadmap item`,
              type: "info",
            });
          }
        }
      }
      res.json(item);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/roadmap-items/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const updateData: any = { ...req.body };
      if (updateData.isUnlocked) {
        updateData.unlockedAt = new Date();
        updateData.unlockRequested = false;
      }
      if (updateData.isCompleted) {
        updateData.completedAt = new Date();
      }
      const item = await storage.updateRoadmapItem(paramId(req.params.id), updateData);
      if (item) {
        const allRoadmaps = await storage.getAllRoadmaps();
        const roadmapEntry = allRoadmaps.find((r: any) => {
          const roadmap = r.roadmap || r;
          return roadmap.id === item.roadmapId;
        });
        const userId = roadmapEntry ? ((roadmapEntry as any).roadmap?.userId || (roadmapEntry as any).userId) : null;
        if (userId) {
          const isApproval = updateData.isUnlocked === true;
          const isCompletion = updateData.isCompleted === true;
          await storage.createNotification({
            userId,
            title: isApproval ? "Access Approved" : isCompletion ? "Item Completed" : "Roadmap Updated",
            message: isApproval
              ? "Your unlock request has been approved. You now have access to the next item."
              : isCompletion
              ? "A roadmap item has been marked as completed."
              : "Your roadmap item has been updated.",
            type: "info",
          });
        }
      }
      res.json(item);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/users", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const search = req.query.search as string | undefined;
      const users = await storage.getUsers(search);
      const safeUsers = users.map(({ password, ...rest }: any) => rest);
      res.json(safeUsers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/roadmap-items/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      await storage.deleteRoadmapItem(paramId(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
