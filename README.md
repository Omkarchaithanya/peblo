# Peblo AI - Content Ingestion + Adaptive Quiz Engine

Peblo AI converts uploaded PDF content into interactive quizzes and serves adaptive questions based on student performance.

## Overview

Peblo AI is a full-stack learning platform that provides:

- PDF ingestion and text extraction
- Chunked content storage for traceability
- AI-assisted question generation (MCQ, TRUE_FALSE, FILL_BLANK)
- Adaptive difficulty flow using a rating-based approach
- Question review and deletion controls before quiz usage

## Key Features

- PDF upload with validation (type and size checks)
- Intelligent content chunking with quality scoring
- Quiz generation with:
  - LLM path (via `z-ai-web-dev-sdk`)
  - Local fallback generation path when AI provider is unavailable
- Generated question review panel in UI
- Document lifecycle support (list and delete uploaded documents)
- Student profile and adaptive quiz progression
- API payload/query validation using `zod`

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Prisma + SQLite
- Tailwind CSS + shadcn/ui
- `pdf2json` for PDF parsing
- `z-ai-web-dev-sdk` for AI generation

## Project Structure

```text
src/
  app/
    api/
      documents/route.ts
      generate-quiz/route.ts
      ingest/route.ts
      quiz/route.ts
      students/route.ts
      submit-answer/route.ts
    layout.tsx
    page.tsx
  lib/
    db.ts
    services/
      adaptive-difficulty.ts
      pdf-ingestion.ts
      quiz-generation.ts
prisma/
  schema.prisma
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
git clone https://github.com/Omkarchaithanya/peblo.git
cd peblo
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and keep at least:

```env
DATABASE_URL="file:./db/custom.db"
```

Optional:

```env
# Optional external LLM key if needed by your setup
LLM_API_KEY=your_api_key_here
```

### Database Setup

```bash
npm run db:generate
npm run db:push
```

### Run Development Server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Common Run Issues (Windows)

### 1) `ENOENT ... C:\Users\<user>\package.json`

You are in the wrong folder. Run from project root:

```powershell
Set-Location C:\Users\omkar\Downloads\my-project\my-project
npm run dev
```

### 2) `EADDRINUSE: address already in use :::3000`

Port is occupied. Either stop the process or run a different port.

```powershell
$conn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force }
npm run dev
```

### 3) `Unable to acquire lock ... .next\dev\lock`

Stale Next.js dev process/lock file:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'next dev|\.next\\dev' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

if (Test-Path .next\dev\lock) { Remove-Item .next\dev\lock -Force }
npm run dev
```

## API Endpoints

### Ingestion

- `POST /api/ingest` - Upload and ingest a PDF
- `GET /api/ingest` - Get ingestion status/all ingested docs (legacy support path)

### Documents

- `GET /api/documents` - List documents or fetch by ID
- `DELETE /api/documents?id=<documentId>` - Delete a document and related data

### Quiz Generation

- `POST /api/generate-quiz` - Generate questions by `sourceId`, `chunkId`, or `topic`
- `GET /api/generate-quiz` - Fetch questions from generation service filters

### Quiz Retrieval / Review

- `GET /api/quiz` - Fetch questions with filters (`topic`, `difficulty`, `type`, `limit`, `offset`, etc.)
- `GET /api/quiz?studentId=<id>&adaptive=true` - Get adaptive next question
- `DELETE /api/quiz?id=<questionId>` - Delete one generated question

### Students and Answers

- `GET /api/students` - List students
- `POST /api/students` - Create student
- `POST /api/submit-answer` - Submit answer and get rating update + next suggestion

## Quick Demo Flow

Use this short sequence during demo:

1. Go to `Ingest` tab and upload a PDF.
2. Verify document appears as `COMPLETED`.
3. Open `Generate` tab and click `Generate` on that document.
4. Use `Generated Questions Review` panel to inspect/delete weak questions.
5. Go to `Quiz` tab, select/create student, and click `Start Adaptive Quiz`.
6. Submit answers and show rating change + suggested next difficulty.

## Scripts

- `npm run dev` - Start development server (port 3000)
- `npm run build` - Production build
- `npm run start` - Start standalone server build
- `npm run lint` - Run lint checks
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Sync schema to database
- `npm run db:migrate` - Create and apply migration
- `npm run db:reset` - Reset database

## Notes

- The app supports both AI generation and local fallback question generation.
- True/False fallback generation is mixed (not always `true`).
- UI theme is tuned for readability in demos (light contrast).

## License

MIT

## Author

Built for the Peblo AI Backend Engineer Challenge.
