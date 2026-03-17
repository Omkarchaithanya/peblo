/**
 * POST /api/ingest
 * 
 * PDF upload and ingestion endpoint.
 * Accepts PDF file, extracts content, creates chunks, and stores in database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ingestPDF, getAllDocuments, getIngestionStatus } from '@/lib/services/pdf-ingestion';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Ingest the PDF
    const result = await ingestPDF(buffer, file.name);
    
    return NextResponse.json({
      success: true,
      message: 'PDF ingested successfully',
      data: {
        documentId: result.documentId,
        chunksCreated: result.chunksCreated,
      },
    });
  } catch (error) {
    console.error('Ingestion error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to ingest PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    
    if (documentId) {
      // Get specific document status
      const document = await getIngestionStatus(documentId);
      
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
    const documents = await getAllDocuments();
    
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
