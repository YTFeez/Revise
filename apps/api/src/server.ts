import "dotenv/config";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { env } from "./env.js";
import { authRoutes } from "./routes/auth.js";
import { subjectsRoutes } from "./routes/subjects.js";
import { coursesRoutes } from "./routes/courses.js";
import { quizzesRoutes } from "./routes/quizzes.js";
import { leaderboardRoutes } from "./routes/leaderboard.js";
import { shopRoutes } from "./routes/shop.js";
import { adminRoutes } from "./routes/admin.js";
import { attachSocket } from "./realtime/socket.js";
import { friendsRoutes } from "./routes/friends.js";
import { shopRotationRoutes } from "./routes/shop_rotation.js";

async function build() {
  const app = Fastify({
    logger: { level: env.NODE_ENV === "production" ? "info" : "debug" },
    trustProxy: true,
  });

  await app.register(cors, { origin: env.WEB_ORIGIN, credentials: true });
  await app.register(cookie, { secret: env.COOKIE_SECRET });
  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
    allowList: (req) => req.url === "/health",
  });

  app.get("/health", async () => ({ status: "ok", time: Date.now() }));

  await app.register(
    async (api) => {
      api.get("/health", async () => ({ status: "ok", time: Date.now() }));
      await api.register(authRoutes);
      await api.register(subjectsRoutes);
      await api.register(coursesRoutes);
      await api.register(quizzesRoutes);
      await api.register(leaderboardRoutes);
      await api.register(shopRoutes);
      await api.register(shopRotationRoutes);
      await api.register(friendsRoutes);
      await api.register(adminRoutes);
    },
    { prefix: "/api" },
  );

  return app;
}

async function main() {
  const app = await build();
  await app.listen({ host: env.HOST, port: env.PORT });
  attachSocket(app);
  app.log.info(`Revise+ API listening on http://${env.HOST}:${env.PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
