/**
 * Students API Routes
 * 
 * GET - List students or get specific student
 * POST - Create a new student
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStudentPerformanceStats } from '@/lib/services/adaptive-difficulty';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('id');
    const includeStats = searchParams.get('stats') === 'true';
    
    if (studentId) {
      // Get specific student
      const student = await db.student.findUnique({
        where: { id: studentId },
        include: {
          progress: true,
          _count: {
            select: { answers: true, sessions: true },
          },
        },
      });
      
      if (!student) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        );
      }
      
      let stats = null;
      if (includeStats) {
        stats = await getStudentPerformanceStats(studentId);
      }
      
      return NextResponse.json({
        success: true,
        data: {
          ...student,
          topicMastery: student.topicMastery ? JSON.parse(student.topicMastery) : {},
          stats,
        },
      });
    }
    
    // Get all students
    const students = await db.student.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { answers: true, sessions: true },
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch students',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      name,
      email,
      preferredDifficulty,
      learningPace,
    } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Student name is required' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    if (email) {
      const existing = await db.student.findUnique({
        where: { email },
      });
      
      if (existing) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 400 }
        );
      }
    }
    
    // Create student
    const student = await db.student.create({
      data: {
        name,
        email,
        preferredDifficulty: preferredDifficulty || 'MEDIUM',
        learningPace: learningPace || 'NORMAL',
        topicMastery: JSON.stringify({}),
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Student created successfully',
      data: student,
    });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create student',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
