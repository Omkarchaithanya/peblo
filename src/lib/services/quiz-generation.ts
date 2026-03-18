/**
 * Peblo AI - Quiz Generation Service
 * 
 * Uses LLM to generate quiz questions from content chunks.
 * Supports MCQ, True/False, and Fill-in-the-blank questions.
 * Includes question validation and quality scoring.
 */

import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// Types
export interface GeneratedQuestion {
  question: string;
  questionType: string;  // MCQ, TRUE_FALSE, FILL_BLANK
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  difficulty: string;  // EASY, MEDIUM, HARD
  sourceChunkId: string;
  topic: string;
  qualityScore: number;
}

export interface QuizGenerationRequest {
  sourceId?: string;
  chunkId?: string;
  topic?: string;
  count?: number;
  types?: string[];
  difficulty?: string;
}

export interface QuestionValidation {
  isValid: boolean;
  issues: string[];
  qualityScore: number;
}

// Initialize ZAI SDK
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    try {
      zaiInstance = await ZAI.create();
    } catch (error) {
      console.warn('ZAI SDK initialization failed, switching to local question generation fallback:', error);
      return null;
    }
  }
  return zaiInstance;
}

/**
 * Generate quiz questions from a content chunk using LLM
 */
export async function generateQuestionsFromChunk(
  chunkId: string,
  count: number = 3,
  types: string[] = ['MCQ', 'TRUE_FALSE', 'FILL_BLANK']
): Promise<GeneratedQuestion[]> {
  // Get chunk content
  const chunk = await db.contentChunk.findUnique({
    where: { id: chunkId },
    include: { source: true },
  });
  
  if (!chunk) {
    throw new Error(`Chunk not found: ${chunkId}`);
  }
  
  const preparedContent = prepareContentForQuestionGeneration(chunk.cleanedText);
  const zai = await getZAI();
  const questions: GeneratedQuestion[] = [];

  if (!zai) {
    for (const type of types) {
      if (questions.length >= count) break;
      const generated = generateFallbackQuestions(preparedContent, type, chunk.source.grade, chunk.topic, count - questions.length);
      for (const q of generated) {
        const validation = validateQuestion(q);
        questions.push({
          ...q,
          sourceChunkId: chunkId,
          topic: chunk.topic,
          qualityScore: validation.qualityScore,
        });
      }
    }
    return questions.slice(0, count);
  }
  
  // Generate questions for each type
  for (const type of types) {
    if (questions.length >= count) break;
    
    try {
      const generatedQuestions = await generateQuestionByType(
        zai,
        preparedContent,
        type,
        chunk.source.grade,
        chunk.topic
      );
      
      for (const q of generatedQuestions) {
        if (questions.length >= count) break;
        
        // Validate and score the question
        const validation = validateQuestion(q);
        
        // Create the question object
        const question: GeneratedQuestion = {
          ...q,
          sourceChunkId: chunkId,
          topic: chunk.topic,
          qualityScore: validation.qualityScore,
        };
        
        // Check for duplicates before adding
        const isDuplicate = await checkForDuplicate(question.question);
        if (!isDuplicate) {
          questions.push(question);
        }
      }
    } catch (error) {
      console.error(`Error generating ${type} questions:`, error);
    }
  }
  
  return questions;
}

function prepareContentForQuestionGeneration(content: string): string {
  const normalized = content
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20)
    .filter((s) => /[a-zA-Z]/.test(s))
    .filter((s) => {
      const symbolCount = (s.match(/[^a-zA-Z0-9\s.,!?-]/g) || []).length;
      return symbolCount / Math.max(s.length, 1) < 0.12;
    });

  return sentences.slice(0, 20).join(' ');
}

function generateFallbackQuestions(
  content: string,
  type: string,
  grade: number,
  topic: string,
  count: number
): Omit<GeneratedQuestion, 'sourceChunkId' | 'topic' | 'qualityScore'>[] {
  const questions: Omit<GeneratedQuestion, 'sourceChunkId' | 'topic' | 'qualityScore'>[] = [];
  const sentences = content
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30)
    .slice(0, 8);

  if (sentences.length === 0) {
    const genericQuestion = `What is one key idea from ${topic}?`;
    return [{
      question: genericQuestion,
      questionType: 'FILL_BLANK',
      correctAnswer: topic,
      explanation: `This fallback question is based on the topic ${topic}.`,
      difficulty: grade <= 3 ? 'EASY' : 'MEDIUM',
    }];
  }

  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4);

  const uniqueWords = Array.from(new Set(words));
  const commonDistractors = ['water', 'energy', 'object', 'process', 'system', 'example'];

  for (const sentence of sentences) {
    if (questions.length >= count) break;

    if (type === 'TRUE_FALSE') {
      const shouldBeFalse = questions.length % 2 === 1;
      const normalizedSentence = sentence.endsWith('.') ? sentence.slice(0, -1) : sentence;
      const statement = shouldBeFalse ? negateStatement(normalizedSentence) : normalizedSentence;
      questions.push({
        question: `${statement}. True or false?`,
        questionType: 'TRUE_FALSE',
        correctAnswer: shouldBeFalse ? 'false' : 'true',
        explanation: shouldBeFalse
          ? 'This statement is intentionally negated from the source content, so the correct answer is false.'
          : 'This statement is taken directly from the source content, so the correct answer is true.',
        difficulty: grade <= 3 ? 'EASY' : 'MEDIUM',
      });
      continue;
    }

    if (type === 'FILL_BLANK') {
      const candidate = sentence.split(/\s+/).find((w) => w.replace(/[^a-zA-Z]/g, '').length >= 5);
      const cleanCandidate = (candidate || topic).replace(/[^a-zA-Z]/g, '');
      if (!cleanCandidate) continue;
      const blanked = sentence.replace(new RegExp(`\\b${cleanCandidate}\\b`, 'i'), '[BLANK]');
      questions.push({
        question: blanked.includes('[BLANK]') ? blanked : `${sentence} [BLANK]`,
        questionType: 'FILL_BLANK',
        correctAnswer: cleanCandidate,
        explanation: `The missing word is "${cleanCandidate}" based on the source sentence.`,
        difficulty: 'MEDIUM',
      });
      continue;
    }

    if (type === 'MCQ') {
      const answerWord = sentence
        .split(/\s+/)
        .map((w) => w.replace(/[^a-zA-Z]/g, ''))
        .find((w) => w.length >= 5) || topic;

      const pool = [...uniqueWords, ...commonDistractors]
        .map((w) => w.trim())
        .filter((w) => w && w.toLowerCase() !== answerWord.toLowerCase());

      const distractors = pool.slice(0, 3).map((w) => w.charAt(0).toUpperCase() + w.slice(1));
      while (distractors.length < 3) distractors.push(`Option ${distractors.length + 2}`);

      const correct = answerWord.charAt(0).toUpperCase() + answerWord.slice(1);
      const options = [correct, ...distractors].slice(0, 4);
      const shuffled = options.sort(() => Math.random() - 0.5);

      questions.push({
        question: `Which word best completes this idea from the passage: "${sentence.replace(/\.$/, '')} ..."?`,
        questionType: 'MCQ',
        options: shuffled,
        correctAnswer: correct,
        explanation: `"${correct}" is the best fit from the content context.`,
        difficulty: 'MEDIUM',
      });
    }
  }

  return questions.slice(0, count);
}

function negateStatement(sentence: string): string {
  const verbPattern = /\b(is|are|was|were|has|have|had|can|will|should)\b/i;
  if (verbPattern.test(sentence)) {
    return sentence.replace(verbPattern, (match) => `${match} not`);
  }

  return `It is not true that ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
}

/**
 * Generate questions of a specific type using LLM
 */
async function generateQuestionByType(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  content: string,
  type: string,
  grade: number,
  topic: string
): Promise<Omit<GeneratedQuestion, 'sourceChunkId' | 'topic' | 'qualityScore'>[]> {
  
  const typeInstructions: Record<string, string> = {
    MCQ: `Generate a multiple choice question with exactly 4 options labeled A, B, C, D.
      The options should be plausible but only one correct.
      Format: Return JSON with "question", "options" (array of 4 strings), "correctAnswer" (the correct option letter), and "explanation".`,
    
    TRUE_FALSE: `Generate a true/false statement that tests understanding.
      The statement should be clear and unambiguous.
      Format: Return JSON with "question", "correctAnswer" ("true" or "false"), and "explanation".`,
    
    FILL_BLANK: `Generate a fill-in-the-blank question.
      Replace a key term with [BLANK].
      Format: Return JSON with "question" (with [BLANK]), "correctAnswer" (the missing word/phrase), and "explanation".`,
  };
  
  const systemPrompt = `You are an expert educational content creator for grade ${grade} students.
    Create high-quality quiz questions from the provided content.
    Questions should be age-appropriate, clear, and test understanding.
    
    ${typeInstructions[type] || typeInstructions.MCQ}
    
    Also include a "difficulty" field with value "easy", "medium", or "hard".
    
    Return ONLY valid JSON, no markdown formatting or additional text.`;
  
  const userPrompt = `Create ${type} questions from this educational content about ${topic}:
    
    CONTENT:
    ${content}
    
    Create questions that test understanding of key concepts from this content.
    Make sure questions are clear and appropriate for grade ${grade} students.`;
  
  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse the JSON response
    const questions = parseQuestionResponse(responseText, type);
    return questions;
  } catch (error) {
    console.error('LLM generation error:', error);
    return [];
  }
}

/**
 * Parse LLM response into structured questions
 */
function parseQuestionResponse(
  responseText: string,
  type: string
): Omit<GeneratedQuestion, 'sourceChunkId' | 'topic' | 'qualityScore'>[] {
  const questions: Omit<GeneratedQuestion, 'sourceChunkId' | 'topic' | 'qualityScore'>[] = [];
  
  try {
    // Clean up the response - remove markdown code blocks if present
    let cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    // Try to parse as JSON
    const parsed = JSON.parse(cleanedResponse);
    
    // Handle both single question and array of questions
    const questionData = Array.isArray(parsed) ? parsed : [parsed];
    
    for (const q of questionData) {
      const difficulty = mapDifficulty(q.difficulty);
      
      const question: Omit<GeneratedQuestion, 'sourceChunkId' | 'topic' | 'qualityScore'> = {
        question: q.question || '',
        questionType: type,
        options: q.options || undefined,
        correctAnswer: normalizeCorrectAnswer(type, q.correctAnswer || '', q.options),
        explanation: q.explanation || undefined,
        difficulty,
      };
      
      questions.push(question);
    }
  } catch (error) {
    console.error('Failed to parse question response:', error);
    // Try to extract questions using regex fallback
    questions.push(...parseWithFallback(responseText, type));
  }
  
  return questions;
}

function normalizeCorrectAnswer(type: string, answer: string, options?: string[]): string {
  if (type !== 'MCQ') return answer;
  if (!options || options.length === 0) return answer;

  const trimmed = answer.trim();
  const indexMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
  const byLetter = indexMap[trimmed.toUpperCase()];
  if (byLetter !== undefined && options[byLetter]) {
    return options[byLetter];
  }

  return answer;
}

/**
 * Fallback parser for non-JSON responses
 */
function parseWithFallback(
  responseText: string,
  type: string
): Omit<GeneratedQuestion, 'sourceChunkId' | 'topic' | 'qualityScore'>[] {
  const questions: Omit<GeneratedQuestion, 'sourceChunkId' | 'topic' | 'qualityScore'>[] = [];
  
  // Simple pattern matching for questions
  const questionMatch = responseText.match(/question[:\s]+["']?(.+?)["']?(?:\n|$)/i);
  const answerMatch = responseText.match(/(?:answer|correct)[:\s]+["']?(.+?)["']?(?:\n|$)/i);
  
  if (questionMatch && answerMatch) {
    questions.push({
      question: questionMatch[1].trim(),
      questionType: type,
      correctAnswer: answerMatch[1].trim(),
      difficulty: 'MEDIUM',
    });
  }
  
  return questions;
}

/**
 * Map string difficulty to uppercase
 */
function mapDifficulty(difficulty: string): string {
  const lower = (difficulty || '').toLowerCase();
  if (lower === 'easy') return 'EASY';
  if (lower === 'hard') return 'HARD';
  return 'MEDIUM';
}

/**
 * Validate a generated question
 */
export function validateQuestion(question: Omit<GeneratedQuestion, 'qualityScore'>): QuestionValidation {
  const issues: string[] = [];
  let qualityScore = 0.5;
  
  // Check question length
  if (question.question.length < 10) {
    issues.push('Question is too short');
    qualityScore -= 0.2;
  } else if (question.question.length >= 20 && question.question.length <= 200) {
    qualityScore += 0.1;
  }
  
  // Check for proper question format
  if (!question.question.includes('?') && question.questionType !== 'FILL_BLANK') {
    issues.push('Question missing question mark');
    qualityScore -= 0.05;
  }
  
  // Type-specific validation
  if (question.questionType === 'MCQ') {
    if (!question.options || question.options.length !== 4) {
      issues.push('MCQ should have exactly 4 options');
      qualityScore -= 0.2;
    } else {
      qualityScore += 0.1;
    }
  }
  
  if (question.questionType === 'TRUE_FALSE') {
    if (!['true', 'false'].includes(question.correctAnswer.toLowerCase())) {
      issues.push('True/False answer must be "true" or "false"');
      qualityScore -= 0.2;
    }
  }
  
  if (question.questionType === 'FILL_BLANK') {
    if (!question.question.includes('[BLANK]') && !question.question.includes('____')) {
      issues.push('Fill-in-blank should have a blank placeholder');
      qualityScore -= 0.1;
    }
  }
  
  // Check for answer
  if (!question.correctAnswer || question.correctAnswer.trim() === '') {
    issues.push('Missing correct answer');
    qualityScore -= 0.3;
  }
  
  // Bonus for having explanation
  if (question.explanation && question.explanation.length > 10) {
    qualityScore += 0.15;
  }
  
  // Ensure score is between 0 and 1
  qualityScore = Math.max(0, Math.min(1, qualityScore));
  
  return {
    isValid: issues.length === 0,
    issues,
    qualityScore,
  };
}

/**
 * Check if a similar question already exists
 */
export async function checkForDuplicate(questionText: string): Promise<boolean> {
  // Simple check - can be enhanced with embeddings
  const existing = await db.quizQuestion.findFirst({
    where: {
      question: {
        contains: questionText.substring(0, 50),
      },
    },
  });
  
  return !!existing;
}

/**
 * Store generated questions in database
 */
export async function storeQuestions(questions: GeneratedQuestion[]): Promise<string[]> {
  const questionIds: string[] = [];
  
  for (const q of questions) {
    // Get the chunk to retrieve sourceId
    const chunk = await db.contentChunk.findUnique({ 
      where: { id: q.sourceChunkId },
      include: { source: true }
    });
    
    if (!chunk) {
      console.error(`Chunk not found: ${q.sourceChunkId}`);
      continue;
    }
    
    try {
      const question = await db.quizQuestion.create({
        data: {
          sourceId: chunk.sourceId,
          chunkId: q.sourceChunkId,
          question: q.question,
          questionType: q.questionType,
          options: q.options ? JSON.stringify(q.options) : null,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          topic: q.topic,
          qualityScore: q.qualityScore,
        },
      });
      
      questionIds.push(question.id);
      
      // Update source document question count
      await db.sourceDocument.update({
        where: { id: chunk.sourceId },
        data: {
          questionCount: { increment: 1 },
        },
      });
    } catch (error) {
      console.error('Error storing question:', error);
    }
  }
  
  return questionIds;
}

/**
 * Generate quiz questions for a source document
 */
export async function generateQuizForDocument(
  sourceId: string,
  questionsPerChunk: number = 2
): Promise<{ questionsCreated: number; questionIds: string[] }> {
  const document = await db.sourceDocument.findUnique({
    where: { id: sourceId },
    include: { chunks: true },
  });
  
  if (!document) {
    throw new Error(`Document not found: ${sourceId}`);
  }
  
  const allQuestions: GeneratedQuestion[] = [];
  
  // Generate questions for each chunk
  for (const chunk of document.chunks) {
    // Skip low-quality chunks
    if (chunk.qualityScore < 0.3) continue;
    
    const questions = await generateQuestionsFromChunk(chunk.id, questionsPerChunk);
    allQuestions.push(...questions);
  }
  
  // Store all questions
  const questionIds = await storeQuestions(allQuestions);
  
  return {
    questionsCreated: allQuestions.length,
    questionIds,
  };
}

/**
 * Get quiz questions with filters
 */
export async function getQuizQuestions(filters: {
  topic?: string;
  difficulty?: string;
  type?: string;
  limit?: number;
  excludeIds?: string[];
}) {
  const where: Record<string, unknown> = {
    isDuplicate: false,
    qualityScore: { gte: 0.3 },
  };
  
  if (filters.topic) {
    where.topic = { contains: filters.topic };
  }
  
  if (filters.difficulty) {
    where.difficulty = filters.difficulty;
  }
  
  if (filters.type) {
    where.questionType = filters.type;
  }
  
  if (filters.excludeIds && filters.excludeIds.length > 0) {
    where.id = { notIn: filters.excludeIds };
  }
  
  const questions = await db.quizQuestion.findMany({
    where,
    take: filters.limit || 10,
    orderBy: { qualityScore: 'desc' },
  });
  
  return questions;
}
