import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("4000").transform((v) => parseInt(v, 10)),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  COOKIE_SECRET: z.string().min(16),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  ADMIN_CODE: z.string().min(8).optional(),
});

export const env = EnvSchema.parse(process.env);
