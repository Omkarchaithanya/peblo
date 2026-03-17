/**
 * POST /api/submit-answer
 * 
 * Submit a student's answer to a quiz question.
 * Processes the answer, updates ratings, and returns adaptive feedback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processStudentAnswer, getAdaptiveQuestion } from '@/lib/services/adaptive-difficulty';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      studentId,
      questionId,
      selectedAnswer,
      responseTime,
      confidence,
      sessionId,
    } = body;
    
    // Validate required fields
    if (!studentId || !questionId || selectedAnswer === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, questionId, selectedAnswer' },
        { status: 400 }
      );
    }
    
    // Process the answer and get adaptive feedback
    const result = await processStudentAnswer(
      studentId,
      questionId,
      selectedAnswer,
      responseTime
    );
    
    // Get the question to return correct answer and explanation
    const question = await db.quizQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }
    
    // Get next recommended question
    let nextQuestion = null;
    try {
      const adaptiveNext = await getAdaptiveQuestion(studentId);
      if (adaptiveNext) {
        const nextQ = await db.quizQuestion.findUnique({
          where: { id: adaptiveNext.questionId },
        });
        if (nextQ) {
          nextQuestion = {
            id: nextQ.id,
            question: nextQ.question,
            type: nextQ.questionType,
            options: nextQ.options ? JSON.parse(nextQ.options) : null,
            difficulty: nextQ.difficulty,
            topic: nextQ.topic,
          };
        }
      }
    } catch (e) {
      console.error('Error getting next question:', e);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        isCorrect: String(selectedAnswer).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase(),
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        rating: {
          before: result.newRating - result.ratingChange,
          after: result.newRating,
          change: result.ratingChange,
        },
        suggestedDifficulty: result.suggestedDifficulty,
        message: result.message,
        nextQuestion,
      },
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { 
        error: 'Failed to submit answer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
