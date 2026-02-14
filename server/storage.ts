import { db } from "./db";
import { eq, desc, asc, and, sql, ilike, gte, lte, isNull, inArray } from "drizzle-orm";
import * as schema from "@shared/schema";


export const storage = {
  async createUser(data: { email: string; password: string; name: string; role?: string }) {
    const [user] = await db.insert(schema.users).values(data).returning();
    return user;
  },

  async getUserByEmail(email: string) {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user;
  },

  async getUserById(id: number) {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  },

  async getUsers(search?: string) {
    if (search) {
      return db.select().from(schema.users).where(ilike(schema.users.name, `%${search}%`)).orderBy(desc(schema.users.createdAt));
    }
    return db.select().from(schema.users).orderBy(desc(schema.users.createdAt));
  },

  async updateUser(id: number, data: Partial<schema.User>) {
    const [user] = await db.update(schema.users).set(data).where(eq(schema.users.id, id)).returning();
    return user;
  },

  async getAdminStats() {
    const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.users);
    const [studentCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.users).where(eq(schema.users.role, "student"));
    const [courseCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.courses);
    const [enrollmentCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.enrollments);
    const [attendanceCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.attendance);
    const [submissionCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.submissions);
    const [reviewedSubs] = await db.select({
      count: sql<number>`count(*)::int`,
      totalMarks: sql<number>`coalesce(sum(marks), 0)::int`,
    }).from(schema.submissions).where(eq(schema.submissions.status, "reviewed"));
    const enrollments = await db.select({ courseId: schema.enrollments.courseId }).from(schema.enrollments);
    const courseIds = [...new Set(enrollments.map(e => e.courseId))];
    let totalRevenue = 0;
    if (courseIds.length > 0) {
      const coursePrices = await db.select({ id: schema.courses.id, price: schema.courses.price }).from(schema.courses).where(inArray(schema.courses.id, courseIds));
      for (const enrollment of enrollments) {
        const course = coursePrices.find(c => c.id === enrollment.courseId);
        if (course?.price) totalRevenue += Number(course.price);
      }
    }
    return {
      totalUsers: userCount.count,
      totalStudents: studentCount.count,
      totalCourses: courseCount.count,
      totalEnrollments: enrollmentCount.count,
      totalAttendance: attendanceCount.count,
      totalSubmissions: submissionCount.count,
      reviewedSubmissions: reviewedSubs.count,
      totalAssignmentMarks: reviewedSubs.totalMarks,
      totalRevenue,
    };
  },

  async createCourse(data: { title: string; description: string; imageUrl?: string; price?: number; createdBy: number; isPublished?: boolean }) {
    const [course] = await db.insert(schema.courses).values(data).returning();
    return course;
  },

  async getCourses(publishedOnly = false) {
    if (publishedOnly) {
      return db.select().from(schema.courses).where(eq(schema.courses.isPublished, true)).orderBy(desc(schema.courses.createdAt));
    }
    return db.select().from(schema.courses).orderBy(desc(schema.courses.createdAt));
  },

  async getCourseById(id: number) {
    const [course] = await db.select().from(schema.courses).where(eq(schema.courses.id, id));
    return course;
  },

  async updateCourse(id: number, data: Partial<schema.Course>) {
    const [course] = await db.update(schema.courses).set(data).where(eq(schema.courses.id, id)).returning();
    return course;
  },

  async deleteCourse(id: number) {
    await db.delete(schema.courses).where(eq(schema.courses.id, id));
  },

  async createModule(data: { courseId: number; title: string; description?: string; orderIndex?: number }) {
    const [mod] = await db.insert(schema.modules).values(data).returning();
    return mod;
  },

  async getModulesByCourse(courseId: number) {
    return db.select().from(schema.modules).where(eq(schema.modules.courseId, courseId)).orderBy(asc(schema.modules.orderIndex));
  },

  async updateModule(id: number, data: Partial<schema.Module>) {
    const [mod] = await db.update(schema.modules).set(data).where(eq(schema.modules.id, id)).returning();
    return mod;
  },

  async deleteModule(id: number) {
    await db.delete(schema.modules).where(eq(schema.modules.id, id));
  },

  async createLesson(data: { moduleId: number; title: string; content?: string; videoUrl?: string; documentUrl?: string; orderIndex?: number }) {
    const [lesson] = await db.insert(schema.lessons).values(data).returning();
    return lesson;
  },

  async getLessonsByModule(moduleId: number) {
    return db.select().from(schema.lessons).where(eq(schema.lessons.moduleId, moduleId)).orderBy(asc(schema.lessons.orderIndex));
  },

  async updateLesson(id: number, data: Partial<schema.Lesson>) {
    const [lesson] = await db.update(schema.lessons).set(data).where(eq(schema.lessons.id, id)).returning();
    return lesson;
  },

  async deleteLesson(id: number) {
    await db.delete(schema.lessons).where(eq(schema.lessons.id, id));
  },

  async enrollUser(userId: number, courseId: number) {
    const existing = await db.select().from(schema.enrollments).where(and(eq(schema.enrollments.userId, userId), eq(schema.enrollments.courseId, courseId)));
    if (existing.length > 0) return existing[0];
    const [enrollment] = await db.insert(schema.enrollments).values({ userId, courseId }).returning();
    return enrollment;
  },

  async getEnrollmentsByUser(userId: number) {
    return db.select({
      enrollment: schema.enrollments,
      course: schema.courses,
    }).from(schema.enrollments)
      .innerJoin(schema.courses, eq(schema.enrollments.courseId, schema.courses.id))
      .where(eq(schema.enrollments.userId, userId));
  },

  async getEnrollment(userId: number, courseId: number) {
    const [e] = await db.select().from(schema.enrollments).where(and(eq(schema.enrollments.userId, userId), eq(schema.enrollments.courseId, courseId)));
    return e;
  },

  async updateEnrollment(id: number, data: Partial<schema.Enrollment>) {
    const [e] = await db.update(schema.enrollments).set(data).where(eq(schema.enrollments.id, id)).returning();
    return e;
  },

  async createAssignment(data: { courseId: number; title: string; description: string; dueDate?: Date | null; maxMarks?: number; createdBy: number }) {
    const [a] = await db.insert(schema.assignments).values(data).returning();
    return a;
  },

  async getAssignmentsByCourse(courseId: number) {
    return db.select().from(schema.assignments).where(eq(schema.assignments.courseId, courseId)).orderBy(desc(schema.assignments.createdAt));
  },

  async getAssignmentById(id: number) {
    const [a] = await db.select().from(schema.assignments).where(eq(schema.assignments.id, id));
    return a;
  },

  async updateAssignment(id: number, data: Partial<schema.Assignment>) {
    const [a] = await db.update(schema.assignments).set(data).where(eq(schema.assignments.id, id)).returning();
    return a;
  },

  async deleteAssignment(id: number) {
    await db.delete(schema.assignments).where(eq(schema.assignments.id, id));
  },

  async createSubmission(data: { assignmentId: number; userId: number; content?: string; fileUrl?: string; status?: string }) {
    const [s] = await db.insert(schema.submissions).values({ ...data, status: data.status || "submitted" }).returning();
    return s;
  },

  async getSubmissionsByAssignment(assignmentId: number) {
    return db.select({
      submission: schema.submissions,
      user: { id: schema.users.id, name: schema.users.name, email: schema.users.email },
    }).from(schema.submissions)
      .innerJoin(schema.users, eq(schema.submissions.userId, schema.users.id))
      .where(eq(schema.submissions.assignmentId, assignmentId));
  },

  async getSubmissionByUser(assignmentId: number, userId: number) {
    const [s] = await db.select().from(schema.submissions).where(and(eq(schema.submissions.assignmentId, assignmentId), eq(schema.submissions.userId, userId)));
    return s;
  },

  async updateSubmission(id: number, data: Partial<schema.Submission>) {
    const [s] = await db.update(schema.submissions).set(data).where(eq(schema.submissions.id, id)).returning();
    return s;
  },

  async createQuiz(data: { courseId: number; title: string; description?: string; timeLimit?: number; negativeMarking?: boolean; isPublished?: boolean; createdBy: number }) {
    const [q] = await db.insert(schema.quizzes).values(data).returning();
    return q;
  },

  async getQuizzesByCourse(courseId: number) {
    return db.select().from(schema.quizzes).where(eq(schema.quizzes.courseId, courseId)).orderBy(desc(schema.quizzes.createdAt));
  },

  async getQuizById(id: number) {
    const [q] = await db.select().from(schema.quizzes).where(eq(schema.quizzes.id, id));
    return q;
  },

  async updateQuiz(id: number, data: Partial<schema.Quiz>) {
    const [q] = await db.update(schema.quizzes).set(data).where(eq(schema.quizzes.id, id)).returning();
    return q;
  },

  async deleteQuiz(id: number) {
    await db.delete(schema.quizzes).where(eq(schema.quizzes.id, id));
  },

  async createQuestion(data: { quizId: number; text: string; options: string[]; correctAnswer: number; marks?: number; orderIndex?: number }) {
    const [q] = await db.insert(schema.questions).values(data).returning();
    return q;
  },

  async getQuestionsByQuiz(quizId: number) {
    return db.select().from(schema.questions).where(eq(schema.questions.quizId, quizId)).orderBy(asc(schema.questions.orderIndex));
  },

  async updateQuestion(id: number, data: Partial<schema.Question>) {
    const [q] = await db.update(schema.questions).set(data).where(eq(schema.questions.id, id)).returning();
    return q;
  },

  async deleteQuestion(id: number) {
    await db.delete(schema.questions).where(eq(schema.questions.id, id));
  },

  async createQuizAttempt(data: { quizId: number; userId: number }) {
    const [a] = await db.insert(schema.quizAttempts).values(data).returning();
    return a;
  },

  async getQuizAttempt(quizId: number, userId: number) {
    const [a] = await db.select().from(schema.quizAttempts).where(and(eq(schema.quizAttempts.quizId, quizId), eq(schema.quizAttempts.userId, userId))).orderBy(desc(schema.quizAttempts.startedAt));
    return a;
  },

  async updateQuizAttempt(id: number, data: Partial<schema.QuizAttempt>) {
    const [a] = await db.update(schema.quizAttempts).set(data).where(eq(schema.quizAttempts.id, id)).returning();
    return a;
  },

  async createCoupon(data: { code: string; courseId: number; maxUses?: number; expiresAt?: Date | null; createdBy: number }) {
    const [c] = await db.insert(schema.coupons).values(data).returning();
    return c;
  },

  async getCoupons() {
    return db.select({
      coupon: schema.coupons,
      course: { id: schema.courses.id, title: schema.courses.title },
    }).from(schema.coupons)
      .innerJoin(schema.courses, eq(schema.coupons.courseId, schema.courses.id))
      .orderBy(desc(schema.coupons.createdAt));
  },

  async getCouponByCode(code: string) {
    const [c] = await db.select().from(schema.coupons).where(eq(schema.coupons.code, code));
    return c;
  },

  async updateCoupon(id: number, data: Partial<schema.Coupon>) {
    const [c] = await db.update(schema.coupons).set(data).where(eq(schema.coupons.id, id)).returning();
    return c;
  },

  async createMeeting(data: { title: string; description?: string; link: string; courseId?: number; groupId?: number; assignedUserId?: number; assignTo?: string; meetingType?: string; scheduledAt: Date; createdBy: number }) {
    const [m] = await db.insert(schema.meetings).values(data).returning();
    return m;
  },

  async getMeetings(courseId?: number) {
    if (courseId) {
      return db.select().from(schema.meetings).where(eq(schema.meetings.courseId, courseId)).orderBy(desc(schema.meetings.scheduledAt));
    }
    return db.select().from(schema.meetings).orderBy(desc(schema.meetings.scheduledAt));
  },

  async getMeetingById(id: number) {
    const [m] = await db.select().from(schema.meetings).where(eq(schema.meetings.id, id));
    return m;
  },

  async deleteMeeting(id: number) {
    await db.delete(schema.meetings).where(eq(schema.meetings.id, id));
  },

  async markAttendance(data: { meetingId: number; userId: number }) {
    const existing = await db.select().from(schema.attendance).where(and(eq(schema.attendance.meetingId, data.meetingId), eq(schema.attendance.userId, data.userId)));
    if (existing.length > 0) return existing[0];
    const [a] = await db.insert(schema.attendance).values(data).returning();
    await this.updateLeaderboard(data.userId, {
      attendancePoints: 5, // give 5 points per attendance
    });
    return a;
  },

  async getAttendanceByMeeting(meetingId: number) {
    return db.select({
      attendance: schema.attendance,
      user: { id: schema.users.id, name: schema.users.name, email: schema.users.email },
    }).from(schema.attendance)
      .innerJoin(schema.users, eq(schema.attendance.userId, schema.users.id))
      .where(eq(schema.attendance.meetingId, meetingId));
  },

  async getAttendanceByUser(userId: number) {
    return db.select({
      attendance: schema.attendance,
      meeting: schema.meetings,
    }).from(schema.attendance)
      .innerJoin(schema.meetings, eq(schema.attendance.meetingId, schema.meetings.id))
      .where(eq(schema.attendance.userId, userId));
  },

  async createGroup(data: { name: string; description?: string; createdBy: number }) {
    const [g] = await db.insert(schema.groups).values(data).returning();
    return g;
  },

  async getGroups() {
    return db.select().from(schema.groups).orderBy(desc(schema.groups.createdAt));
  },

  async createMessage(data: {
  senderId: number;
  receiverId?: number | null;
  groupId?: number | null;
  content?: string | null;
  mediaUrl?: string | null;
  messageType?: string;
}) {
  const [m] = await db.insert(schema.messages).values({
    senderId: data.senderId,
    receiverId: data.receiverId || null,
    groupId: data.groupId || null,
    content: data.content || null,
    mediaUrl: data.mediaUrl || null,
    messageType: data.messageType || "text",
    isDelivered: false,
    isSeen: false,
  }).returning();

  return m;
},

async markDelivered(messageId: number) {
  return db.update(schema.messages)
    .set({
      isDelivered: true,
      deliveredAt: new Date(),
    })
    .where(eq(schema.messages.id, messageId));
},

async markSeen(messageId: number) {
  return db.update(schema.messages)
    .set({
      isSeen: true,
      seenAt: new Date(),
    })
    .where(eq(schema.messages.id, messageId));
},

// ================= MESSAGE EDIT =================
async editMessage(messageId: number, newContent: string) {
  const [m] = await db.update(schema.messages)
    .set({
      content: newContent,
      edited: true,
    })
    .where(eq(schema.messages.id, messageId))
    .returning();

  return m;
},

// ================= MESSAGE DELETE =================
async deleteMessage(messageId: number) {
  const [m] = await db.update(schema.messages)
    .set({
      deleted: true,
      content: "This message was deleted",
      mediaUrl: null,
    })
    .where(eq(schema.messages.id, messageId))
    .returning();

  return m;
},

// ================= MESSAGE REACTION =================
async toggleReaction(messageId: number, userId: number, emoji: string) {

  const [msg] = await db.select()
    .from(schema.messages)
    .where(eq(schema.messages.id, messageId));

  const reactions = (msg?.reactions || []) as any[];

  const existing = reactions.find(
    (r) => r.userId === userId && r.emoji === emoji
  );

  let updated;

  if (existing) {
    // remove reaction
    updated = reactions.filter(
      (r) => !(r.userId === userId && r.emoji === emoji)
    );
  } else {
    // add reaction
    updated = [...reactions, { userId, emoji }];
  }

  const [m] = await db.update(schema.messages)
    .set({ reactions: updated })
    .where(eq(schema.messages.id, messageId))
    .returning();

  return m;
},



  // async getMessages(userId1: number, userId2: number) {

  //   return db.select().from(schema.messages)
  //     .where(
  //       sql`(${schema.messages.senderId} = ${userId1} AND ${schema.messages.receiverId} = ${userId2}) OR (${schema.messages.senderId} = ${userId2} AND ${schema.messages.receiverId} = ${userId1})`
  //     )
  //     .orderBy(desc(schema.messages.createdAt));
  // },

  async getMessages(userId1: number, userId2: number) {
  return db.select({
    id: schema.messages.id,
    senderId: schema.messages.senderId,
    receiverId: schema.messages.receiverId,
    groupId: schema.messages.groupId,
    content: schema.messages.content,
    mediaUrl: schema.messages.mediaUrl,
    messageType: schema.messages.messageType,
    createdAt: schema.messages.createdAt,
    senderName: schema.users.name,
      // 🔥 ADD THESE
  isDelivered: schema.messages.isDelivered,
  isSeen: schema.messages.isSeen,
  deliveredAt: schema.messages.deliveredAt,
  seenAt: schema.messages.seenAt,
  edited: schema.messages.edited,
  deleted: schema.messages.deleted,
  reactions: schema.messages.reactions,
  })

    .from(schema.messages)
    .innerJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
    .where(
      sql`(${schema.messages.senderId} = ${userId1} AND ${schema.messages.receiverId} = ${userId2})
       OR
       (${schema.messages.senderId} = ${userId2} AND ${schema.messages.receiverId} = ${userId1})`
    )
    .orderBy(asc(schema.messages.createdAt));
},


  // async getGroupMessages(groupId: number) {

  //   return db.select({
  //     message: schema.messages,
  //     sender: { id: schema.users.id, name: schema.users.name },
  //   }).from(schema.messages)
  //     .innerJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
  //     .where(eq(schema.messages.groupId, groupId))
  //     .orderBy(asc(schema.messages.createdAt));
  // },

  async getGroupMessages(groupId: number) {
  return db.select({
    id: schema.messages.id,
    senderId: schema.messages.senderId,
    receiverId: schema.messages.receiverId,
    groupId: schema.messages.groupId,
    content: schema.messages.content,
    mediaUrl: schema.messages.mediaUrl,
    messageType: schema.messages.messageType,
    createdAt: schema.messages.createdAt,
    senderName: schema.users.name,

      isDelivered: schema.messages.isDelivered,
    isSeen: schema.messages.isSeen,
    deliveredAt: schema.messages.deliveredAt,
    seenAt: schema.messages.seenAt,
    edited: schema.messages.edited,
    deleted: schema.messages.deleted,
    reactions: schema.messages.reactions,

  })
    .from(schema.messages)
    .innerJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
    .where(eq(schema.messages.groupId, groupId))
    .orderBy(asc(schema.messages.createdAt));
},


  async getChatList(userId: number) {
    const sent = await db.select({
      partnerId: schema.messages.receiverId,
    }).from(schema.messages)
      .where(and(eq(schema.messages.senderId, userId), sql`${schema.messages.receiverId} IS NOT NULL`));

    const received = await db.select({
      partnerId: schema.messages.senderId,
    }).from(schema.messages)
      .where(eq(schema.messages.receiverId, userId));

    const partnerIds = [...new Set([
      ...sent.map(s => s.partnerId).filter(Boolean),
      ...received.map(r => r.partnerId),
    ])] as number[];

    if (partnerIds.length === 0) return [];

    const partners = await db.select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
    }).from(schema.users)
      .where(sql`${schema.users.id} IN (${sql.join(partnerIds.map(id => sql`${id}`), sql`, `)})`);

    return partners;
  },

  async createNotification(data: { userId: number; title: string; message: string; type?: string }) {
    const [n] = await db.insert(schema.notifications).values(data).returning();
    return n;
  },

  async getNotificationsByUser(userId: number) {
    return db.select().from(schema.notifications).where(eq(schema.notifications.userId, userId)).orderBy(desc(schema.notifications.createdAt));
  },

  async markNotificationRead(id: number) {
    const [n] = await db.update(schema.notifications).set({ isRead: true }).where(eq(schema.notifications.id, id)).returning();
    return n;
  },

  async markAllNotificationsRead(userId: number) {
    await db.update(schema.notifications).set({ isRead: true }).where(eq(schema.notifications.userId, userId));
  },

  async getUnreadNotificationCount(userId: number) {
    const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.notifications).where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.isRead, false)));
    return result.count;
  },

  async getLeaderboard() {
    return db.select({
      entry: schema.leaderboard,
      user: { id: schema.users.id, name: schema.users.name, email: schema.users.email, photoUrl: schema.users.photoUrl },
    }).from(schema.leaderboard)
      .innerJoin(schema.users, eq(schema.leaderboard.userId, schema.users.id))
      .orderBy(desc(schema.leaderboard.totalPoints));
  },

 async updateLeaderboard(userId: number, points: Partial<{
  attendancePoints: number;
  assignmentPoints: number;
  quizPoints: number;
  streakPoints: number;
}>) {

  const existing = await db.select()
    .from(schema.leaderboard)
    .where(eq(schema.leaderboard.userId, userId));

  if (existing.length === 0) {

    const attendancePoints = points.attendancePoints || 0;
    const assignmentPoints = points.assignmentPoints || 0;
    const quizPoints = points.quizPoints || 0;
    const streakPoints = points.streakPoints || 0;

    const totalPoints =
      attendancePoints +
      assignmentPoints +
      quizPoints +
      streakPoints;

    const [entry] = await db.insert(schema.leaderboard)
      .values({
        userId,
        attendancePoints,
        assignmentPoints,
        quizPoints,
        streakPoints,
        totalPoints,
        updatedAt: new Date(),
      })
      .returning();

    return entry;
  }

  const current = existing[0];

  const updated = {
    attendancePoints:
  current.attendancePoints + (points.attendancePoints || 0),

      assignmentPoints:
    points.assignmentPoints !== undefined
      ? points.assignmentPoints
      : current.assignmentPoints,


    quizPoints:
      current.quizPoints + (points.quizPoints || 0),

    streakPoints:
      current.streakPoints + (points.streakPoints || 0),
  };

  const totalPoints =
    updated.attendancePoints +
    updated.assignmentPoints +
    updated.quizPoints +
    updated.streakPoints;

  const [entry] = await db.update(schema.leaderboard)
    .set({
      ...updated,
      totalPoints,
      updatedAt: new Date(),
    })
    .where(eq(schema.leaderboard.userId, userId))
    .returning();

  return entry;
},



  async createBanner(data: { title: string; subtitle?: string; imageUrl?: string; link?: string; isActive?: boolean; createdBy: number }) {
    const [b] = await db.insert(schema.banners).values(data).returning();
    return b;
  },

  async getBanners(activeOnly = false) {
    if (activeOnly) {
      return db.select().from(schema.banners).where(eq(schema.banners.isActive, true)).orderBy(desc(schema.banners.createdAt));
    }
    return db.select().from(schema.banners).orderBy(desc(schema.banners.createdAt));
  },

  async updateBanner(id: number, data: Partial<schema.Banner>) {
    const [b] = await db.update(schema.banners).set(data).where(eq(schema.banners.id, id)).returning();
    return b;
  },

  async deleteBanner(id: number) {
    await db.delete(schema.banners).where(eq(schema.banners.id, id));
  },

  async getAllAssignments() {
    return db.select({
      assignment: schema.assignments,
      course: { id: schema.courses.id, title: schema.courses.title },
    }).from(schema.assignments)
      .innerJoin(schema.courses, eq(schema.assignments.courseId, schema.courses.id))
      .orderBy(desc(schema.assignments.createdAt));
  },

  async getAllQuizzes() {
    return db.select({
      quiz: schema.quizzes,
      course: { id: schema.courses.id, title: schema.courses.title },
    }).from(schema.quizzes)
      .innerJoin(schema.courses, eq(schema.quizzes.courseId, schema.courses.id))
      .orderBy(desc(schema.quizzes.createdAt));
  },

  async getAssignmentsForUser(userId: number) {
    const enrolled = await db.select({ courseId: schema.enrollments.courseId }).from(schema.enrollments).where(eq(schema.enrollments.userId, userId));
    if (enrolled.length === 0) return [];
    const courseIds = enrolled.map(e => e.courseId);
    const results = await db.select({
      assignment: schema.assignments,
      course: { id: schema.courses.id, title: schema.courses.title },
    }).from(schema.assignments)
      .innerJoin(schema.courses, eq(schema.assignments.courseId, schema.courses.id))
      .where(sql`${schema.assignments.courseId} IN (${sql.join(courseIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(desc(schema.assignments.createdAt));
    return results.filter(r => {
      const assignedTo = r.assignment.assignedTo;
      if (!assignedTo || assignedTo.length === 0) return true;
      return assignedTo.includes(userId);
    });
  },

  async getQuizzesForUser(userId: number) {
    const enrolled = await db.select({ courseId: schema.enrollments.courseId }).from(schema.enrollments).where(eq(schema.enrollments.userId, userId));
    if (enrolled.length === 0) return [];
    const courseIds = enrolled.map(e => e.courseId);
    const results = await db.select({
      quiz: schema.quizzes,
      course: { id: schema.courses.id, title: schema.courses.title },
    }).from(schema.quizzes)
      .innerJoin(schema.courses, eq(schema.quizzes.courseId, schema.courses.id))
      .where(sql`${schema.quizzes.courseId} IN (${sql.join(courseIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(desc(schema.quizzes.createdAt));
    return results.filter(r => {
      const assignedTo = r.quiz.assignedTo;
      if (!assignedTo || assignedTo.length === 0) return true;
      return assignedTo.includes(userId);
    });
  },

  async deleteGroup(id: number) {
    await db.delete(schema.groups).where(eq(schema.groups.id, id));
  },

  async recalculateRanks() {
    const entries = await db.select().from(schema.leaderboard).orderBy(desc(schema.leaderboard.totalPoints));
    for (let i = 0; i < entries.length; i++) {
      await db.update(schema.leaderboard).set({ rank: i + 1 }).where(eq(schema.leaderboard.id, entries[i].id));
    }
  },

  async addGroupMember(data: { groupId: number; userId: number }) {
    const existing = await db.select().from(schema.groupMembers).where(and(eq(schema.groupMembers.groupId, data.groupId), eq(schema.groupMembers.userId, data.userId)));
    if (existing.length > 0) return existing[0];
    const [m] = await db.insert(schema.groupMembers).values(data).returning();
    return m;
  },

  async removeGroupMember(groupId: number, userId: number) {
    await db.delete(schema.groupMembers).where(and(eq(schema.groupMembers.groupId, groupId), eq(schema.groupMembers.userId, userId)));
  },

  async getGroupById(groupId: number) {
    const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, groupId)).limit(1);
    return group || null;
  },

  async getGroupMembers(groupId: number) {
    return db.select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
    }).from(schema.groupMembers)
      .innerJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
      .where(eq(schema.groupMembers.groupId, groupId));
  },

  async getGroupsByUser(userId: number) {
    return db.select({
      group: schema.groups,
    }).from(schema.groupMembers)
      .innerJoin(schema.groups, eq(schema.groupMembers.groupId, schema.groups.id))
      .where(eq(schema.groupMembers.userId, userId));
  },

  async isGroupMember(groupId: number, userId: number) {
    const [m] = await db.select().from(schema.groupMembers).where(and(eq(schema.groupMembers.groupId, groupId), eq(schema.groupMembers.userId, userId)));
    return !!m;
  },

  async createLeaveRequest(data: { userId: number; date: string; reason: string }) {
    const [lr] = await db.insert(schema.leaveRequests).values(data).returning();
    return lr;
  },

  async getLeaveRequestsByUser(userId: number) {
    return db.select().from(schema.leaveRequests).where(eq(schema.leaveRequests.userId, userId)).orderBy(desc(schema.leaveRequests.createdAt));
  },

  async getAllLeaveRequests() {
    return db.select({
      leaveRequest: schema.leaveRequests,
      user: { id: schema.users.id, name: schema.users.name },
    }).from(schema.leaveRequests)
      .innerJoin(schema.users, eq(schema.leaveRequests.userId, schema.users.id))
      .orderBy(desc(schema.leaveRequests.createdAt));
  },

  async updateLeaveRequest(id: number, data: { status: string; reviewedBy: number }) {
    const [lr] = await db.update(schema.leaveRequests).set({ ...data, reviewedAt: new Date() }).where(eq(schema.leaveRequests.id, id)).returning();
    return lr;
  },

  async getApprovedLeaves(userId: number) {
    return db.select().from(schema.leaveRequests).where(and(eq(schema.leaveRequests.userId, userId), eq(schema.leaveRequests.status, "approved")));
  },

  async markDailyAttendance(data: { userId: number; date: string; status?: string }) {
    const existing = await db.select().from(schema.attendanceStreak).where(and(eq(schema.attendanceStreak.userId, data.userId), eq(schema.attendanceStreak.date, data.date)));
    if (existing.length > 0) {
      const [updated] = await db.update(schema.attendanceStreak).set({ status: data.status || "present" }).where(eq(schema.attendanceStreak.id, existing[0].id)).returning();
      return updated;
    }
    const [a] = await db.insert(schema.attendanceStreak).values({ userId: data.userId, date: data.date, status: data.status || "present" }).returning();
    return a;
  },

  async getAttendanceStreakByUser(userId: number) {
    return db.select().from(schema.attendanceStreak).where(eq(schema.attendanceStreak.userId, userId)).orderBy(desc(schema.attendanceStreak.date));
  },

  async calculateStreak(userId: number) {
    const records = await db.select().from(schema.attendanceStreak).where(eq(schema.attendanceStreak.userId, userId)).orderBy(desc(schema.attendanceStreak.date));
    const totalDays = records.length;
    const totalPresent = records.filter(r => r.status === "present").length;
    let currentStreak = 0;
    for (const record of records) {
      if (record.status === "absent") break;
      if (record.status === "present") currentStreak++;
    }
    return { currentStreak, totalPresent, totalDays };
  },

  async createRoadmap(data: { userId: number; createdBy: number }) {
    const [r] = await db.insert(schema.roadmaps).values(data).returning();
    return r;
  },

  async getRoadmapByUser(userId: number) {
    const [r] = await db.select().from(schema.roadmaps).where(eq(schema.roadmaps.userId, userId)).orderBy(desc(schema.roadmaps.createdAt)).limit(1);
    return r;
  },

  async deleteRoadmapsByUser(userId: number) {
    const userRoadmaps = await db.select({ id: schema.roadmaps.id }).from(schema.roadmaps).where(eq(schema.roadmaps.userId, userId));
    for (const rm of userRoadmaps) {
      await db.delete(schema.roadmapItems).where(eq(schema.roadmapItems.roadmapId, rm.id));
    }
    await db.delete(schema.roadmaps).where(eq(schema.roadmaps.userId, userId));
  },

  async getRoadmapItems(roadmapId: number) {
    return db.select({
      roadmapItem: schema.roadmapItems,
      course: { id: schema.courses.id, title: schema.courses.title, description: schema.courses.description, imageUrl: schema.courses.imageUrl },
    }).from(schema.roadmapItems)
      .innerJoin(schema.courses, eq(schema.roadmapItems.courseId, schema.courses.id))
      .where(eq(schema.roadmapItems.roadmapId, roadmapId))
      .orderBy(asc(schema.roadmapItems.orderIndex));
  },

  async addRoadmapItem(data: { roadmapId: number; courseId: number; orderIndex: number; isUnlocked?: boolean }) {
    const [item] = await db.insert(schema.roadmapItems).values(data).returning();
    return item;
  },

  async updateRoadmapItem(id: number, data: Partial<schema.RoadmapItem>) {
    const [item] = await db.update(schema.roadmapItems).set(data).where(eq(schema.roadmapItems.id, id)).returning();
    return item;
  },

  async deleteRoadmapItem(id: number) {
    await db.delete(schema.roadmapItems).where(eq(schema.roadmapItems.id, id));
  },

  async getAllRoadmaps() {
    return db.select({
      roadmap: schema.roadmaps,
      user: { id: schema.users.id, name: schema.users.name, email: schema.users.email },
    }).from(schema.roadmaps)
      .innerJoin(schema.users, eq(schema.roadmaps.userId, schema.users.id));
  },

  async getMeetingsForUser(userId: number) {
    const enrolled = await db.select({ courseId: schema.enrollments.courseId }).from(schema.enrollments).where(eq(schema.enrollments.userId, userId));
    const courseIds = enrolled.map(e => e.courseId);

    const memberGroups = await db.select({ groupId: schema.groupMembers.groupId }).from(schema.groupMembers).where(eq(schema.groupMembers.userId, userId));
    const groupIds = memberGroups.map(g => g.groupId);

    const conditions: ReturnType<typeof sql>[] = [];

    if (courseIds.length > 0) {
      conditions.push(sql`(${schema.meetings.assignTo} = 'course' AND ${schema.meetings.courseId} IN (${sql.join(courseIds.map(id => sql`${id}`), sql`, `)}))`);
    }

    if (groupIds.length > 0) {
      conditions.push(sql`(${schema.meetings.assignTo} = 'group' AND ${schema.meetings.groupId} IN (${sql.join(groupIds.map(id => sql`${id}`), sql`, `)}))`);
    }

    conditions.push(sql`(${schema.meetings.assignedUserId} = ${userId})`);
    conditions.push(sql`(${schema.meetings.assignTo} = 'course' AND ${schema.meetings.courseId} IS NULL)`);

    return db.select().from(schema.meetings)
      .where(sql`(${sql.join(conditions, sql` OR `)})`)
      .orderBy(desc(schema.meetings.scheduledAt));
  },

  async getAllSubmissions() {
    return db.select({
      submission: schema.submissions,
      user: { id: schema.users.id, name: schema.users.name, email: schema.users.email },
      assignment: { id: schema.assignments.id, title: schema.assignments.title, maxMarks: schema.assignments.maxMarks, courseId: schema.assignments.courseId },
    }).from(schema.submissions)
      .innerJoin(schema.users, eq(schema.submissions.userId, schema.users.id))
      .innerJoin(schema.assignments, eq(schema.submissions.assignmentId, schema.assignments.id))
      .orderBy(desc(schema.submissions.submittedAt));
  },

  async getSubmissionsByUser(userId: number) {
    return db.select({
      submission: schema.submissions,
      assignment: { id: schema.assignments.id, title: schema.assignments.title, maxMarks: schema.assignments.maxMarks, courseId: schema.assignments.courseId },
    }).from(schema.submissions)
      .innerJoin(schema.assignments, eq(schema.submissions.assignmentId, schema.assignments.id))
      .where(eq(schema.submissions.userId, userId))
      .orderBy(desc(schema.submissions.submittedAt));
  },

  async getUserSubmissions(userId: number) {
    return db.select({
      submission: schema.submissions,
      assignment: { id: schema.assignments.id, title: schema.assignments.title, maxMarks: schema.assignments.maxMarks, courseId: schema.assignments.courseId },
    }).from(schema.submissions)
      .innerJoin(schema.assignments, eq(schema.submissions.assignmentId, schema.assignments.id))
      .where(eq(schema.submissions.userId, userId))
      .orderBy(desc(schema.submissions.submittedAt));
  },

  async getQuestionsByQuizAndSet(quizId: number, questionSet?: string) {
    if (questionSet) {
      return db.select().from(schema.questions).where(and(eq(schema.questions.quizId, quizId), eq(schema.questions.questionSet, questionSet))).orderBy(asc(schema.questions.orderIndex));
    }
    return db.select().from(schema.questions).where(eq(schema.questions.quizId, quizId)).orderBy(asc(schema.questions.orderIndex));
  },

   // ================= AI MOCK INTERVIEW =================

  // async createAIInterview(data: {
  //   userId: number;
  //   role: string;
  //   resumeSkills: string[];
  // }) {
  //   const [i] = await db
  //     .insert(schema.aiInterviews)
  //     .values(data)
  //     .returning();
  //   return i;
  // },

  // async saveAIInterviewMessage(data: {
  //   interviewId: number;
  //   sender: "ai" | "user";
  //   message: string;
  //   score?: number;
  //   feedback?: string;
  // }) {
  //   const [m] = await db
  //     .insert(schema.aiInterviewMessages)
  //     .values(data)
  //     .returning();
  //   return m;
  // },

  // async getAIInterviewHistory(interviewId: number) {
  //   return db
  //     .select()
  //     .from(schema.aiInterviewMessages)
  //     .where(eq(schema.aiInterviewMessages.interviewId, interviewId))
  //     .orderBy(asc(schema.aiInterviewMessages.createdAt));
  // },

  // async finishAIInterview(interviewId: number, totalScore: number) {
  //   const [i] = await db
  //     .update(schema.aiInterviews)
  //     .set({ status: "completed", totalScore })
  //     .where(eq(schema.aiInterviews.id, interviewId))
  //     .returning();
  //   return i;
  // },
};
// };

