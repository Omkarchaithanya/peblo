# Peblo AI - Content Ingestion + Adaptive Quiz Engine

A powerful AI-powered learning platform that ingests educational content from PDFs and converts it into interactive learning experiences with adaptive difficulty.

## 🏆 Features

### Core Features
- **PDF Content Ingestion** - Extract and structure content from educational PDFs
- **Intelligent Chunking** - Semantic-aware text segmentation preserving context
- **AI Quiz Generation** - LLM-powered question generation (MCQ, True/False, Fill-in-blank)
- **Adaptive Difficulty** - ELO-based rating system for personalized learning
- **Quality Scoring** - Automatic validation and quality assessment of questions
- **Duplicate Detection** - Prevent redundant questions in the system

### Unique Features
- **ELO-like Rating System** - Sophisticated difficulty adjustment algorithm
- **Topic Mastery Tracking** - Per-topic skill assessment
- **Content Traceability** - Every question links back to source content
- **Question Quality Metrics** - Automated scoring (0-1 scale)
- **Streak Bonuses** - Gamification elements for engagement

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Peblo AI Platform                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │    PDF       │   │    Quiz      │   │   Adaptive   │        │
│  │  Ingestion   │──▶│  Generation  │──▶│  Difficulty  │        │
│  │   Service    │   │   Service    │   │   Service    │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│         │                  │                   │                │
│         ▼                  ▼                   ▼                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Database Layer                        │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │ Source  │  │ Content │  │  Quiz   │  │ Student │    │   │
│  │  │  Docs   │  │ Chunks  │  │Questions│  │ Answers │    │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     REST API Layer                       │   │
│  │  POST /api/ingest  │  POST /api/generate-quiz           │   │
│  │  GET  /api/quiz    │  POST /api/submit-answer           │   │
│  │  GET  /api/students│  GET  /api/documents               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Database Schema

### Core Tables

```sql
-- Source Documents
SourceDocument {
  id, filename, grade, subject, topic,
  status, chunkCount, questionCount
}

-- Content Chunks
ContentChunk {
  id, sourceId, chunkIndex, text, cleanedText,
  topic, keywords, wordCount, qualityScore
}

-- Quiz Questions
QuizQuestion {
  id, sourceId, chunkId, question, questionType,
  options, correctAnswer, difficulty, qualityScore
}

-- Students
Student {
  id, name, overallRating, totalQuestions,
  totalCorrect, currentStreak, preferredDifficulty
}

-- Student Answers
StudentAnswer {
  id, studentId, questionId, selectedAnswer,
  isCorrect, ratingBefore, ratingAfter
}
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ 
- Bun package manager
- SQLite (included)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd peblo-ai-quiz-engine

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env

# Initialize database
bun run db:push

# Start development server
bun run dev
```

### Environment Variables

Create a `.env` file with:

```env
DATABASE_URL="file:./db/custom.db"
```

## 📡 API Endpoints

### POST /api/ingest
Upload and process a PDF file.

**Request:**
```bash
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@peblo_pdf_grade3_science_plants_animals.pdf"
```

**Response:**
```json
{
  "success": true,
  "message": "PDF ingested successfully",
  "data": {
    "documentId": "clx123abc",
    "chunksCreated": 12
  }
}
```

### POST /api/generate-quiz
Generate quiz questions from ingested content.

**Request:**
```bash
curl -X POST http://localhost:3000/api/generate-quiz \
  -H "Content-Type: application/json" \
  -d '{"sourceId": "clx123abc", "count": 5}'
```

**Response:**
```json
{
  "success": true,
  "message": "Generated 5 quiz questions",
  "data": {
    "questionsCreated": 5,
    "questionIds": ["q1", "q2", "q3", "q4", "q5"]
  }
}
```

### GET /api/quiz
Retrieve quiz questions with filters.

**Request:**
```bash
curl "http://localhost:3000/api/quiz?topic=plants&difficulty=medium&limit=10"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "q1",
        "question": "What do plants use to make food?",
        "type": "MCQ",
        "options": ["Water", "Sunlight", "Soil", "Air"],
        "difficulty": "medium",
        "topic": "Plants"
      }
    ],
    "total": 10
  }
}
```

### POST /api/submit-answer
Submit a student's answer and get adaptive feedback.

**Request:**
```bash
curl -X POST http://localhost:3000/api/submit-answer \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student123",
    "questionId": "q1",
    "selectedAnswer": "B"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isCorrect": true,
    "correctAnswer": "B",
    "explanation": "Plants use sunlight for photosynthesis...",
    "rating": {
      "before": 1000,
      "after": 1025,
      "change": 25
    },
    "suggestedDifficulty": "medium",
    "message": "Correct! Your rating increased by 25 points."
  }
}
```

### GET /api/students
List all students or get specific student.

### GET /api/documents
List all ingested documents.

## 🧠 Adaptive Difficulty Algorithm

The system uses an ELO-like rating system:

```
Rating Change = K × (Actual - Expected) × DifficultyWeight × QualityFactor

Where:
- K = 32 (standard ELO factor)
- Actual = 1 for correct, 0 for incorrect
- Expected = 1 / (1 + 10^((QuestionRating - StudentRating) / 400))
- DifficultyWeight = {Easy: 0.8, Medium: 1.0, Hard: 1.3}
- QualityFactor = 0.5 + QuestionQualityScore
```

### Difficulty Thresholds
- **Easy**: Rating 0 - 1100
- **Medium**: Rating 1100 - 1400
- **Hard**: Rating 1400+

## 🎯 Sample Outputs

### Extracted Content Chunk
```json
{
  "id": "SRC_001_CH_001",
  "sourceId": "SRC_001",
  "chunkIndex": 0,
  "text": "Plants are living things that grow in soil...",
  "cleanedText": "Plants are living things that grow in soil...",
  "topic": "Plants and Animals",
  "keywords": ["plants", "roots", "leaves", "photosynthesis"],
  "wordCount": 150,
  "qualityScore": 0.85
}
```

### Generated Quiz Question
```json
{
  "id": "Q_001",
  "question": "What part of the plant absorbs water from the soil?",
  "type": "MCQ",
  "options": ["Leaves", "Stem", "Roots", "Flowers"],
  "correctAnswer": "C",
  "difficulty": "easy",
  "explanation": "Roots are the underground parts of plants that absorb water and minerals from the soil.",
  "sourceChunkId": "SRC_001_CH_001",
  "qualityScore": 0.92
}
```

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ingest/route.ts       # PDF upload endpoint
│   │   ├── generate-quiz/route.ts # Quiz generation endpoint
│   │   ├── quiz/route.ts         # Quiz retrieval endpoint
│   │   ├── submit-answer/route.ts # Answer submission endpoint
│   │   ├── students/route.ts     # Student management
│   │   └── documents/route.ts    # Document management
│   └── page.tsx                  # Main dashboard UI
├── lib/
│   ├── db.ts                     # Prisma client
│   ├── services/
│   │   ├── pdf-ingestion.ts      # PDF processing service
│   │   ├── quiz-generation.ts    # LLM quiz generation
│   │   └── adaptive-difficulty.ts # ELO rating system
│   └── utils.ts
└── prisma/
    └── schema.prisma             # Database schema
```

## 🧪 Testing

```bash
# Run linting
bun run lint

# Test PDF ingestion (requires sample PDFs)
# Use the UI dashboard or curl commands above
```

## 📝 Sample PDFs

The following sample PDFs are provided for testing:
1. `peblo_pdf_grade1_math_numbers.pdf` - Numbers, counting, and shapes
2. `peblo_pdf_grade3_science_plants_animals.pdf` - Plants and animals
3. `peblo_pdf_grade4_english_grammar.pdf` - Grammar and vocabulary

## 🎨 Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Database**: SQLite with Prisma ORM
- **AI/LLM**: z-ai-web-dev-sdk
- **UI**: Tailwind CSS + shadcn/ui
- **PDF Processing**: pdf-parse

## 📄 License

MIT License

## 👥 Author

Built for the Peblo AI Backend Engineer Challenge.
