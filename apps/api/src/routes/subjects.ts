import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../prisma.js";
import { requireAuth } from "../auth.js";
import { levelFromTotalXp, rankForLevel } from "@revise-plus/shared";

export const subjectsRoutes: FastifyPluginAsync = async (app) => {
  // liste des matieres
  app.get("/subjects", async () => {
    const subjects = await prisma.subject.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { courses: true } } },
    });
    return subjects.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      icon: s.icon,
      color: s.color,
      gradeLevel: s.gradeLevel,
      courseCount: s._count.courses,
    }));
  });

  // progression de l'utilisateur par matiere
  app.get(
    "/subjects/progress",
    { preHandler: requireAuth },
    async (request) => {
      const userId = request.userId!;
      const subjects = await prisma.subject.findMany({ orderBy: { order: "asc" } });
      const stats = await prisma.userSubjectStat.findMany({ where: { userId } });
      const statBySubject = new Map(stats.map((s) => [s.subjectId, s]));

      return subjects.map((s) => {
        const stat = statBySubject.get(s.id);
        const totalXp = stat?.totalXp ?? 0;
        const { level, xpInLevel, xpForNext, progressPct } = levelFromTotalXp(totalXp);
        const rank = rankForLevel(level);
        return {
          subjectId: s.id,
          subjectSlug: s.slug,
          subjectName: s.name,
          icon: s.icon,
          color: s.color,
          level,
          totalXp,
          xpInLevel,
          xpForNext,
          progressPct,
          rankName: rank.name,
          cardCount: stat?.cardCount ?? 0,
        };
      });
    },
  );
};
