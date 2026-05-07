import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../prisma.js";

export const coursesRoutes: FastifyPluginAsync = async (app) => {
  // liste tous les cours d'une matiere
  app.get<{ Params: { subjectSlug: string } }>("/subjects/:subjectSlug/courses", async (request, reply) => {
    const subject = await prisma.subject.findUnique({
      where: { slug: request.params.subjectSlug },
      include: {
        courses: {
          orderBy: { order: "asc" },
          include: { _count: { select: { quizzes: true } } },
        },
      },
    });
    if (!subject) return reply.code(404).send({ error: "Matiere introuvable" });
    return {
      subject: { id: subject.id, slug: subject.slug, name: subject.name, icon: subject.icon, color: subject.color },
      courses: subject.courses.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        order: c.order,
        quizCount: c._count.quizzes,
      })),
    };
  });

  // detail d'un cours + ses quiz
  app.get<{ Params: { subjectSlug: string; courseSlug: string } }>(
    "/subjects/:subjectSlug/courses/:courseSlug",
    async (request, reply) => {
      const { subjectSlug, courseSlug } = request.params;
      const subject = await prisma.subject.findUnique({ where: { slug: subjectSlug } });
      if (!subject) return reply.code(404).send({ error: "Matiere introuvable" });
      const course = await prisma.course.findUnique({
        where: { subjectId_slug: { subjectId: subject.id, slug: courseSlug } },
        include: {
          quizzes: {
            include: { _count: { select: { questions: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      });
      if (!course) return reply.code(404).send({ error: "Cours introuvable" });
      return {
        course: {
          id: course.id,
          slug: course.slug,
          title: course.title,
          contentMarkdown: course.contentMarkdown,
        },
        subject: { id: subject.id, slug: subject.slug, name: subject.name },
        quizzes: course.quizzes.map((q) => ({
          id: q.id,
          title: q.title,
          type: q.type,
          difficulty: q.difficulty,
          timeLimitSec: q.timeLimitSec,
          questionCount: q._count.questions,
        })),
      };
    },
  );
};
