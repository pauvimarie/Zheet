export type Category = 'Verbal' | 'Analytical' | 'Numerical' | 'General Information';
export type AnswerType = 'bubble' | 'written';

export interface WorksheetConfig {
  title: string;
  worksheetNumber: number;
  category: Category;
  answerType: AnswerType;
  numQuestions: number;
  numChoices: number; // 2-5, only for bubble
  timedMode: boolean;
  timeLimit?: number; // minutes
}

export type AnswerStatus = 'correct' | 'wrong' | null;

export interface QuestionAnswer {
  questionNumber: number;
  selectedChoice?: string; // A, B, C, D, E for bubble
  writtenAnswer?: string;
  status: AnswerStatus; // manually checked
}

export interface WorksheetSession {
  id: string;
  userId: string;
  config: WorksheetConfig;
  answers: QuestionAnswer[];
  startedAt: Date;
  completedAt?: Date;
  timeTaken?: number; // seconds
  isComplete: boolean;
  correct: number;
  wrong: number;
  checked: number;
}

export interface CategoryProficiency {
  category: Category;
  totalCorrect: number;
  totalChecked: number;
  proficiency: number; // 0-100
}

export interface UserStats {
  totalWorksheets: number;
  totalQuestions: number;
  totalCorrect: number;
  totalWrong: number;
  overallAccuracy: number;
  proficiency: Record<Category, CategoryProficiency>;
}
