import type { User } from "@prisma/client";
import { rankForLevel } from "@revise-plus/shared";
import type { PublicUser } from "@revise-plus/shared";

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
