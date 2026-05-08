import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Revise+ ...");

  // ---- Subjects ----
  const subjects = [
    { slug: "maths", name: "Maths", icon: "math", color: "emerald", gradeLevel: "TROISIEME", order: 1 },
    { slug: "francais", name: "Francais", icon: "book", color: "rose", gradeLevel: "TROISIEME", order: 2 },
    { slug: "physique-chimie", name: "Physique-Chimie", icon: "atom", color: "violet", gradeLevel: "TROISIEME", order: 3 },
    { slug: "histoire-geo", name: "Histoire-Geo", icon: "globe", color: "amber", gradeLevel: "TROISIEME", order: 4 },
    { slug: "svt", name: "SVT", icon: "leaf", color: "lime", gradeLevel: "TROISIEME", order: 5 },
    { slug: "anglais", name: "Anglais", icon: "flag", color: "sky", gradeLevel: "TROISIEME", order: 6 },
  ] as const;

  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { slug: s.slug },
      update: { name: s.name, icon: s.icon, color: s.color, order: s.order },
      create: s as any,
    });
  }

  // ---- Cosmetics (boutique) ----
  const cosmetics = [
    { slug: "border-gray", name: "Cadre gris", type: "BORDER", priceCoins: 0, requiredLevel: 1, borderClass: "ring-2 ring-zinc-500", rarity: "common", description: "Le cadre du Debutant." },
    { slug: "border-blue", name: "Cadre bleu", type: "BORDER", priceCoins: 50, requiredLevel: 6, borderClass: "ring-2 ring-sky-400", rarity: "common", description: "Cadre du Curieux." },
    { slug: "border-violet", name: "Cadre violet", type: "BORDER", priceCoins: 150, requiredLevel: 16, borderClass: "ring-2 ring-violet-400", rarity: "rare", description: "Cadre du Chercheur." },
    { slug: "border-green-star", name: "Cadre vert etoile", type: "BORDER", priceCoins: 350, requiredLevel: 31, borderClass: "ring-2 ring-emerald-400", rarity: "rare", description: "Cadre du Savant." },
    { slug: "border-gold", name: "Cadre or + couronne", type: "BORDER", priceCoins: 800, requiredLevel: 61, borderClass: "ring-2 ring-amber-400", rarity: "epic", description: "Cadre du Genie." },
    { slug: "border-rainbow", name: "Cadre arc-en-ciel", type: "BORDER", priceCoins: 5000, requiredLevel: 801, borderClass: "rank-rainbow", rarity: "legendary", description: "Reserve aux Legendes." },
    { slug: "hat-sumo", name: "Chignon de sumo", type: "HAT", priceCoins: 100, requiredLevel: 5, rarity: "common" },
    { slug: "hat-graduate", name: "Toque de diplome", type: "HAT", priceCoins: 250, requiredLevel: 20, rarity: "rare" },
    { slug: "hat-crown", name: "Couronne d'or", type: "HAT", priceCoins: 600, requiredLevel: 61, rarity: "epic" },
    { slug: "bg-stars", name: "Fond etoile", type: "BG", priceCoins: 200, requiredLevel: 10, rarity: "common" },
    { slug: "bg-galaxy", name: "Fond galaxie", type: "BG", priceCoins: 1500, requiredLevel: 121, rarity: "epic" },
    { slug: "badge-streak", name: "Badge serie 7 jours", type: "BADGE", priceCoins: 75, requiredLevel: 1, rarity: "common" },
  ] as const;

  for (const c of cosmetics) {
    await prisma.cosmetic.upsert({
      where: { slug: c.slug },
      update: { ...c } as any,
      create: { ...c } as any,
    });
  }

  // ---- Rotation boutique (journee) ----
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const rotation = await prisma.shopRotation.upsert({
    where: { startsAt_endsAt: { startsAt: start, endsAt: end } } as any,
    update: {},
    create: { startsAt: start, endsAt: end },
  });

  const featuredSlugs = ["border-violet", "hat-graduate", "bg-stars"] as const;
  const featured = await prisma.cosmetic.findMany({ where: { slug: { in: featuredSlugs as any } } });
  for (const c of featured) {
    await prisma.shopListing.upsert({
      where: { rotationId_cosmeticId: { rotationId: rotation.id, cosmeticId: c.id } },
      update: { priceCoins: Math.max(1, c.priceCoins - 20), featured: true, stock: null },
      create: { rotationId: rotation.id, cosmeticId: c.id, priceCoins: Math.max(1, c.priceCoins - 20), featured: true, stock: null },
    });
  }

  // ---- Cours de demo ----
  const maths = await prisma.subject.findUnique({ where: { slug: "maths" } });
  if (maths) {
    const course = await prisma.course.upsert({
      where: { subjectId_slug: { subjectId: maths.id, slug: "theoreme-pythagore" } },
      update: {},
      create: {
        subjectId: maths.id,
        title: "Le theoreme de Pythagore",
        slug: "theoreme-pythagore",
        order: 1,
        contentMarkdown: `# Le theoreme de Pythagore

Dans un triangle rectangle, le **carre de la longueur de l'hypotenuse** est egal
a la somme des carres des longueurs des deux autres cotes.

\\[ a^2 + b^2 = c^2 \\]

## A retenir
- L'hypotenuse est le **cote le plus long**, oppose a l'angle droit.
- La reciproque permet de prouver qu'un triangle est rectangle.

## Exemple
Si \\( a = 3 \\) et \\( b = 4 \\), alors \\( c = 5 \\).
`,
      },
    });

    await prisma.quiz.create({
      data: {
        courseId: course.id,
        title: "Pythagore - quiz d'entrainement",
        type: "QUIZ",
        timeLimitSec: 180,
        difficulty: 1,
        questions: {
          create: [
            {
              text: "Dans un triangle rectangle de cotes 3 et 4, quelle est l'hypotenuse ?",
              type: "QCM",
              points: 1,
              order: 1,
              answers: { create: [
                { text: "5", isCorrect: true, order: 1 },
                { text: "6", isCorrect: false, order: 2 },
                { text: "7", isCorrect: false, order: 3 },
                { text: "12", isCorrect: false, order: 4 },
              ] },
            },
            {
              text: "Le theoreme de Pythagore s'applique a tous les triangles.",
              type: "VRAI_FAUX",
              points: 1,
              order: 2,
              answers: { create: [
                { text: "Vrai", isCorrect: false, order: 1 },
                { text: "Faux", isCorrect: true, order: 2 },
              ] },
            },
            {
              text: "Combien vaut a^2 + b^2 si a = 6 et b = 8 ?",
              type: "QCM",
              points: 1,
              order: 3,
              answers: { create: [
                { text: "100", isCorrect: true, order: 1 },
                { text: "64", isCorrect: false, order: 2 },
                { text: "36", isCorrect: false, order: 3 },
                { text: "14", isCorrect: false, order: 4 },
              ] },
            },
          ],
        },
      },
    }).catch(() => undefined);
  }

  // Histoire-Geo demo
  const histoire = await prisma.subject.findUnique({ where: { slug: "histoire-geo" } });
  if (histoire) {
    const course = await prisma.course.upsert({
      where: { subjectId_slug: { subjectId: histoire.id, slug: "premiere-guerre-mondiale" } },
      update: {},
      create: {
        subjectId: histoire.id,
        title: "La Premiere Guerre mondiale",
        slug: "premiere-guerre-mondiale",
        order: 1,
        contentMarkdown: `# La Premiere Guerre mondiale (1914-1918)

## Les causes
- Tensions entre les puissances europeennes
- Systeme d'alliances (Triple Alliance, Triple Entente)
- Attentat de Sarajevo (28 juin 1914)

## Les phases
1. Guerre de mouvement (1914)
2. Guerre de position (1915-1917)
3. Reprise (1918) et Armistice du **11 novembre 1918**.
`,
      },
    });

    await prisma.quiz.create({
      data: {
        courseId: course.id,
        title: "1914-1918 - quiz",
        type: "QUIZ",
        timeLimitSec: 240,
        difficulty: 1,
        questions: {
          create: [
            {
              text: "Quelle est la date de l'armistice ?",
              type: "QCM",
              points: 1,
              order: 1,
              answers: { create: [
                { text: "11 novembre 1918", isCorrect: true, order: 1 },
                { text: "28 juin 1914", isCorrect: false, order: 2 },
                { text: "8 mai 1945", isCorrect: false, order: 3 },
              ] },
            },
            {
              text: "L'attentat de Sarajevo a declenche le conflit.",
              type: "VRAI_FAUX",
              points: 1,
              order: 2,
              answers: { create: [
                { text: "Vrai", isCorrect: true, order: 1 },
                { text: "Faux", isCorrect: false, order: 2 },
              ] },
            },
          ],
        },
      },
    }).catch(() => undefined);
  }

  // ---- Demo users ----
  const adminPwd = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@revise-plus.local" },
    update: {},
    create: {
      email: "admin@revise-plus.local",
      username: "Admin",
      passwordHash: adminPwd,
      isAdmin: true,
      totalXp: 0,
      level: 1,
      coins: 200,
    },
  });

  const demoPwd = await bcrypt.hash("demo1234", 10);
  await prisma.user.upsert({
    where: { email: "lea@revise-plus.local" },
    update: {},
    create: {
      email: "lea@revise-plus.local",
      username: "Lea",
      passwordHash: demoPwd,
      totalXp: 6800, // ~niv 14 selon la courbe
      level: 14,
      coins: 320,
      streakDays: 7,
      gradeLevel: "TROISIEME",
    },
  });

  console.log("Seed termine.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
