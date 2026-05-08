import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(24).regex(/^[a-zA-Z0-9_\-\. ]+$/),
  password: z.string().min(6).max(72),
  gradeLevel: z.enum(["6e", "5e", "4e", "3e"]).optional(),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const QuizSubmitSchema = z.object({
  attemptId: z.string(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      answerIds: z.array(z.string()).optional(),
      text: z.string().optional(),
    }),
  ),
});
export type QuizSubmitInput = z.infer<typeof QuizSubmitSchema>;

export const StartAttemptSchema = z.object({
  quizId: z.string(),
});
export type StartAttemptInput = z.infer<typeof StartAttemptSchema>;

export const PurchaseCosmeticSchema = z.object({
  cosmeticId: z.string(),
});

export const EquipCosmeticSchema = z.object({
  cosmeticId: z.string(),
  equipped: z.boolean(),
});

export const CreateCourseSchema = z.object({
  subjectId: z.string(),
  title: z.string().min(2).max(120),
  contentMarkdown: z.string().optional().default(""),
  contentHtml: z.string().optional().default(""),
  contentFormat: z.enum(["MARKDOWN", "HTML"]).default("HTML"),
  order: z.number().int().min(0).default(0),
});

export const CreateQuizSchema = z.object({
  courseId: z.string(),
  title: z.string().min(2).max(120),
  type: z.enum(["QUIZ", "EVAL"]).default("QUIZ"),
  timeLimitSec: z.number().int().min(30).max(60 * 60).default(300),
  difficulty: z.number().int().min(1).max(3).default(1),
  questions: z
    .array(
      z.object({
        text: z.string(),
        type: z.enum(["QCM", "VRAI_FAUX", "TEXTE"]).default("QCM"),
        points: z.number().int().min(1).max(20).default(1),
        answers: z
          .array(
            z.object({
              text: z.string(),
              isCorrect: z.boolean(),
            }),
          )
          .min(2),
      }),
    )
    .min(1),
});
