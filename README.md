# Mentoring Diaries

A modern AI-powered mentoring platform that helps students reflect on their academic journey while enabling mentors to monitor progress, identify risks, and provide timely guidance.

The platform combines structured student diaries, mentor workflows, analytics, real-time notifications, and Groq-powered AI features in a production-oriented full-stack architecture.

## Environment Variables

Create your environment file at `server/.env`.

Do not commit secrets to source control.

| Variable | Description |
| --- | --- |
| `PORT` | Backend server port. |
| `NODE_ENV` | Runtime mode (`development`, `test`, `production`). |
| `MONGO_URI` | MongoDB connection string. |
| `JWT_SECRET` | Access token signing secret. |
| `JWT_REFRESH_SECRET` | Refresh token signing secret. |
| `JWT_EXPIRES_IN` | Access token expiry duration (for example `15m`). |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry duration (for example `7d`). |
| `CLIENT_ORIGIN` | Allowed frontend origin(s) for CORS and Socket.IO. |
| `LOG_LEVEL` | Optional backend log verbosity (defaults to `info`). |
| `GROQ_API_KEY` | API key for Groq OpenAI-compatible inference. |
| `GROQ_BASE_URL` | Optional Groq-compatible base URL (defaults to `https://api.groq.com/openai/v1`). |
| `AI_MODEL` | Primary model selection variable for AI features. |
| `GROQ_MODEL` | Backward-compatible model variable (used if `AI_MODEL` is not set). |
| `AI_TIMEOUT_MS` | AI request timeout in milliseconds (default `5000`). |
| `OPENAI_API_KEY` | Legacy variable from earlier versions (not required in current Groq flow). |

## Groq Model Selection

Recommended default:

```env
AI_MODEL=llama-3.1-8b-instant
```

Why this model:
- Fast inference for interactive product workflows.
- Cost-efficient and friendly for free-tier/prototyping usage.
- Strong enough reasoning + summarization quality for diary analysis, mentor suggestions, and weekly insights.

You can swap models at runtime by changing `AI_MODEL` in `server/.env`.

## Project Overview

Mentoring Diaries is designed to support continuous student mentoring at scale:
- Students submit structured weekly reflections and portfolio updates.
- Mentors triage, review, and respond with actionable feedback.
- AI assists with analysis, risk spotting, and insight generation.
- Admin/mentor analytics surface trends and intervention opportunities.

## Features

### Platform Features
- Student reflection diary submission.
- Mentor review and response workflow.
- Mentoring session creation and tracking.
- Unified student activity timeline.
- Persistent notification center with unread management.
- Role-specific analytics dashboards.

### AI Features
- AI diary analysis (summary, sentiment, risk, key concerns).
- AI mentor response suggestions (optional and editable before send).
- Weekly student AI insights (sentiment/risk/engagement trends).
- AI-assisted risk detection and flagged-entry visibility.

### System Features
- Role-based access control (student, mentor, admin).
- Real-time notifications via Socket.IO.
- Secure JWT auth with httpOnly cookies.
- CI pipeline with tests and frontend build checks.
- AI caching and cost-protection controls.

## Tech Stack

### Frontend
- React
- Vite
- TailwindCSS
- Zustand
- React Query
- Framer Motion
- Chart.js

### Backend
- Node.js
- Express
- MongoDB
- Mongoose
- Socket.IO

### AI
- Groq API (OpenAI-compatible client)
- Llama 3.1 model family (`llama-3.1-8b-instant` recommended)

### Infrastructure
- JWT authentication (access + refresh cookies)
- CI pipeline (GitHub Actions)
- Request rate limiting
- Structured logging (`pino` + request ID middleware)

## Project Structure

```text
client/
  src/
    components/       # Reusable UI/layout/AI components
    pages/            # Role-based page views
    services/         # API and socket clients
    store/            # Zustand stores
    hooks/ utils/     # Frontend helpers

server/
  src/
    app.js            # Express app setup and middleware chain
    config/           # DB configuration
    controllers/      # Business logic
    middleware/       # Auth, validation, logging, guards
    models/           # Mongoose schemas
    routes/           # API route definitions
    services/         # AI and export services
    socket/           # Real-time notification/event layer
    utils/            # Shared backend utilities
  tests/              # Integration/security tests
```

## Installation

1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

2. Configure environment variables

Create `server/.env` (you can start from `server/.env.example`).

3. Start backend

```bash
cd server
npm run dev
```

4. Start frontend

```bash
cd client
npm run dev
```

## Running Tests

Backend tests:

```bash
cd server
npm test
```

CI note:
- GitHub Actions workflow (`.github/workflows/test.yml`) runs backend tests and frontend build on push and pull request.

## AI Architecture

### Diary Analysis Flow
1. Student submits diary entry (`POST /api/diary`).
2. `aiService` calls Groq with structured prompts.
3. AI returns summary, sentiment, risk, concerns, confidence, prompt version.
4. Results are stored in `DiaryEntry.aiAnalysis`.
5. Fallback logic is applied automatically on timeout/error.

### Mentor Suggestion Flow
1. Mentor opens entry review.
2. Mentor optionally requests AI response suggestion.
3. Suggestion is generated once and cached in `DiaryEntry.aiAnalysis.mentorSuggestion`.
4. Mentor can edit before sending final response.

### Weekly Insights Flow
1. Weekly insight endpoint analyzes recent entries.
2. Returns sentiment trend, engagement level, risk trend, insight paragraph.
3. Insight records are stored for history/trend tracking.
4. Daily generation limit and cache reduce AI cost.

### AI Reliability + Cost Controls
- Timeout protection (`AI_TIMEOUT_MS`, default 5s).
- Structured JSON parsing and defensive normalization.
- Cached mentor suggestions (max one generation per entry).
- Daily insight generation cap per user.

## API Overview

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Diary
- `POST /api/diary`
- `GET /api/diary`
- `GET /api/diary/:id`
- `PATCH /api/diary/:id/response`
- `GET /api/diary/:id/mentor-suggestion`
- `GET /api/diary/flagged`
- `GET /api/diary/priority-queue`

### Student
- `GET /api/student/all-entries`
- `GET /api/student/timeline`

### Analytics
- `GET /api/analytics/student-overview`
- `GET /api/analytics/student-growth`
- `GET /api/analytics/student-weekly-insights`
- `GET /api/analytics/student-weekly-insights/history`

### Sessions
- `POST /api/sessions`
- `PATCH /api/sessions/:id`
- `GET /api/sessions`

### Notifications
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

## Security Features

- JWT authentication with httpOnly cookie storage.
- Role-based access control middleware.
- Global + auth-specific rate limiting.
- Input validation using `express-validator`.
- Input sanitization (`xss-clean`, `express-mongo-sanitize`).
- Query guard against unsafe query patterns.
- File upload type/size validation via Multer.
- Request ID and request logging for traceability.
- Centralized error handling.

## Future Roadmap (Phase 4)

- Full UI/UX redesign for student, mentor, and admin surfaces.
- Rich animated interactions and micro-transitions.
- More interactive timeline views and filters.
- Advanced visual analytics upgrades and deeper trend exploration.

---

If you are preparing a production deployment, rotate all secrets, lock CORS origins, and configure secure cookies with HTTPS.

