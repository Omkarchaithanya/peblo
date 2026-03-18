/**
 * POST /api/generate-quiz
 * 
 * Generate quiz questions from ingested content.
 * Can generate questions for a specific document, chunk, or topic.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  generateQuizForDocument, 
  generateQuestionsFromChunk,
  storeQuestions,
  getQuizQuestions 
} from '@/lib/services/quiz-generation';
import { db } from '@/lib/db';
import { z } from 'zod';

const QUESTION_TYPES = ['MCQ', 'TRUE_FALSE', 'FILL_BLANK'] as const;
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;

const generateQuizSchema = z.object({
  sourceId: z.string().trim().min(1).optional(),
  chunkId: z.string().trim().min(1).optional(),
  topic: z.string().trim().min(1).optional(),
  count: z.coerce.number().int().min(1).max(20).default(3),
  types: z.array(z.enum(QUESTION_TYPES)).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
}).refine((v) => Boolean(v.sourceId || v.chunkId || v.topic), {
  message: 'Please provide sourceId, chunkId, or topic',
  path: ['sourceId'],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generateQuizSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sourceId, chunkId, topic, count, types } = parsed.data;
    
    let questionsCreated = 0;
    let questionIds: string[] = [];
    
    // Generate questions based on the provided parameters
    if (sourceId) {
      // Generate for entire document
      const result = await generateQuizForDocument(sourceId, count);
      questionsCreated = result.questionsCreated;
      questionIds = result.questionIds;
    } else if (chunkId) {
      // Generate for specific chunk
      const questionTypes = types || [...QUESTION_TYPES];
      const questions = await generateQuestionsFromChunk(chunkId, count, questionTypes);
      questionIds = await storeQuestions(questions);
      questionsCreated = questions.length;
    } else if (topic) {
      // Generate for topic - find relevant chunks
      const chunks = await db.contentChunk.findMany({
        where: {
          topic: { contains: topic, mode: 'insensitive' },
        },
        take: 5,
      });
      
      for (const chunk of chunks) {
        const questions = await generateQuestionsFromChunk(chunk.id, Math.ceil(count / chunks.length));
        const ids = await storeQuestions(questions);
        questionIds.push(...ids);
        questionsCreated += questions.length;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Generated ${questionsCreated} quiz questions`,
      data: {
        questionsCreated,
        questionIds,
      },
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate quiz questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const topic = searchParams.get('topic') || undefined;
    const difficulty = searchParams.get('difficulty') || undefined;
    const type = searchParams.get('type') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const questions = await getQuizQuestions({
      topic: topic,
      difficulty: difficulty || undefined,
      type: type || undefined,
      limit,
    });
    
    // Format questions for response (hide answers in a separate field)
    const formattedQuestions = questions.map(q => ({
      id: q.id,
      question: q.question,
      type: q.questionType,
      options: q.options ? JSON.parse(q.options) : null,
      difficulty: q.difficulty,
      topic: q.topic,
      grade: (q as any).grade || 1,
      qualityScore: q.qualityScore,
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        questions: formattedQuestions,
        total: questions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
