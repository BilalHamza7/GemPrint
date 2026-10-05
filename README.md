# GemPrint

GemPrint is a low-cost gemstone provenance support platform. It uses visible microscopic inclusion patterns as optical identity cues for polished, inclusion-bearing rubies and blue sapphires. It supplements—not replaces—professional gemological assessment.

Low-cost gemstone provenance platform using microscopic inclusion fingerprints for tamper-evident sapphire and ruby verification.

## Services

| Directory | Technology | Deployment |
| --- | --- | --- |
| `frontend` | React, Vite, TypeScript, Tailwind CSS | Vercel |
| `backend` | Node.js, Express, TypeScript | Render Web Service |
| `cv-service` | Python FastAPI, OpenCV, NumPy | Render Web Service |

The Node API is the only service the browser calls. It owns authentication, authorization, Supabase access, report records, storage, and CV-service orchestration. The CV service has a public Render URL on the chosen plan but accepts processing requests only with `X-Internal-Service-Key`; never expose that key in the frontend.

## Production configuration

| Platform | Variables required | Notes |
| --- | --- | --- |
| Vercel (`gem-print`) | `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Set for the Production environment. The anonymous key is used only for browser authentication; do not add the service-role key here. |
| Render (`gemprint-api`) | `FRONTEND_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CV_SERVICE_URL`, `CV_INTERNAL_SERVICE_KEY` | `FRONTEND_URL` must be the exact Vercel production origin without a trailing slash. |
| Render (`gemprint-cv-service`) | `CV_INTERNAL_SERVICE_KEY` | Must exactly match the API value. The CV service must not receive Supabase credentials. |

Both Render services use the Free plan. They can spin down after inactivity and take 50 seconds or more to wake. This is expected behaviour on that plan, not a failed health check.

## Render configuration

| Service | Root directory | Build command | Start command |
| --- | --- | --- | --- |
| `gemprint-api` | `backend` | `npm ci && npm run build` | `npm run start` |
| `gemprint-cv-engine` | `cv-service` | `pip install -r requirements.txt` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

The Node lockfile is committed, so use `npm ci && npm run build` in Render. The repository's `render.yaml` records the intended service configuration for future reproducible setup.

## Local development

```bash
cd backend && cp .env.example .env && npm install && npm run dev
cd cv-service && cp .env.example .env && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload
cd frontend && npm install && npm run dev
```

See each service's `.env.example` for required configuration. Use Python 3.10 or later for the CV service.
