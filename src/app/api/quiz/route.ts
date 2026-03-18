/**
 * GET /api/quiz
 * 
 * Retrieve quiz questions with filtering options.
 * Supports adaptive question selection for students.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdaptiveQuestion } from '@/lib/services/adaptive-difficulty';
import { z } from 'zod';

const QUESTION_TYPES = ['MCQ', 'TRUE_FALSE', 'FILL_BLANK'] as const;
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;

const quizQuerySchema = z.object({
  topic: z.string().trim().min(1).optional(),
  subject: z.string().trim().min(1).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  type: z.enum(QUESTION_TYPES).optional(),
  grade: z.coerce.number().int().min(1).max(12).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  studentId: z.string().trim().min(1).optional(),
  adaptive: z.coerce.boolean().default(false),
});

const deleteQuestionSchema = z.object({
  id: z.string().trim().min(1, 'Question ID is required'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = quizQuerySchema.safeParse({
      topic: searchParams.get('topic') ?? undefined,
      subject: searchParams.get('subject') ?? undefined,
      difficulty: searchParams.get('difficulty') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      grade: searchParams.get('grade') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
      studentId: searchParams.get('studentId') ?? undefined,
      adaptive: searchParams.get('adaptive') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      topic,
      subject,
      difficulty,
      type,
      grade,
      limit,
      offset,
      studentId,
      adaptive,
    } = parsed.data;
    
    // If adaptive mode is requested with a student ID
    if (adaptive && studentId) {
      const adaptiveQuestion = await getAdaptiveQuestion(studentId, topic);
      
      if (!adaptiveQuestion) {
        return NextResponse.json({
          success: true,
          data: {
            questions: [],
            message: 'No suitable questions found for adaptive learning',
          },
        });
      }
      
      const question = await db.quizQuestion.findUnique({
        where: { id: adaptiveQuestion.questionId },
      });
      
      if (!question) {
        return NextResponse.json({
          success: true,
          data: { questions: [] },
        });
      }
      
      return NextResponse.json({
        success: true,
        data: {
          questions: [formatQuestion(question)],
          adaptive: {
            suggestedDifficulty: adaptiveQuestion.difficulty,
          },
        },
      });
    }
    
    // Build where clause
    const where: Record<string, unknown> = {
      isDuplicate: false,
      qualityScore: { gte: 0.3 },
    };
    
    if (topic) {
      where.topic = { contains: topic, mode: 'insensitive' };
    }
    
    if (difficulty) where.difficulty = difficulty;
    
    if (type) where.questionType = type;

    if (grade || subject) {
      where.source = {
        ...(grade ? { grade } : {}),
        ...(subject ? { subject: { contains: subject, mode: 'insensitive' } } : {}),
      };
    }
    
    // Get total count
    const total = await db.quizQuestion.count({ where });
    
    // Get questions
    const questions = await db.quizQuestion.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [
        { qualityScore: 'desc' },
        { createdAt: 'desc' },
      ],
    });
    
    // Format questions (without answers for quiz display)
    const formattedQuestions = questions.map(formatQuestion);
    
    return NextResponse.json({
      success: true,
      data: {
        questions: formattedQuestions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch quiz questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = deleteQuestionSchema.safeParse({
      id: searchParams.get('id') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id } = parsed.data;
    const question = await db.quizQuestion.findUnique({
      where: { id },
      select: { id: true, sourceId: true },
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    await db.quizQuestion.delete({ where: { id } });
    await db.sourceDocument.update({
      where: { id: question.sourceId },
      data: { questionCount: { decrement: 1 } },
    });

    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete question',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Format question for API response
 */
function formatQuestion(q: any) {
  return {
    id: q.id,
    question: q.question,
    type: q.questionType,
    options: q.options ? JSON.parse(q.options) : null,
    difficulty: q.difficulty,
    topic: q.topic,
    explanation: q.explanation,
    qualityScore: q.qualityScore,
    timesAsked: q.timesAsked,
    successRate: q.timesAsked > 0 ? Math.round((q.timesCorrect / q.timesAsked) * 100) : null,
  };
}
