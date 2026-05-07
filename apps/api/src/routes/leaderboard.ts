import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../prisma.js";
import { rankForLevel } from "@revise-plus/shared";

export const leaderboardRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { scope?: "weekly" | "global" } }>("/leaderboard", async (request) => {
    const scope = request.query.scope === "global" ? "global" : "weekly";
    const orderBy = scope === "global" ? { totalXp: "desc" as const } : { weeklyXp: "desc" as const };

    const users = await prisma.user.findMany({
      orderBy,
      take: 50,
      select: {
        id: true,
        username: true,
        level: true,
        totalXp: true,
        weeklyXp: true,
        equippedBorder: true,
      },
    });

    return users.map((u, i) => {
      const rank = rankForLevel(u.level);
      return {
        position: i + 1,
        userId: u.id,
        username: u.username,
        level: u.level,
        totalXp: u.totalXp,
        weeklyXp: u.weeklyXp,
        rankName: rank.name,
        rankBorderStyle: rank.borderStyle,
        rankBorderClass: rank.borderClass,
        equippedBorder: u.equippedBorder,
      };
    });
  });
};
