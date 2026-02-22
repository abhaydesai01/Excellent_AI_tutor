# AI Student Intelligence Platform

An AI-driven doubt resolution and student analytics system designed to help educators identify learning gaps and intervene proactively.

**Owner:** Abhay Desai | **Version:** 1.0

## Features

### Student Module
- **Ask Doubts** — Text input with AI-powered step-by-step solutions
- **Multi-Model AI** — Automatically routes to the optimal AI model based on question complexity
- **Doubt History** — View all past doubts with filtering by subject and status
- **Follow-up Q&A** — Ask follow-up questions on any resolved doubt

### AI Engine
- **Complexity Classifier** — Automatically classifies questions as easy/medium/hard/expert
- **Topic Classifier** — Auto-tags subject, topic, and sub-topic
- **Model Router** — Selects the best AI model (Tier 1/2/3) based on question complexity
- **Fallback Logic** — Automatic escalation if a model fails or has low confidence

### Admin Dashboard
- **Overview Dashboard** — Total students, doubts, resolution rate, model usage
- **Student Analytics** — Per-student doubt history, subject distribution, topic breakdown
- **Class-Level Insights** — Subject heatmap, model performance, key metrics
- **Risk Detection** — Automatic flagging of at-risk students (high confusion, repeated topics, inactivity)

## AI Model Architecture

| Tier | Model | Usage | Purpose |
|------|-------|-------|---------|
| Tier 1 | GPT-4o Mini | 70–80% | Default model for easy/medium questions |
| Tier 2 | GPT-4.1 | 15–25% | Advanced reasoning for hard questions |
| Tier 3 | Claude Opus 4.6 | 2–5% | Premium deep reasoning for expert-level questions |

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** SQLite (Prisma ORM) — can be swapped to PostgreSQL
- **Authentication:** NextAuth.js (JWT strategy)
- **AI:** OpenAI SDK + Anthropic SDK
- **Styling:** Tailwind CSS 4
- **Charts/Analytics:** Custom components with Recharts
- **Icons:** Lucide React

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed the database with demo data
npx tsx prisma/seed.ts

# Start the development server
npm run dev
```

The app will be running at [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite database path (default: `file:./dev.db`) |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js session encryption |
| `NEXTAUTH_URL` | Base URL of the application |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o Mini and GPT-4.1 |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude Opus |

### Demo Credentials

All demo users share the password: `password123`

| Role | Email |
|------|-------|
| Admin | admin@aitutor.com |
| Educator | educator@aitutor.com |
| Mentor | mentor@aitutor.com |
| Student | aarav@student.com |
| Student | priya@student.com |

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── doubts/       # Doubt CRUD + follow-ups
│   │   └── admin/        # Analytics, students, risks
│   ├── admin/            # Admin dashboard pages
│   ├── student/          # Student pages
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   └── page.tsx          # Landing page
├── components/           # Shared React components
├── lib/
│   ├── ai/              # AI engine
│   │   ├── complexity-classifier.ts
│   │   ├── model-router.ts
│   │   ├── topic-classifier.ts
│   │   └── generate-response.ts
│   ├── auth.ts          # NextAuth configuration
│   └── prisma.ts        # Prisma client singleton
├── types/               # TypeScript type definitions
└── middleware.ts         # Route protection
prisma/
├── schema.prisma        # Database schema
├── seed.ts              # Database seed script
└── migrations/          # Migration history
```

## Data Model

### User
- StudentID, Name, Email, Role, Batch

### Doubt
- DoubtID, StudentID, Question, AIResponse, Subject, Topic, SubTopic
- DifficultyScore, ConfidenceScore, ComplexityLevel, ModelUsed, Status

### FollowUp
- FollowUpID, DoubtID, Question, Answer

## Success Metrics

- 70% AI resolution rate
- 30% reduction in repeated doubts
- 80% admin engagement with dashboard
- Student improvement rate tracking
