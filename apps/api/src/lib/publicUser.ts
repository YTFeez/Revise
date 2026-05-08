import type { User } from "@prisma/client";
import { rankForLevel } from "@revise-plus/shared";
import type { PublicUser } from "@revise-plus/shared";
import { prisma } from "../prisma.js";

const gradeMap: Record<string, "6e" | "5e" | "4e" | "3e"> = {
  SIXIEME: "6e",
  CINQUIEME: "5e",
  QUATRIEME: "4e",
  TROISIEME: "3e",
};

export function toPublicUser(u: User): PublicUser {
  const rank = rankForLevel(u.level);
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    level: u.level,
    totalXp: u.totalXp,
    coins: u.coins,
    streakDays: u.streakDays,
    gradeLevel: u.gradeLevel ? gradeMap[u.gradeLevel] : null,
    equippedBorder: u.equippedBorder,
    equippedHat: u.equippedHat,
    equippedBg: u.equippedBg,
    avatar: (u as any).avatarJson ?? null,
    rankName: rank.name,
    isAdmin: u.isAdmin,
  };
}

export async function toPublicUserWithCosmetics(u: User): Promise<PublicUser> {
  const base = toPublicUser(u);
  const slugs = [u.equippedBorder, u.equippedBg].filter((x): x is string => !!x);
  if (slugs.length === 0) return base;

  const cosmetics = await prisma.cosmetic.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, type: true, borderClass: true },
  });
  const bySlug = new Map(cosmetics.map((c) => [c.slug, c]));

  return {
    ...base,
    equippedBorderClass: u.equippedBorder ? (bySlug.get(u.equippedBorder)?.borderClass ?? null) : null,
    equippedBgClass: u.equippedBg ? (bySlug.get(u.equippedBg)?.borderClass ?? null) : null,
  };
}
