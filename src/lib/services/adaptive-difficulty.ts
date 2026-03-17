/**
 * Peblo AI - Adaptive Difficulty Service
 * 
 * Implements an ELO-like rating system for adaptive quiz difficulty.
 * Dynamically adjusts difficulty based on student performance.
 */

import { db } from '@/lib/db';

// ELO constants
const K_FACTOR = 32; // Standard ELO K-factor
const BASE_RATING = 1000; // Starting rating for new students
const DIFFICULTY_THRESHOLDS = {
  easy: { min: 0, max: 1100 },
  medium: { min: 1100, max: 1400 },
  hard: { min: 1400, max: 3000 },
};

// Difficulty point values for ELO calculation
const DIFFICULTY_WEIGHTS: Record<string, number> = {
  EASY: 0.8,
  MEDIUM: 1.0,
  HARD: 1.3,
};

export interface AdaptiveDifficultyResult {
  newRating: number;
  ratingChange: number;
  suggestedDifficulty: string;
  message: string;
}

export interface StudentPerformanceStats {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  currentStreak: number;
  averageResponseTime: number | null;
  ratingProgression: number[];
}

/**
 * Calculate ELO rating change based on quiz result
 * Uses a modified ELO formula that considers question difficulty
 */
export function calculateRatingChange(
  currentRating: number,
  isCorrect: boolean,
  questionDifficulty: string,
  questionQuality: number = 0.5
): number {
  // Expected score based on ELO formula
  // For a binary outcome, we compare student rating to difficulty threshold
  const difficultyRating = getDifficultyRating(questionDifficulty);
  
  // Calculate expected score (probability of correct answer)
  const expectedScore = 1 / (1 + Math.pow(10, (difficultyRating - currentRating) / 400));
  
  // Actual score (1 for correct, 0 for incorrect)
  const actualScore = isCorrect ? 1 : 0;
  
  // Base rating change
  let ratingChange = K_FACTOR * (actualScore - expectedScore);
  
  // Apply difficulty weight
  const weight = DIFFICULTY_WEIGHTS[questionDifficulty.toUpperCase()] || 1.0;
  ratingChange *= weight;
  
  // Apply quality adjustment (higher quality questions have more impact)
  ratingChange *= (0.5 + questionQuality);
  
  // Streak bonus - reward consecutive correct answers
  if (isCorrect) {
    ratingChange *= 1.1; // 10% bonus for correct answers
  }
  
  // Round to integer
  return Math.round(ratingChange);
}

/**
 * Get the rating midpoint for a difficulty level
 */
function getDifficultyRating(difficulty: string): number {
  const key = difficulty.toLowerCase() as keyof typeof DIFFICULTY_THRESHOLDS;
  const threshold = DIFFICULTY_THRESHOLDS[key] || DIFFICULTY_THRESHOLDS.medium;
  return (threshold.min + threshold.max) / 2;
}

/**
 * Determine appropriate difficulty based on student rating
 */
export function suggestDifficulty(rating: number): string {
  if (rating < DIFFICULTY_THRESHOLDS.easy.max) {
    return 'EASY';
  } else if (rating < DIFFICULTY_THRESHOLDS.medium.max) {
    return 'MEDIUM';
  } else {
    return 'HARD';
  }
}

/**
 * Process student answer and update ratings
 */
export async function processStudentAnswer(
  studentId: string,
  questionId: string,
  selectedAnswer: string,
  responseTime?: number
): Promise<AdaptiveDifficultyResult> {
  // Get student and question data
  const student = await db.student.findUnique({
    where: { id: studentId },
  });
  
  const question = await db.quizQuestion.findUnique({
    where: { id: questionId },
  });
  
  if (!student || !question) {
    throw new Error('Student or question not found');
  }
  
  // Check if answer is correct
  const isCorrect = checkAnswer(selectedAnswer, question.correctAnswer, question.questionType);
  
  // Calculate rating change
  const ratingChange = calculateRatingChange(
    student.overallRating,
    isCorrect,
    question.difficulty,
    question.qualityScore
  );
  
  const newRating = Math.max(100, student.overallRating + ratingChange);
  
  // Update student stats
  const newStreak = isCorrect ? student.currentStreak + 1 : 0;
  const bestStreak = Math.max(newStreak, student.bestStreak);
  
  await db.student.update({
    where: { id: studentId },
    data: {
      overallRating: newRating,
      totalQuizzesTaken: { increment: 1 },
      totalQuestions: { increment: 1 },
      totalCorrect: isCorrect ? { increment: 1 } : undefined,
      currentStreak: newStreak,
      bestStreak: bestStreak,
      lastActiveAt: new Date(),
      preferredDifficulty: suggestDifficulty(newRating),
    },
  });
  
  // Update question stats
  await db.quizQuestion.update({
    where: { id: questionId },
    data: {
      timesAsked: { increment: 1 },
      timesCorrect: isCorrect ? { increment: 1 } : undefined,
      avgResponseTime: responseTime
        ? Math.round((question.avgResponseTime || 0) * 0.8 + responseTime * 0.2)
        : undefined,
    },
  });
  
  // Store the answer record
  await db.studentAnswer.create({
    data: {
      studentId,
      questionId,
      selectedAnswer,
      isCorrect,
      responseTime,
      questionDifficulty: question.difficulty,
      ratingBefore: student.overallRating,
      ratingAfter: newRating,
      ratingChange,
    },
  });
  
  // Determine suggested next difficulty
  const suggestedDifficulty = suggestDifficulty(newRating);
  
  // Generate feedback message
  const message = generateFeedbackMessage(isCorrect, ratingChange, newRating, suggestedDifficulty, newStreak);
  
  return {
    newRating,
    ratingChange,
    suggestedDifficulty,
    message,
  };
}

/**
 * Check if answer is correct
 */
function checkAnswer(selected: string, correct: string, questionType: string): boolean {
  const normalize = (s: string) => s.toLowerCase().trim();
  
  if (questionType === 'TRUE_FALSE') {
    return normalize(selected) === normalize(correct);
  }
  
  if (questionType === 'MCQ') {
    // Accept both letter and full option text
    return normalize(selected) === normalize(correct) ||
           normalize(selected) === normalize(correct.charAt(0));
  }
  
  if (questionType === 'FILL_BLANK') {
    // More lenient matching for fill-in-the-blank
    const selectedNorm = normalize(selected).replace(/[^a-z0-9]/g, '');
    const correctNorm = normalize(correct).replace(/[^a-z0-9]/g, '');
    return selectedNorm === correctNorm || 
           selectedNorm.includes(correctNorm) || 
           correctNorm.includes(selectedNorm);
  }
  
  return normalize(selected) === normalize(correct);
}

/**
 * Generate personalized feedback message
 */
function generateFeedbackMessage(
  isCorrect: boolean,
  ratingChange: number,
  newRating: number,
  suggestedDifficulty: string,
  currentStreak: number
): string {
  if (isCorrect) {
    let message = `Correct! Your rating ${ratingChange >= 0 ? 'increased' : 'changed'} by ${Math.abs(ratingChange)} points.`;
    
    if (currentStreak >= 3) {
      message += ` 🔥 You're on a ${currentStreak}-question streak!`;
    }
    
    if (suggestedDifficulty !== 'EASY' && newRating > 1100) {
      message += ` You're ready for ${suggestedDifficulty.toLowerCase()} questions!`;
    }
    
    return message;
  } else {
    let message = `Not quite right. Your rating changed by ${ratingChange} points.`;
    
    if (suggestedDifficulty === 'EASY') {
      message += ` Let's try some easier questions to build your confidence.`;
    } else {
      message += ` Keep practicing - you'll get it next time!`;
    }
    
    return message;
  }
}

/**
 * Get next recommended question based on adaptive algorithm
 */
export async function getAdaptiveQuestion(
  studentId: string,
  topic?: string
): Promise<{ questionId: string; difficulty: string } | null> {
  // Get student data
  const student = await db.student.findUnique({
    where: { id: studentId },
  });
  
  if (!student) {
    throw new Error('Student not found');
  }
  
  // Determine target difficulty
  const targetDifficulty = student.preferredDifficulty;
  
  // Get recently answered questions to avoid
  const recentAnswers = await db.studentAnswer.findMany({
    where: { studentId },
    select: { questionId: true },
    take: 20,
    orderBy: { answeredAt: 'desc' },
  });
  
  const excludeIds = recentAnswers.map(a => a.questionId);
  
  // Find an appropriate question
  const where: Record<string, unknown> = {
    difficulty: targetDifficulty,
    isDuplicate: false,
    qualityScore: { gte: 0.4 },
  };
  
  if (topic) {
    where.topic = { contains: topic };
  }
  
  if (excludeIds.length > 0) {
    where.id = { notIn: excludeIds };
  }
  
  // Try to find a question at the target difficulty
  let question = await db.quizQuestion.findFirst({
    where,
    orderBy: [
      { qualityScore: 'desc' },
      { timesAsked: 'asc' },
    ],
  });
  
  // If no question found, try adjacent difficulties
  if (!question) {
    const fallbackDifficulty = targetDifficulty === 'HARD' 
      ? 'MEDIUM' 
      : targetDifficulty === 'EASY' 
        ? 'MEDIUM' 
        : 'EASY';
    
    question = await db.quizQuestion.findFirst({
      where: {
        ...where,
        difficulty: fallbackDifficulty,
      },
      orderBy: [
        { qualityScore: 'desc' },
        { timesAsked: 'asc' },
      ],
    });
  }
  
  if (!question) {
    return null;
  }
  
  return {
    questionId: question.id,
    difficulty: question.difficulty,
  };
}

/**
 * Get student performance statistics
 */
export async function getStudentPerformanceStats(studentId: string): Promise<StudentPerformanceStats> {
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      answers: {
        take: 100,
        orderBy: { answeredAt: 'desc' },
      },
    },
  });
  
  if (!student) {
    throw new Error('Student not found');
  }
  
  const recentAnswers = student.answers;
  const accuracy = student.totalQuestions > 0 
    ? (student.totalCorrect / student.totalQuestions) * 100 
    : 0;
  
  const responseTimes = recentAnswers
    .filter(a => a.responseTime)
    .map(a => a.responseTime!);
  
  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null;
  
  // Get rating progression
  const ratingProgression = recentAnswers
    .slice(0, 10)
    .reverse()
    .map(a => a.ratingAfter);
  
  return {
    totalQuestions: student.totalQuestions,
    correctAnswers: student.totalCorrect,
    accuracy,
    currentStreak: student.currentStreak,
    averageResponseTime: avgResponseTime,
    ratingProgression,
  };
}
