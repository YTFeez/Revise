import type { FastifyPluginAsync } from "fastify";
import { CreateCourseSchema, CreateQuizSchema } from "@revise-plus/shared";
import { prisma } from "../prisma.js";
import { requireAdmin } from "../auth.js";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auditLog } from "../lib/audit.js";
import { MAX_LEVEL, totalXpForLevel } from "@revise-plus/shared";

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

  // ---- Users management ----
  const AdminUsersListQuery = z.object({
    q: z.string().optional(),
    take: z.coerce.number().int().min(1).max(200).optional().default(50),
    skip: z.coerce.number().int().min(0).optional().default(0),
  });

  app.get("/admin/users", async (request, reply) => {
    const parsed = AdminUsersListQuery.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "Query invalide" });
    const { q, take, skip } = parsed.data;

    const where = q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as any } },
            { username: { contains: q, mode: "insensitive" as any } },
            { id: { contains: q } },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where: where as any,
      orderBy: [{ updatedAt: "desc" }],
      take,
      skip,
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        level: true,
        totalXp: true,
        coins: true,
        streakDays: true,
        gradeLevel: true,
        equippedBorder: true,
        equippedHat: true,
        equippedBg: true,
        equippedAppBg: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return { users };
  });

  app.get<{ Params: { id: string } }>("/admin/users/:id", async (request, reply) => {
    const u = await prisma.user.findUnique({
      where: { id: request.params.id },
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        level: true,
        totalXp: true,
        coins: true,
        weeklyXp: true,
        streakDays: true,
        gradeLevel: true,
        equippedBorder: true,
        equippedHat: true,
        equippedBg: true,
        equippedAppBg: true,
        avatarJson: true,
        createdAt: true,
        updatedAt: true,
        purchases: { take: 50, orderBy: { createdAt: "desc" }, include: { cosmetic: true } },
        devices: { take: 20, orderBy: { lastSeenAt: "desc" } },
      },
    });
    if (!u) return reply.code(404).send({ error: "Utilisateur introuvable" });
    return { user: u };
  });

  const AdminUserUpdateSchema = z.object({
    email: z.string().email().optional(),
    username: z.string().min(2).max(30).optional(),
    isAdmin: z.boolean().optional(),
    level: z.number().int().min(1).max(MAX_LEVEL).optional(),
    coins: z.number().int().min(0).max(999_999_999).optional(),
    totalXp: z.number().int().min(0).optional(),
    equippedBorder: z.string().nullable().optional(),
    equippedHat: z.string().nullable().optional(),
    equippedBg: z.string().nullable().optional(),
    equippedAppBg: z.string().nullable().optional(),
    avatarJson: z.any().optional(),
  });

  app.patch<{ Params: { id: string } }>("/admin/users/:id", async (request, reply) => {
    const parsed = AdminUserUpdateSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Donnees invalides", issues: parsed.error.issues });
    const data: any = { ...parsed.data };
    if (typeof data.level === "number" && typeof data.totalXp !== "number") {
      data.totalXp = totalXpForLevel(data.level);
    }
    const updated = await prisma.user.update({ where: { id: request.params.id }, data });
    await auditLog({ request, userId: request.userId, action: "ADMIN_ACTION", meta: { kind: "USER_UPDATE", targetUserId: request.params.id, patch: Object.keys(parsed.data) } });
    return reply.send({ ok: true, userId: updated.id });
  });

  const AdminResetPwdSchema = z.object({ newPassword: z.string().min(6).max(200) });
  app.post<{ Params: { id: string } }>("/admin/users/:id/reset-password", async (request, reply) => {
    const parsed = AdminResetPwdSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Mot de passe invalide" });
    const hash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({ where: { id: request.params.id }, data: { passwordHash: hash } });
    await auditLog({ request, userId: request.userId, action: "ADMIN_ACTION", meta: { kind: "USER_RESET_PASSWORD", targetUserId: request.params.id } });
    return reply.send({ ok: true });
  });

  app.delete<{ Params: { id: string } }>("/admin/users/:id", async (request, reply) => {
    if (request.params.id === request.userId) return reply.code(400).send({ error: "Impossible de supprimer ton propre compte" });
    await prisma.user.delete({ where: { id: request.params.id } });
    await auditLog({ request, userId: request.userId, action: "ADMIN_ACTION", meta: { kind: "USER_DELETE", targetUserId: request.params.id } });
    return reply.send({ ok: true });
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
        contentMarkdown: parsed.data.contentMarkdown ?? "",
        contentHtml: parsed.data.contentHtml ?? "",
        contentFormat: parsed.data.contentFormat ?? "HTML",
        order: parsed.data.order,
      },
    });
    return reply.send({ course });
  });

  app.put<{ Params: { id: string } }>("/admin/courses/:id", async (request, reply) => {
    const parsed = CreateCourseSchema.partial({ subjectId: true }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Donnees invalides", issues: parsed.error.issues });
    const data = parsed.data;
    const updated = await prisma.course.update({
      where: { id: request.params.id },
      data: {
        title: data.title,
        slug: data.title ? slugify(data.title) : undefined,
        contentMarkdown: data.contentMarkdown,
        contentHtml: data.contentHtml,
        contentFormat: data.contentFormat,
        order: typeof data.order === "number" ? data.order : undefined,
      },
    });
    return reply.send({ course: updated });
  });

  app.get("/admin/courses", async () => {
    const courses = await prisma.course.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: { subject: true, quizzes: { select: { id: true } } },
      take: 200,
    });
    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      subject: { id: c.subject.id, name: c.subject.name, slug: c.subject.slug },
      quizCount: c.quizzes.length,
      updatedAt: c.updatedAt,
      contentFormat: c.contentFormat,
    }));
  });

  app.get<{ Params: { id: string } }>("/admin/courses/:id", async (request, reply) => {
    const course = await prisma.course.findUnique({ where: { id: request.params.id } });
    if (!course) return reply.code(404).send({ error: "Cours introuvable" });
    return { course };
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

  // Import pack JSON (matieres/cours/quiz/cosmetics/rotation)
  const PackSchema = z.object({
    subjects: z.array(z.object({ slug: z.string(), name: z.string(), icon: z.string().optional(), color: z.string().optional(), gradeLevel: z.string().optional(), order: z.number().optional() })).optional(),
    courses: z.array(z.object({
      subjectSlug: z.string(),
      title: z.string(),
      slug: z.string().optional(),
      contentHtml: z.string().optional(),
      contentMarkdown: z.string().optional(),
      contentFormat: z.enum(["HTML", "MARKDOWN"]).optional(),
      order: z.number().optional(),
    })).optional(),
    quizzes: z.array(z.object({
      courseSlug: z.string(),
      subjectSlug: z.string(),
      title: z.string(),
      type: z.enum(["QUIZ", "EVAL"]).optional(),
      timeLimitSec: z.number().optional(),
      difficulty: z.number().optional(),
      questions: z.array(z.object({
        text: z.string(),
        type: z.enum(["QCM", "VRAI_FAUX", "TEXTE"]).optional(),
        points: z.number().optional(),
        answers: z.array(z.object({ text: z.string(), isCorrect: z.boolean() })).min(2),
      })).min(1),
    })).optional(),
    cosmetics: z.array(z.object({
      slug: z.string(),
      name: z.string(),
      type: z.enum(["BORDER", "HAT", "BG", "APP_BG", "BADGE"]),
      description: z.string().optional(),
      priceCoins: z.number().optional(),
      requiredLevel: z.number().optional(),
      borderClass: z.string().optional(),
      rarity: z.string().optional(),
    })).optional(),
    rotation: z.object({
      startsAt: z.string().optional(), // ISO
      endsAt: z.string().optional(),
      listings: z.array(z.object({
        cosmeticSlug: z.string(),
        priceCoins: z.number(),
        featured: z.boolean().optional(),
        stock: z.number().nullable().optional(),
      })).min(1),
    }).optional(),
  });

  app.post("/admin/packs/import", async (request, reply) => {
    const parsed = PackSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Pack invalide", issues: parsed.error.issues });
    const pack = parsed.data;

    const result: Record<string, number> = { subjects: 0, courses: 0, quizzes: 0, cosmetics: 0, listings: 0 };

    // subjects
    if (pack.subjects?.length) {
      for (const s of pack.subjects) {
        await prisma.subject.upsert({
          where: { slug: s.slug },
          update: { name: s.name, icon: s.icon, color: s.color, order: s.order ?? 0 },
          create: { slug: s.slug, name: s.name, icon: s.icon, color: s.color, order: s.order ?? 0, gradeLevel: (s.gradeLevel as any) ?? "TROISIEME" } as any,
        });
        result.subjects++;
      }
    }

    // courses
    if (pack.courses?.length) {
      for (const c of pack.courses) {
        const subject = await prisma.subject.findUnique({ where: { slug: c.subjectSlug } });
        if (!subject) continue;
        const slug = c.slug ?? slugify(c.title);
        await prisma.course.upsert({
          where: { subjectId_slug: { subjectId: subject.id, slug } },
          update: {
            title: c.title,
            contentHtml: c.contentHtml,
            contentMarkdown: c.contentMarkdown ?? "",
            contentFormat: c.contentFormat ?? "HTML",
            order: c.order ?? 0,
          } as any,
          create: {
            subjectId: subject.id,
            title: c.title,
            slug,
            contentHtml: c.contentHtml,
            contentMarkdown: c.contentMarkdown ?? "",
            contentFormat: c.contentFormat ?? "HTML",
            order: c.order ?? 0,
          } as any,
        });
        result.courses++;
      }
    }

    // cosmetics
    if (pack.cosmetics?.length) {
      for (const c of pack.cosmetics) {
        await prisma.cosmetic.upsert({
          where: { slug: c.slug },
          update: { ...c } as any,
          create: { ...c } as any,
        });
        result.cosmetics++;
      }
    }

    // quizzes
    if (pack.quizzes?.length) {
      for (const q of pack.quizzes) {
        const subject = await prisma.subject.findUnique({ where: { slug: q.subjectSlug } });
        if (!subject) continue;
        const course = await prisma.course.findUnique({ where: { subjectId_slug: { subjectId: subject.id, slug: q.courseSlug } } });
        if (!course) continue;
        await prisma.quiz.create({
          data: {
            courseId: course.id,
            title: q.title,
            type: (q.type ?? "QUIZ") as any,
            timeLimitSec: q.timeLimitSec ?? 300,
            difficulty: q.difficulty ?? 1,
            questions: {
              create: q.questions.map((qq, i) => ({
                text: qq.text,
                type: (qq.type ?? "QCM") as any,
                points: qq.points ?? 1,
                order: i + 1,
                answers: { create: qq.answers.map((a, j) => ({ text: a.text, isCorrect: a.isCorrect, order: j + 1 })) },
              })),
            },
          },
        }).catch(() => undefined);
        result.quizzes++;
      }
    }

    // rotation (optionnelle)
    if (pack.rotation) {
      const startsAt = pack.rotation.startsAt ? new Date(pack.rotation.startsAt) : new Date(new Date().setHours(0, 0, 0, 0));
      const endsAt = pack.rotation.endsAt ? new Date(pack.rotation.endsAt) : new Date(startsAt.getTime() + 24 * 60 * 60 * 1000);
      const rotation = await prisma.shopRotation.create({ data: { startsAt, endsAt } });
      for (const l of pack.rotation.listings) {
        const cosmetic = await prisma.cosmetic.findUnique({ where: { slug: l.cosmeticSlug } });
        if (!cosmetic) continue;
        await prisma.shopListing.create({
          data: {
            rotationId: rotation.id,
            cosmeticId: cosmetic.id,
            priceCoins: l.priceCoins,
            featured: l.featured ?? false,
            stock: l.stock ?? null,
          },
        });
        result.listings++;
      }
    }

    return reply.send({ ok: true, result });
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
