import type { FastifyPluginAsync } from "fastify";
import { CreateCourseSchema, CreateQuizSchema } from "@revise-plus/shared";
import { prisma } from "../prisma.js";
import { requireAdmin } from "../auth.js";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAdmin);

  app.get("/admin/overview", async () => {
    const [users, courses, quizzes, attempts] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.quiz.count(),
      prisma.attempt.count(),
    ]);
    return { users, courses, quizzes, attempts };
  });

  app.post("/admin/courses", async (request, reply) => {
    const parsed = CreateCourseSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Donnees invalides", issues: parsed.error.issues });
    const slug = slugify(parsed.data.title);
    const course = await prisma.course.create({
      data: {
        subjectId: parsed.data.subjectId,
        title: parsed.data.title,
        slug,
        contentMarkdown: parsed.data.contentMarkdown,
        order: parsed.data.order,
      },
    });
    return reply.send({ course });
  });

  app.post("/admin/quizzes", async (request, reply) => {
    const parsed = CreateQuizSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Donnees invalides", issues: parsed.error.issues });
    const data = parsed.data;
    const quiz = await prisma.quiz.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        type: data.type,
        timeLimitSec: data.timeLimitSec,
        difficulty: data.difficulty,
        questions: {
          create: data.questions.map((q, qi) => ({
            text: q.text,
            type: q.type,
            points: q.points,
            order: qi + 1,
            answers: {
              create: q.answers.map((a, ai) => ({
                text: a.text,
                isCorrect: a.isCorrect,
                order: ai + 1,
              })),
            },
          })),
        },
      },
    });
    return reply.send({ quiz });
  });

  app.delete<{ Params: { id: string } }>("/admin/courses/:id", async (request) => {
    await prisma.course.delete({ where: { id: request.params.id } });
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>("/admin/quizzes/:id", async (request) => {
    await prisma.quiz.delete({ where: { id: request.params.id } });
    return { ok: true };
  });
};
