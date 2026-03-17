/**
 * Documents API Routes
 * 
 * Manage source documents and their content chunks
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    const includeChunks = searchParams.get('chunks') === 'true';
    const includeQuestions = searchParams.get('questions') === 'true';
    
    if (documentId) {
      const document = await db.sourceDocument.findUnique({
        where: { id: documentId },
        include: {
          chunks: includeChunks ? {
            orderBy: { chunkIndex: 'asc' },
          } : false,
          questions: includeQuestions ? {
            take: 20,
            orderBy: { createdAt: 'desc' },
          } : false,
          _count: {
            select: { chunks: true, questions: true },
          },
        },
      });
      
      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: document,
      });
    }
    
    // Get all documents
    const documents = await db.sourceDocument.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { chunks: true, questions: true },
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }
    
    // Delete document and all related data (cascading)
    await db.sourceDocument.delete({
      where: { id: documentId },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
