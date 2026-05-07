import type { FastifyPluginAsync } from "fastify";
import { QuizSubmitSchema, StartAttemptSchema, xpForQuiz, levelFromTotalXp } from "@revise-plus/shared";
import { prisma } from "../prisma.js";
import { requireAuth } from "../auth.js";
import { applyXp } from "../lib/xpService.js";
import { broadcastLevelUp, broadcastLeaderboard } from "../realtime/socket.js";

export const quizzesRoutes: FastifyPluginAsync = async (app) => {
  // liste les quiz / evals globalement (pour pages /quiz et /eval)
  app.get<{ Querystring: { type?: "QUIZ" | "EVAL" } }>("/quizzes", async (request) => {
    const type = request.query.type ?? undefined;
    const quizzes = await prisma.quiz.findMany({
      where: type ? { type } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { questions: true } },
        course: { include: { subject: true } },
      },
    });
    return quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      type: q.type,
      difficulty: q.difficulty,
      timeLimitSec: q.timeLimitSec,
      questionCount: q._count.questions,
      course: {
        id: q.course.id,
        slug: q.course.slug,
        title: q.course.title,
        subject: { id: q.course.subject.id, slug: q.course.subject.slug, name: q.course.subject.name },
      },
    }));
  });

  // demarre un essai
  app.post(
    "/quizzes/start",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = StartAttemptSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: "Donnees invalides" });
      const userId = request.userId!;

      // rate limit: 10 essais / heure / user / quiz
      const recent = await prisma.attempt.count({
        where: {
          userId,
          quizId: parsed.data.quizId,
          startedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });
      if (recent >= 10) return reply.code(429).send({ error: "Trop d'essais sur ce quiz, reviens plus tard." });

      const quiz = await prisma.quiz.findUnique({
        where: { id: parsed.data.quizId },
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: { answers: { orderBy: { order: "asc" } } },
          },
        },
      });
      if (!quiz) return reply.code(404).send({ error: "Quiz introuvable" });

      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + quiz.timeLimitSec * 1000 + 5000); // tolerance 5s

      const attempt = await prisma.attempt.create({
        data: {
          userId,
          quizId: quiz.id,
          startedAt,
          expiresAt,
        },
      });

      return {
        attemptId: attempt.id,
        quiz: {
          id: quiz.id,
          courseId: quiz.courseId,
          title: quiz.title,
          type: quiz.type,
          timeLimitSec: quiz.timeLimitSec,
          difficulty: quiz.difficulty,
          questionCount: quiz.questions.length,
        },
        questions: quiz.questions.map((q) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          points: q.points,
          // on ne renvoie PAS isCorrect au client
          answers: q.answers.map((a) => ({ id: a.id, text: a.text })),
        })),
        startedAt: startedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
    },
  );

  // soumet les reponses
  app.post(
    "/quizzes/submit",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = QuizSubmitSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: "Donnees invalides", issues: parsed.error.issues });
      const userId = request.userId!;
      const { attemptId, answers } = parsed.data;

      const attempt = await prisma.attempt.findUnique({
        where: { id: attemptId },
        include: {
          quiz: {
            include: {
              questions: { include: { answers: true } },
              course: { include: { subject: true } },
            },
          },
        },
      });
      if (!attempt || attempt.userId !== userId) return reply.code(404).send({ error: "Essai introuvable" });
      if (attempt.completedAt) return reply.code(409).send({ error: "Essai deja termine" });

      const now = new Date();
      const expired = now.getTime() > attempt.expiresAt.getTime();
      const durationSec = Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000);

      // scoring
      let totalPoints = 0;
      let earnedPoints = 0;
      let correctCount = 0;
      const answersMap = new Map<string, { answerIds?: string[]; text?: string }>();
      for (const a of answers) answersMap.set(a.questionId, { answerIds: a.answerIds, text: a.text });

      for (const q of attempt.quiz.questions) {
        totalPoints += q.points;
        const submitted = answersMap.get(q.id);
        if (!submitted) continue;
        const correctIds = q.answers.filter((a) => a.isCorrect).map((a) => a.id).sort();
        if (q.type === "TEXTE") {
          // matching simple (case-insensitive trim) sur l'une des bonnes reponses
          const text = (submitted.text ?? "").trim().toLowerCase();
          if (text && q.answers.some((a) => a.isCorrect && a.text.trim().toLowerCase() === text)) {
            earnedPoints += q.points;
            correctCount += 1;
          }
        } else {
          const submittedIds = (submitted.answerIds ?? []).slice().sort();
          const exact = correctIds.length === submittedIds.length && correctIds.every((id, i) => id === submittedIds[i]);
          if (exact) {
            earnedPoints += q.points;
            correctCount += 1;
          }
        }
      }

      const scorePct = expired ? 0 : totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

      // XP / coins
      const timeBonusPct = Math.max(0, Math.min(100, Math.floor(((attempt.quiz.timeLimitSec - durationSec) / attempt.quiz.timeLimitSec) * 100)));
      const xp = expired
        ? 0
        : xpForQuiz({
            scorePct,
            difficulty: attempt.quiz.difficulty,
            isEval: attempt.quiz.type === "EVAL",
            timeBonusPct,
          });

      const xpResult = await applyXp(userId, xp, attempt.quiz.type === "EVAL" ? "EVAL" : "QUIZ", {
        quizId: attempt.quiz.id,
        attemptId,
        scorePct,
      });

      // mise a jour de la stat par matiere
      if (xp > 0) {
        const subjectId = attempt.quiz.course.subject.id;
        const stat = await prisma.userSubjectStat.upsert({
          where: { userId_subjectId: { userId, subjectId } },
          update: { totalXp: { increment: xp }, cardCount: { increment: 1 } },
          create: { userId, subjectId, totalXp: xp, cardCount: 1 },
        });
        const { level } = levelFromTotalXp(stat.totalXp);
        if (level !== stat.level) {
          await prisma.userSubjectStat.update({ where: { id: stat.id }, data: { level } });
        }
      }

      const completed = await prisma.attempt.update({
        where: { id: attemptId },
        data: {
          completedAt: now,
          scorePct,
          correctCount,
          totalQuestions: attempt.quiz.questions.length,
          durationSec,
          xpGained: xp,
          coinsGained: xpResult.coinsGained,
          answersJson: parsed.data.answers as any,
        },
      });

      // realtime
      if (xpResult.leveledUp) {
        broadcastLevelUp({
          userId,
          level: xpResult.levelAfter,
          rankName: xpResult.rankName,
          newRankName: xpResult.newRankName,
        });
      }
      if (xp > 0) broadcastLeaderboard();

      return {
        attemptId: completed.id,
        scorePct,
        correctCount,
        totalQuestions: attempt.quiz.questions.length,
        xpGained: xpResult.xpGained,
        coinsGained: xpResult.coinsGained,
        levelBefore: xpResult.levelBefore,
        levelAfter: xpResult.levelAfter,
        leveledUp: xpResult.leveledUp,
        newRankName: xpResult.newRankName,
        durationSec,
        expired,
      };
    },
  );

  // historique des essais d'un user
  app.get(
    "/me/attempts",
    { preHandler: requireAuth },
    async (request) => {
      const attempts = await prisma.attempt.findMany({
        where: { userId: request.userId!, completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        take: 25,
        include: { quiz: { include: { course: { include: { subject: true } } } } },
      });
      return attempts.map((a) => ({
        id: a.id,
        completedAt: a.completedAt,
        scorePct: a.scorePct,
        xpGained: a.xpGained,
        coinsGained: a.coinsGained,
        durationSec: a.durationSec,
        quiz: {
          id: a.quiz.id,
          title: a.quiz.title,
          type: a.quiz.type,
          subject: a.quiz.course.subject.name,
          subjectSlug: a.quiz.course.subject.slug,
          courseTitle: a.quiz.course.title,
          courseSlug: a.quiz.course.slug,
        },
      }));
    },
  );
};
