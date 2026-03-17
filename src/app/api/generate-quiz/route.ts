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
import { QuestionType, Difficulty } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      sourceId,
      chunkId,
      topic,
      count = 3,
      types,
      difficulty,
    } = body;
    
    // Validate that at least one filter is provided
    if (!sourceId && !chunkId && !topic) {
      return NextResponse.json(
        { error: 'Please provide sourceId, chunkId, or topic' },
        { status: 400 }
      );
    }
    
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
      const questionTypes = (types as QuestionType[]) || [QuestionType.MCQ, QuestionType.TRUE_FALSE, QuestionType.FILL_BLANK];
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
    const difficulty = searchParams.get('difficulty') as Difficulty | null;
    const type = searchParams.get('type') as QuestionType | null;
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
