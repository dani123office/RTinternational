# RT International — Call Center CRM & AI Utility Brokerage Platform

A full-stack call center CRM and utility brokerage portal built for UK commercial energy brokers. Features AI-powered extraction of meter/rate data from unstructured call notes, pipeline management (Customer → Callback → Transfer → Sale), role-based access (Agent/Manager/Admin), attendance tracking, leave management, and salary slip generation.

## Tech Stack

**Frontend:** React 19, Vite, Tailwind CSS v4, Radix UI, Zustand, React Router v7, Recharts, Zod

**Backend:** FastAPI, SQLAlchemy, JWT auth (bcrypt), pg8000, Cohere/Groq AI, SQLite/PostgreSQL

**Deployment:** Vercel (unified frontend + API on same domain)

## Features

- AI extraction from broker call notes (Groq API + regex fallback)
- Customer management with electricity/gas meter details
- Callback scheduling with offered commission/non-commission rates
- Transfer management (current → proposed supplier)
- Sales submission with banking details and COT tracking
- Role-based dashboards (Agent, Manager, Admin)
- Manager team analytics, leaderboards, and notifications
- Admin audit logs, user management, salary slip PDF generation
- Attendance check-in/check-out (PKT timezone, late detection)
- Leave request and approval workflow
- SQL injection protection middleware
- Rate limiting middleware
- JWT access + refresh token auth

## Quick Start

```bash
# Backend
cd CallCenterAPI_FastAPI
pip install -r requirements.txt
python -m uvicorn main:app --reload

# Frontend
cd frontend
npm install --legacy-peer-deps
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | No* | PostgreSQL URL (defaults to SQLite locally) |
| `GROQ_API_KEY` | No | Groq API key for AI extraction (falls back to regex) |
| `RT_JWT_SECRET` | No | JWT signing secret (auto-generated default) |

*No env vars needed for local development with SQLite.

## Deployment

Push to GitHub → Vercel auto-deploys. See `VERCEL_DEPLOYMENT.md`.
