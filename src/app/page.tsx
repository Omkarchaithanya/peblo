'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, FileText, Brain, Users, Play, CheckCircle, XCircle, 
  TrendingUp, Target, Award, Zap, Database, Settings, Trash2
} from 'lucide-react';

// Types
interface Document {
  id: string;
  filename: string;
  grade: number;
  subject: string;
  topic: string;
  status: string;
  chunkCount: number;
  questionCount: number;
  createdAt: string;
}

interface Question {
  id: string;
  question: string;
  type: string;
  options: string[] | null;
  difficulty: string;
  topic: string;
  qualityScore: number;
}

interface Student {
  id: string;
  name: string;
  overallRating: number;
  totalQuestions: number;
  totalCorrect: number;
  currentStreak: number;
  preferredDifficulty: string;
}

interface QuizResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation?: string;
  rating: {
    before: number;
    after: number;
    change: number;
  };
  suggestedDifficulty: string;
  message: string;
  nextQuestion?: Question;
}

export default function PebloDashboard() {
  // State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reviewQuestions, setReviewQuestions] = useState<Question[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ingest');
  
  // Form states
  const [studentName, setStudentName] = useState('');
  const [quizTopic, setQuizTopic] = useState('');
  const [quizDifficulty, setQuizDifficulty] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  
  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [docsRes, studentsRes] = await Promise.all([
          fetch('/api/documents'),
          fetch('/api/students')
        ]);
        const docsData = await docsRes.json();
        const studentsData = await studentsRes.json();
        
        if (docsData.success) {
          setDocuments(docsData.data);
        }
        if (studentsData.success) {
          setStudents(studentsData.data);
          if (studentsData.data.length > 0) {
            setSelectedStudent(studentsData.data[0]);
          }
        }

        const reviewRes = await fetch('/api/quiz?limit=20');
        const reviewData = await reviewRes.json();
        if (reviewData.success) {
          setReviewQuestions(reviewData.data.questions || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
    loadData();
  }, []);

  // Fetch questions when quiz tab is active
  useEffect(() => {
    async function loadQuestions() {
      if (activeTab !== 'quiz') return;
      try {
        const params = new URLSearchParams();
        if (quizTopic) params.append('topic', quizTopic);
        if (quizDifficulty) params.append('difficulty', quizDifficulty);
        params.append('limit', '10');
        
        const res = await fetch(`/api/quiz?${params}`);
        const data = await res.json();
        if (data.success) {
          setQuestions(data.data.questions);
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
      }
    }
    loadQuestions();
  }, [activeTab, quizTopic, quizDifficulty]);

  // Fetch functions for manual refresh
  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        setStudents(data.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchReviewQuestions = async () => {
    try {
      const res = await fetch('/api/quiz?limit=20');
      const data = await res.json();
      if (data.success) {
        setReviewQuestions(data.data.questions || []);
      }
    } catch (error) {
      console.error('Error fetching review questions:', error);
    }
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (data.success) {
        alert(`PDF ingested successfully! Created ${data.data.chunksCreated} content chunks.`);
        fetchDocuments();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload PDF');
    }
    setLoading(false);
  };

  // Generate quiz questions
  const handleGenerateQuiz = async (sourceId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, count: 3 }),
      });
      const data = await res.json();
      
      if (data.success) {
        alert(`Generated ${data.data.questionsCreated} quiz questions!`);
        await fetchDocuments();
        await fetchReviewQuestions();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate quiz');
    }
    setLoading(false);
  };

  // Delete uploaded document and related generated data
  const handleDeleteDocument = async (documentId: string, filename: string) => {
    const confirmed = window.confirm(`Delete ${filename}? This will also remove related chunks and generated questions.`);
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/documents?id=${documentId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setCurrentQuestion(null);
        setQuizResult(null);
        setSelectedAnswer('');
        await fetchDocuments();
        await fetchReviewQuestions();
        alert('Document deleted. You can now upload a fresh PDF.');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document');
    }
    setLoading(false);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    const confirmed = window.confirm('Delete this generated question?');
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/quiz?id=${questionId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        await fetchDocuments();
        await fetchReviewQuestions();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Delete question error:', error);
      alert('Failed to delete question');
    }
    setLoading(false);
  };

  // Create student
  const handleCreateStudent = async () => {
    if (!studentName.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: studentName }),
      });
      const data = await res.json();
      
      if (data.success) {
        setStudentName('');
        fetchStudents();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Student creation error:', error);
    }
    setLoading(false);
  };

  // Get adaptive question
  const getAdaptiveQuestion = async () => {
    if (!selectedStudent) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/quiz?studentId=${selectedStudent.id}&adaptive=true`);
      const data = await res.json();
      
      if (data.success && data.data.questions.length > 0) {
        setCurrentQuestion(data.data.questions[0]);
        setQuizResult(null);
        setSelectedAnswer('');
      } else {
        alert('No questions available. Please generate some questions first.');
      }
    } catch (error) {
      console.error('Error getting adaptive question:', error);
    }
    setLoading(false);
  };

  // Submit answer
  const handleSubmitAnswer = async () => {
    if (!selectedStudent || !currentQuestion || !selectedAnswer) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          questionId: currentQuestion.id,
          selectedAnswer,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setQuizResult(data.data);
        // Update student data
        fetchStudents();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
    }
    setLoading(false);
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Peblo AI
                </h1>
                <p className="text-xs text-slate-600">Content Ingestion + Adaptive Quiz Engine</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="border-slate-300">
                <Database className="w-3 h-3 mr-1" />
                {documents.length} Documents
              </Badge>
              <Badge variant="outline" className="border-slate-300">
                <FileText className="w-3 h-3 mr-1" />
                {questions.length} Questions
              </Badge>
              <Badge variant="outline" className="border-slate-300">
                <Users className="w-3 h-3 mr-1" />
                {students.length} Students
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto bg-white">
            <TabsTrigger value="ingest" className="data-[state=active]:bg-blue-600">
              <Upload className="w-4 h-4 mr-2" />
              Ingest
            </TabsTrigger>
            <TabsTrigger value="generate" className="data-[state=active]:bg-purple-600">
              <Zap className="w-4 h-4 mr-2" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="quiz" className="data-[state=active]:bg-green-600">
              <Play className="w-4 h-4 mr-2" />
              Quiz
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-orange-600">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Ingest Tab */}
          <TabsContent value="ingest" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Section */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-400" />
                    Upload PDF
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Upload educational PDFs to extract content and generate quiz questions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="pdf-upload"
                      disabled={loading}
                    />
                    <label htmlFor="pdf-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                      <p className="text-slate-600 mb-2">
                        {loading ? 'Processing...' : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-slate-600">PDF files only (max 10MB)</p>
                    </label>
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2 text-sm">Expected filename format:</h4>
                    <code className="text-xs text-blue-400 block">
                      peblo_pdf_grade[N]_[subject]_[topic].pdf
                    </code>
                    <p className="text-xs text-slate-600 mt-2">
                      Example: peblo_pdf_grade3_science_plants_animals.pdf
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Documents List */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-400" />
                    Ingested Documents
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Documents that have been processed and are ready for quiz generation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-600 mb-3">
                    Want to upload a fresh document? Delete an old one below, then use the Upload PDF panel.
                  </p>
                  <ScrollArea className="h-80">
                    <div className="space-y-3">
                      {documents.length === 0 ? (
                        <div className="text-center text-slate-600 py-8">
                          No documents uploaded yet
                        </div>
                      ) : (
                        documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm truncate">{doc.filename}</h4>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    Grade {doc.grade}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {doc.subject}
                                  </Badge>
                                  <Badge 
                                    className={`text-xs ${
                                      doc.status === 'COMPLETED' 
                                        ? 'bg-green-600' 
                                        : doc.status === 'PROCESSING' 
                                          ? 'bg-yellow-600' 
                                          : 'bg-red-600'
                                    }`}
                                  >
                                    {doc.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right text-xs text-slate-600">
                                <div>{doc.chunkCount} chunks</div>
                                <div>{doc.questionCount} questions</div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-2 border-red-200 text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                                  disabled={loading}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Documents to Generate */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Generate Quiz Questions
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Select a document to generate quiz questions using AI
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80">
                    <div className="space-y-3">
                      {documents.filter(d => d.status === 'COMPLETED').length === 0 ? (
                        <div className="text-center text-slate-600 py-8">
                          No processed documents available. Upload and process a PDF first.
                        </div>
                      ) : (
                        documents
                          .filter(d => d.status === 'COMPLETED')
                          .map((doc) => (
                            <div
                              key={doc.id}
                              className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-sm">{doc.topic}</h4>
                                  <p className="text-xs text-slate-600 mt-1">
                                    Grade {doc.grade} • {doc.subject}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    onClick={() => handleGenerateQuiz(doc.id)}
                                    disabled={loading}
                                    size="sm"
                                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                                  >
                                    <Zap className="w-4 h-4 mr-1" />
                                    Generate
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-red-200 text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                                    disabled={loading}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
                                <span>{doc.chunkCount} content chunks</span>
                                <span>{doc.questionCount} questions generated</span>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Generation Info */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-400" />
                    AI Quiz Generation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-sm font-bold">
                        MC
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Multiple Choice</h4>
                        <p className="text-xs text-slate-600">4 options, one correct answer</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-sm font-bold">
                        T/F
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">True / False</h4>
                        <p className="text-xs text-slate-600">Statement verification</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-sm font-bold">
                        FB
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Fill in the Blank</h4>
                        <p className="text-xs text-slate-600">Complete the missing word</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-700" />

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Question Quality Features</h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li>• Automatic quality scoring (0-1)</li>
                      <li>• Duplicate detection</li>
                      <li>• Content traceability</li>
                      <li>• Difficulty classification</li>
                    </ul>
                  </div>

                  <Separator className="bg-slate-300" />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Generated Questions Review</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-300"
                        onClick={fetchReviewQuestions}
                        disabled={loading}
                      >
                        Refresh
                      </Button>
                    </div>

                    <ScrollArea className="h-44">
                      <div className="space-y-2">
                        {reviewQuestions.length === 0 ? (
                          <p className="text-xs text-slate-600">No generated questions yet. Click Generate on a document.</p>
                        ) : (
                          reviewQuestions.map((q) => (
                            <div key={q.id} className="rounded-lg border border-slate-200 bg-white p-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-slate-800 line-clamp-2">{q.question}</p>
                                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-600">
                                    <span>{q.type}</span>
                                    <span>•</span>
                                    <span>{q.difficulty}</span>
                                    <span>•</span>
                                    <span>{q.topic}</span>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 border-red-200 text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  disabled={loading}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Quiz Tab */}
          <TabsContent value="quiz" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Student Selection */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-400" />
                    Student
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedStudent && (
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h4 className="font-medium">{selectedStudent.name}</h4>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Rating</span>
                          <span className="font-mono text-blue-400">{selectedStudent.overallRating}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Accuracy</span>
                          <span>
                            {selectedStudent.totalQuestions > 0
                              ? Math.round((selectedStudent.totalCorrect / selectedStudent.totalQuestions) * 100)
                              : 0}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Streak</span>
                          <span className="text-orange-600">🔥 {selectedStudent.currentStreak}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Select
                    value={selectedStudent?.id || ''}
                    onValueChange={(id) => {
                      const student = students.find(s => s.id === id);
                      setSelectedStudent(student || null);
                    }}
                  >
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-300">
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} (Rating: {s.overallRating})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Input
                      placeholder="New student name"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="bg-white border-slate-300"
                    />
                    <Button onClick={handleCreateStudent} disabled={loading} size="sm">
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quiz Interface */}
              <Card className="bg-white border-slate-200 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-400" />
                    Adaptive Quiz
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    AI-powered difficulty adjustment based on your performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!currentQuestion ? (
                    <div className="text-center py-8">
                      <Brain className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                      <p className="text-slate-600 mb-4">
                        Ready to test your knowledge?
                      </p>
                      <Button
                        onClick={getAdaptiveQuestion}
                        disabled={loading || !selectedStudent}
                        className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Adaptive Quiz
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Question */}
                      <div className="bg-slate-50 rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Badge className={`${getDifficultyColor(currentQuestion.difficulty)}`}>
                            {currentQuestion.difficulty}
                          </Badge>
                          <Badge variant="outline" className="border-slate-300">
                            {currentQuestion.type}
                          </Badge>
                          <Badge variant="outline" className="border-slate-300">
                            {currentQuestion.topic}
                          </Badge>
                        </div>
                        
                        <h3 className="text-lg font-medium mb-4">{currentQuestion.question}</h3>
                        
                        {currentQuestion.type === 'MCQ' && currentQuestion.options && (
                          <div className="space-y-2">
                            {currentQuestion.options.map((opt, idx) => (
                              <Button
                                key={idx}
                                variant={selectedAnswer === opt ? 'default' : 'outline'}
                                className={`w-full justify-start ${
                                  selectedAnswer === opt
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : 'border-slate-300 hover:border-blue-500'
                                }`}
                                onClick={() => setSelectedAnswer(opt)}
                              >
                                <span className="mr-2 font-bold">{String.fromCharCode(65 + idx)}.</span>
                                {opt}
                              </Button>
                            ))}
                          </div>
                        )}
                        
                        {currentQuestion.type === 'TRUE_FALSE' && (
                          <div className="flex gap-4">
                            <Button
                              variant={selectedAnswer === 'true' ? 'default' : 'outline'}
                              className={`flex-1 ${
                                selectedAnswer === 'true'
                                  ? 'bg-green-600 hover:bg-green-700'
                                  : 'border-slate-300'
                              }`}
                              onClick={() => setSelectedAnswer('true')}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              True
                            </Button>
                            <Button
                              variant={selectedAnswer === 'false' ? 'default' : 'outline'}
                              className={`flex-1 ${
                                selectedAnswer === 'false'
                                  ? 'bg-red-600 hover:bg-red-700'
                                  : 'border-slate-300'
                              }`}
                              onClick={() => setSelectedAnswer('false')}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              False
                            </Button>
                          </div>
                        )}
                        
                        {currentQuestion.type === 'FILL_BLANK' && (
                          <Input
                            placeholder="Type your answer..."
                            value={selectedAnswer}
                            onChange={(e) => setSelectedAnswer(e.target.value)}
                            className="bg-white border-slate-300"
                          />
                        )}
                      </div>

                      {/* Result */}
                      {quizResult && (
                        <div className={`rounded-lg p-4 ${
                          quizResult.isCorrect ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            {quizResult.isCorrect ? (
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-400" />
                            )}
                            <span className="font-medium">
                              {quizResult.isCorrect ? 'Correct!' : 'Incorrect'}
                            </span>
                          </div>
                          
                          {!quizResult.isCorrect && (
                            <p className="text-sm mb-2">
                              Correct answer: <strong>{quizResult.correctAnswer}</strong>
                            </p>
                          )}
                          
                          {quizResult.explanation && (
                            <p className="text-sm text-slate-700 mb-3">{quizResult.explanation}</p>
                          )}
                          
                          <div className="flex items-center justify-between text-sm">
                            <span>
                              Rating: {quizResult.rating.before} → {quizResult.rating.after} 
                              <span className={quizResult.rating.change >= 0 ? 'text-green-400 ml-1' : 'text-red-400 ml-1'}>
                                ({quizResult.rating.change >= 0 ? '+' : ''}{quizResult.rating.change})
                              </span>
                            </span>
                            <Badge className={`${getDifficultyColor(quizResult.suggestedDifficulty)}`}>
                              Next: {quizResult.suggestedDifficulty}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3">
                        {!quizResult ? (
                          <Button
                            onClick={handleSubmitAnswer}
                            disabled={loading || !selectedAnswer}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                          >
                            Submit Answer
                          </Button>
                        ) : (
                          <Button
                            onClick={getAdaptiveQuestion}
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-green-600 to-blue-600"
                          >
                            Next Question
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Total Documents</p>
                      <h3 className="text-3xl font-bold">{documents.length}</h3>
                    </div>
                    <FileText className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Total Questions</p>
                      <h3 className="text-3xl font-bold">{questions.length}</h3>
                    </div>
                    <Brain className="w-8 h-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Active Students</p>
                      <h3 className="text-3xl font-bold">{students.length}</h3>
                    </div>
                    <Users className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Content Chunks</p>
                      <h3 className="text-3xl font-bold">
                        {documents.reduce((acc, d) => acc + d.chunkCount, 0)}
                      </h3>
                    </div>
                    <Database className="w-8 h-8 text-orange-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Student Leaderboard */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  Student Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-slate-600 border-b border-slate-200">
                        <th className="pb-3">Rank</th>
                        <th className="pb-3">Student</th>
                        <th className="pb-3">Rating</th>
                        <th className="pb-3">Accuracy</th>
                        <th className="pb-3">Questions</th>
                        <th className="pb-3">Streak</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students
                        .sort((a, b) => b.overallRating - a.overallRating)
                        .map((student, idx) => (
                          <tr key={student.id} className="border-b border-slate-200">
                            <td className="py-3">
                              <span className={`font-bold ${
                                idx === 0 ? 'text-yellow-400' :
                                idx === 1 ? 'text-slate-700' :
                                idx === 2 ? 'text-orange-400' : ''
                              }`}>
                                #{idx + 1}
                              </span>
                            </td>
                            <td className="py-3 font-medium">{student.name}</td>
                            <td className="py-3">
                              <span className="font-mono text-blue-400">{student.overallRating}</span>
                            </td>
                            <td className="py-3">
                              {student.totalQuestions > 0
                                ? Math.round((student.totalCorrect / student.totalQuestions) * 100)
                                : 0}%
                            </td>
                            <td className="py-3">{student.totalQuestions}</td>
                            <td className="py-3">
                              {student.currentStreak > 0 && (
                                <span className="text-orange-600">🔥 {student.currentStreak}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* System Architecture */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-600" />
                  System Architecture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <h4 className="font-medium mb-2">Content Ingestion</h4>
                    <p className="text-xs text-slate-600">
                      PDF parsing, text extraction, intelligent chunking, metadata extraction
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <h4 className="font-medium mb-2">Quiz Generation</h4>
                    <p className="text-xs text-slate-600">
                      LLM-powered question generation, validation, quality scoring, duplicate detection
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <h4 className="font-medium mb-2">Adaptive Learning</h4>
                    <p className="text-xs text-slate-600">
                      ELO-based difficulty adjustment, topic mastery tracking, personalized recommendations
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-slate-600">
          Peblo AI Backend Engineer Challenge • Built with Next.js, Prisma, and AI
        </div>
      </footer>
    </div>
  );
}

