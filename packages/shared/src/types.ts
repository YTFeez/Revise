export type GradeLevel = "6e" | "5e" | "4e" | "3e";
export type QuizType = "QUIZ" | "EVAL";
export type QuestionType = "QCM" | "VRAI_FAUX" | "TEXTE";
export type CosmeticType = "BORDER" | "HAT" | "BG" | "BADGE";

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  level: number;
  totalXp: number;
  coins: number;
  streakDays: number;
  gradeLevel?: GradeLevel | null;
  equippedBorder?: string | null;
  equippedHat?: string | null;
  equippedBg?: string | null;
  avatar?: AvatarConfig | null;
  rankName: string;
  isAdmin?: boolean;
}

export type AvatarBase = "sumo" | "ninja" | "mage" | "robot" | "alien";

export interface AvatarConfig {
  base: AvatarBase;
  skin: string; // hex
  primary: string; // hex
  secondary: string; // hex
}

export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  level: number;
  totalXp: number;
  xpInLevel: number;
  xpForNext: number;
  rankName: string;
  cardCount: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  level: number;
  weeklyXp: number;
  totalXp: number;
  rankName: string;
  rankBorderStyle: string;
  delta?: number; // variation de rang depuis la semaine passee
}

export interface QuizPublic {
  id: string;
  courseId: string;
  title: string;
  type: QuizType;
  timeLimitSec: number;
  difficulty: number;
  questionCount: number;
}

export interface QuestionPublic {
  id: string;
  text: string;
  type: QuestionType;
  points: number;
  answers: { id: string; text: string }[];
}

export interface AttemptStartResult {
  attemptId: string;
  quiz: QuizPublic;
  questions: QuestionPublic[];
  startedAt: string;
  expiresAt: string;
}

export interface AttemptResult {
  attemptId: string;
  scorePct: number;
  correctCount: number;
  totalQuestions: number;
  xpGained: number;
  coinsGained: number;
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
  newRankName?: string;
}
