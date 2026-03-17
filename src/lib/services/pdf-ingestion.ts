/**
 * Peblo AI - PDF Ingestion Service
 * 
 * Handles PDF upload, text extraction, and intelligent content chunking.
 * Uses semantic-aware chunking to preserve context.
 */

import { db } from '@/lib/db';
import { ProcessingStatus } from '@prisma/client';
import PDFParser from 'pdf2json';

export interface ExtractedContent {
  text: string;
  pages: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

export interface ContentChunk {
  id: string;
  sourceId: string;
  chunkIndex: number;
  text: string;
  cleanedText: string;
  topic: string;
  keywords: string[];
  wordCount: number;
  sentenceCount: number;
  qualityScore: number;
}

export interface DocumentMetadata {
  grade: number;
  subject: string;
  topic: string;
  filename: string;
}

/**
 * Extract text from PDF buffer using pdf2json
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<ExtractedContent> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    
    pdfParser.on('pdfParser_dataError', (errData: { parserError: Error }) => {
      reject(new Error(`PDF extraction error: ${errData.parserError.message}`));
    });
    
    pdfParser.on('pdfParser_dataReady', (pdfData: { 
      Pages: Array<{ 
        Texts: Array<{ 
          R: Array<{ T: string }> 
        }> 
      }>,
      Meta?: { Title?: string; Author?: string; Subject?: string }
    }) => {
      // Extract text from all pages
      let text = '';
      for (const page of pdfData.Pages) {
        for (const textItem of page.Texts) {
          for (const run of textItem.R) {
            // Decode URI-encoded text
            try {
              text += decodeURIComponent(run.T) + ' ';
            } catch {
              text += run.T + ' ';
            }
          }
        }
        text += '\n';
      }
      
      resolve({
        text: text.trim(),
        pages: pdfData.Pages.length,
        metadata: {
          title: pdfData.Meta?.Title || undefined,
          author: pdfData.Meta?.Author || undefined,
          subject: pdfData.Meta?.Subject || undefined,
        },
      });
    });
    
    // Parse from buffer
    pdfParser.parseBuffer(buffer);
  });
}

/**
 * Parse document metadata from filename
 * Expected format: peblo_pdf_grade{N}_{subject}_{topic}.pdf
 * Example: peblo_pdf_grade3_science_plants_animals.pdf
 */
export function parseMetadataFromFilename(filename: string): DocumentMetadata {
  // Remove .pdf extension
  const baseName = filename.replace(/\.pdf$/i, '');
  
  // Default values
  let grade = 1;
  let subject = 'General';
  let topic = 'General';
  
  // Try to parse from filename pattern
  const gradeMatch = baseName.match(/grade(\d+)/i);
  if (gradeMatch) {
    grade = parseInt(gradeMatch[1], 10);
  }
  
  // Extract subject from filename
  const subjectPatterns: Record<string, string> = {
    'math': 'Math',
    'mathematics': 'Math',
    'science': 'Science',
    'english': 'English',
    'grammar': 'English',
    'vocabulary': 'English',
  };
  
  for (const [pattern, subj] of Object.entries(subjectPatterns)) {
    if (baseName.toLowerCase().includes(pattern)) {
      subject = subj;
      break;
    }
  }
  
  // Extract topic from filename
  const parts = baseName.toLowerCase().split('_');
  if (parts.length > 3) {
    // Get everything after subject as topic
    const topicParts = parts.slice(3);
    topic = topicParts.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  
  return { grade, subject, topic, filename };
}

/**
 * Clean and normalize text content
 */
export function cleanText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove non-printable characters
    .replace(/[^\x20-\x7E\n]/g, '')
    // Normalize quotes
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    // Trim
    .trim();
}

/**
 * Split text into sentences
 */
export function splitIntoSentences(text: string): string[] {
  // Simple sentence splitting - can be enhanced with NLP libraries
  return text
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Intelligent chunking that preserves semantic context
 * Creates chunks of ~200-400 words while trying to keep related content together
 */
export function createChunks(
  text: string, 
  sourceId: string,
  metadata: DocumentMetadata,
  maxChunkSize: number = 300,
  overlapSize: number = 50
): ContentChunk[] {
  const sentences = splitIntoSentences(text);
  const chunks: ContentChunk[] = [];
  
  let currentChunk: string[] = [];
  let currentWordCount = 0;
  let chunkIndex = 0;
  
  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).length;
    
    if (currentWordCount + sentenceWords > maxChunkSize && currentChunk.length > 0) {
      // Create chunk from accumulated sentences
      const chunkText = currentChunk.join(' ');
      chunks.push(createChunkObject(chunkText, sourceId, chunkIndex, metadata));
      chunkIndex++;
      
      // Keep some overlap for context continuity
      const overlapSentences = currentChunk.slice(-2);
      currentChunk = [...overlapSentences, sentence];
      currentWordCount = overlapSentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) + sentenceWords;
    } else {
      currentChunk.push(sentence);
      currentWordCount += sentenceWords;
    }
  }
  
  // Add final chunk
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(' ');
    chunks.push(createChunkObject(chunkText, sourceId, chunkIndex, metadata));
  }
  
  return chunks;
}

/**
 * Create a chunk object with metadata
 */
function createChunkObject(
  text: string, 
  sourceId: string, 
  chunkIndex: number,
  metadata: DocumentMetadata
): ContentChunk {
  const cleanedText = cleanText(text);
  const words = cleanedText.split(/\s+/);
  const sentences = splitIntoSentences(cleanedText);
  
  // Extract keywords (simple approach - can be enhanced with NLP)
  const keywords = extractKeywords(cleanedText);
  
  // Calculate quality score based on content characteristics
  const qualityScore = calculateQualityScore(cleanedText, words.length);
  
  return {
    id: `${sourceId}_CH${String(chunkIndex).padStart(3, '0')}`,
    sourceId,
    chunkIndex,
    text: text.trim(),
    cleanedText,
    topic: metadata.topic,
    keywords,
    wordCount: words.length,
    sentenceCount: sentences.length,
    qualityScore,
  };
}

/**
 * Extract keywords from text (simple frequency-based approach)
 */
function extractKeywords(text: string): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'as', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'under', 'again', 'further', 'then',
    'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and',
    'but', 'if', 'or', 'because', 'as', 'until', 'while', 'this', 'that',
    'these', 'those', 'which', 'who', 'whom', 'what', 'whose',
  ]);
  
  // Tokenize and count
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  const wordCount: Record<string, number> = {};
  for (const word of words) {
    wordCount[word] = (wordCount[word] || 0) + 1;
  }
  
  // Sort by frequency and return top keywords
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Calculate quality score for content chunk
 * Higher scores indicate better quality content for quiz generation
 */
function calculateQualityScore(text: string, wordCount: number): number {
  let score = 0.5; // Base score
  
  // Word count factor (prefer chunks with reasonable length)
  if (wordCount >= 50 && wordCount <= 300) {
    score += 0.2;
  } else if (wordCount >= 30 && wordCount <= 400) {
    score += 0.1;
  }
  
  // Check for educational content indicators
  const educationalPatterns = [
    /\b(learn|understand|explain|describe|define|example|because|therefore)\b/gi,
    /\b(question|answer|correct|incorrect|true|false)\b/gi,
    /\b(number|shape|animal|plant|grammar|sentence|word)\b/gi,
  ];
  
  for (const pattern of educationalPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length >= 2) {
      score += 0.1;
    }
  }
  
  // Penalize very short or repetitive content
  if (wordCount < 20) {
    score -= 0.3;
  }
  
  // Check for meaningful punctuation (indicates complete thoughts)
  const sentenceEndings = (text.match(/[.!?]/g) || []).length;
  if (sentenceEndings >= 3) {
    score += 0.1;
  }
  
  // Cap at 1.0
  return Math.min(Math.max(score, 0), 1);
}

/**
 * Main ingestion function - processes a PDF and stores content
 */
export async function ingestPDF(
  buffer: Buffer,
  filename: string
): Promise<{ documentId: string; chunksCreated: number }> {
  // Parse metadata from filename
  const metadata = parseMetadataFromFilename(filename);
  
  // Create source document record
  const document = await db.sourceDocument.create({
    data: {
      filename,
      originalName: filename,
      filePath: `/uploads/${filename}`,
      fileSize: buffer.length,
      mimeType: 'application/pdf',
      grade: metadata.grade,
      subject: metadata.subject,
      topic: metadata.topic,
      status: ProcessingStatus.PROCESSING,
    },
  });
  
  try {
    // Extract text from PDF
    const extracted = await extractTextFromPDF(buffer);
    
    // Create chunks
    const chunks = createChunks(extracted.text, document.id, metadata);
    
    // Store chunks in database
    for (const chunk of chunks) {
      await db.contentChunk.create({
        data: {
          id: chunk.id,
          sourceId: chunk.sourceId,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
          cleanedText: chunk.cleanedText,
          topic: chunk.topic,
          keywords: JSON.stringify(chunk.keywords),
          wordCount: chunk.wordCount,
          sentenceCount: chunk.sentenceCount,
          qualityScore: chunk.qualityScore,
        },
      });
    }
    
    // Update document status
    await db.sourceDocument.update({
      where: { id: document.id },
      data: {
        status: ProcessingStatus.COMPLETED,
        processedAt: new Date(),
        chunkCount: chunks.length,
      },
    });
    
    return {
      documentId: document.id,
      chunksCreated: chunks.length,
    };
  } catch (error) {
    // Update document status to failed
    await db.sourceDocument.update({
      where: { id: document.id },
      data: {
        status: ProcessingStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    
    throw error;
  }
}

/**
 * Get ingestion status
 */
export async function getIngestionStatus(documentId: string) {
  const document = await db.sourceDocument.findUnique({
    where: { id: documentId },
    include: {
      _count: {
        select: { chunks: true, questions: true },
      },
    },
  });
  
  return document;
}

/**
 * Get all documents
 */
export async function getAllDocuments() {
  return db.sourceDocument.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { chunks: true, questions: true },
      },
    },
  });
}
