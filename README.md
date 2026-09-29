# GemPrint

GemPrint is a low-cost gemstone provenance support platform. It uses visible microscopic inclusion patterns as optical identity cues for polished, inclusion-bearing rubies and blue sapphires. It supplements—not replaces—professional gemological assessment.

## Services

| Directory | Technology | Deployment |
| --- | --- | --- |
| `frontend` | React, Vite, TypeScript, Tailwind CSS | Vercel |
| `backend` | Node.js, Express, TypeScript | Render Web Service |
| `cv-service` | Python FastAPI, OpenCV, NumPy | Render Web Service |

The Node API is the only service the browser calls. It owns authentication, authorization, Supabase access, report records, storage, and CV-service orchestration. The CV service has a public Render URL on the chosen plan but accepts processing requests only with `X-Internal-Service-Key`; never expose that key in the frontend.

## Render configuration

| Service | Root directory | Build command | Start command |
| --- | --- | --- | --- |
| `gemprint-api` | `backend` | `npm ci && npm run build` | `npm run start` |
| `gemprint-cv-engine` | `cv-service` | `pip install -r requirements.txt` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

Initially, use `npm install && npm run build` in Render until `backend/package-lock.json` has been committed. Switch to `npm ci` afterward.

## Local development

```bash
cd backend && cp .env.example .env && npm install && npm run dev
cd cv-service && cp .env.example .env && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload
cd frontend && npm install && npm run dev
```

See each service's `.env.example` for required configuration. Use Python 3.10 or later for the CV service.
