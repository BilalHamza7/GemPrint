# GemPrint

GemPrint is a laboratory-facing gemstone provenance support platform for polished, inclusion-bearing rubies and blue sapphires. It records report data and microscopic capture context, extracts a repeatable optical fingerprint from a framed microscopic image, and compares later images against that enrolled reference.

It is a decision-support tool: a verification result is evidence from the captured imagery, not a replacement for a qualified gemologist's identification, origin opinion, treatment assessment, or valuation.

## What it does

- Registers laboratory accounts and issues eight-hour, signed API sessions.
- Creates private gemstone reports with physical characteristics and capture metadata.
- Stores macro and microscopic reference images in a private Supabase Storage bucket.
- Standardizes the selected microscopic region to a fixed 4:3 ROI, then uses CLAHE, SIFT, FLANN, and RANSAC to create and compare fingerprints.
- Records verified, not-verified, and inconclusive comparison attempts for auditability.
- Generates a signed, time-limited link to an identification-report PDF.
- Archives and restores reports without deleting their data.

## Architecture

```text
React + Vite browser
        |
        | HTTPS / JSON and multipart image uploads
        v
Express API ------------------> Supabase Postgres + private Storage
        |
        | X-Internal-Service-Key (server to server only)
        v
FastAPI / OpenCV CV engine
```

The browser only communicates with the Express API. Supabase service-role credentials and `CV_INTERNAL_SERVICE_KEY` must remain server-side. The API enforces report ownership before issuing media or document URLs and before calling the CV engine.

## Repository layout

| Path | Purpose |
| --- | --- |
| `frontend/` | React 19 + Vite + TypeScript application. |
| `backend/` | Express 5 API, authentication, report/media/document handling, and CV orchestration. |
| `cv-service/` | FastAPI and OpenCV fingerprint extraction and comparison service. |
| `supabase/migrations/` | Foundational database, RLS, and storage-bucket migration. |
| `supabase/schema-patches/` | Ordered follow-up schema changes for report lifecycle, direct authentication, fingerprint metadata, and capture metadata. |
| `cv-service/evaluation/` | Reproducible offline evaluation runner and dataset instructions. |
| `render.yaml` | Render Blueprint for the API and CV service. |

## Prerequisites

- Node.js **22.16.0** (the version pinned by both JavaScript services)
- npm 10 or later
- Python **3.10+** (Python 3.11 is used by the Render blueprint)
- A Supabase project with access to the SQL Editor

For deployment, create a Vercel project for `frontend/` and two Render web services (or use the included Render Blueprint).

## Local installation

Clone the repository, then install each service independently:

```bash
git clone https://github.com/BilalHamza7/GemPrint.git
cd GemPrint

cd backend
cp .env.example .env
npm ci

cd ../frontend
cp .env.example .env
npm ci

cd ../cv-service
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

`npm ci` is preferred for a clean, repeatable installation because both JavaScript services commit lockfiles. Never commit the resulting `.env` files or the Python `.venv` directory.

### Configure environment files

Copying the templates above creates three local files. Populate them as follows:

| File | Required values |
| --- | --- |
| `backend/.env` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, and a shared `CV_INTERNAL_SERVICE_KEY`. |
| `cv-service/.env` | The same `CV_INTERNAL_SERVICE_KEY` used by the backend. |
| `frontend/.env` | `VITE_API_URL`, normally `http://localhost:4000`. |

Generate secrets locally with Node:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use a different generated value for `JWT_SECRET` and `CV_INTERNAL_SERVICE_KEY`. The internal service key must match exactly in `backend/.env` and `cv-service/.env`.

`SUPABASE_URL` must be the project base URL, such as `https://your-project-ref.supabase.co`, not its `/rest/v1` endpoint. `SUPABASE_SERVICE_ROLE_KEY` is privileged: keep it only in the backend environment and deployment secret store. It never belongs in the browser.

### Initialize Supabase

In the Supabase SQL Editor, execute these files in order:

1. `supabase/migrations/0001_foundation.sql`
2. `supabase/schema-patches/0002_report_archiving.sql`
3. `supabase/schema-patches/0003_direct_laboratory_auth.sql`
4. `supabase/schema-patches/0004_finalize_direct_backend_data_model.sql`
5. `supabase/schema-patches/0005_micro_image_capture_metadata.sql`

This creates the `profiles`, `gemstone_reports`, `fingerprint_data`, and `verification_logs` tables plus the private `gem_print_media` storage bucket. The final data model uses GemPrint-managed bcrypt credentials in `profiles`; it does not use Supabase Auth for browser authentication. Row-level security remains enabled so direct browser access is denied, while the backend's service-role client performs application data access.

### Start the stack

Run each command in a separate terminal. Activate the Python environment before starting the CV service.

```bash
# Terminal 1 — CV engine (http://localhost:8000)
cd cv-service
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — API (http://localhost:4000)
cd backend
npm run dev

# Terminal 3 — web app (usually http://localhost:5173)
cd frontend
npm run dev
```

Confirm the services are reachable:

```bash
curl http://localhost:4000/health
curl http://localhost:8000/health
```

Open the Vite URL shown in the final terminal, register a laboratory account, create a report, upload its reference images, and enroll its microscopic fingerprint before attempting verification.

## Environment reference

### Backend (`backend/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | No | `development` locally; set to `production` when deployed. |
| `PORT` | No | API port; defaults to `4000`. Render supplies this automatically. |
| `FRONTEND_URL` | Yes in production | Exact permitted web-app origin, without a trailing slash. |
| `ADDITIONAL_ALLOWED_ORIGINS` | No | Comma-separated additional trusted origins, useful for a second local Vite port. |
| `SUPABASE_URL` | Yes | Supabase project base URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only Supabase credential. |
| `CV_SERVICE_URL` | Yes in production | Base URL of the CV engine; defaults to `http://localhost:8000`. |
| `CV_INTERNAL_SERVICE_KEY` | Yes | Shared secret used for API-to-CV requests. |
| `JWT_SECRET` | Yes | Secret used to sign and verify GemPrint API sessions. |

### CV service (`cv-service/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `CV_INTERNAL_SERVICE_KEY` | Yes | Must exactly equal the backend value. Requests without it are rejected. |

### Frontend (`frontend/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Yes | Public base URL of the Express API. Values prefixed with `VITE_` are embedded in the browser build, so never put secrets here. |

## Verification pipeline

The CV engine accepts only server-to-server calls carrying `X-Internal-Service-Key`. For a registered microscopic reference, it:

1. Validates the browser-confirmed microscopic frame and resizes the selected region to a 1280 × 960 ROI.
2. Converts to grayscale and applies CLAHE normalization.
3. Extracts up to 1,500 SIFT keypoints and descriptors.
4. Uses FLANN candidate matching and RANSAC homography filtering during verification.
5. Marks a pair `verified` only when it has at least 10 inliers and an inlier ratio of at least 0.50; returns `not_verified` or `inconclusive` otherwise.

Images are limited to 8 MB by the CV engine and processing is bounded to a maximum source dimension of 2,048 pixels. An optional visual match proof is returned only for accepted matches; the absence of a proof does not turn a valid negative result into a service error.

## API overview

All `/api/reports` endpoints require `Authorization: Bearer <token>`, obtained from registration or login. Images are uploaded as multipart form data using the field name `image`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create a laboratory account and return a session. |
| `POST` | `/api/auth/login` | Return a session for existing credentials. |
| `GET` | `/api/auth/me` | Return the authenticated account. |
| `GET` | `/api/reports` | List the current user's reports. |
| `POST` | `/api/reports` | Create a report. |
| `GET` / `PATCH` | `/api/reports/:id` | Retrieve or update a report. |
| `POST` | `/api/reports/:id/media/:kind` | Upload `macro` or `inclusion` image media. |
| `GET` / `DELETE` | `/api/reports/:id/media/:kind` | Obtain a signed image URL or remove that image. |
| `POST` | `/api/reports/:id/fingerprint` | Extract and save the reference fingerprint. |
| `POST` | `/api/reports/:id/verifications` | Verify an uploaded microscopic query image. |
| `POST` | `/api/reports/:id/documents/identification-report` | Create an identification-report PDF. |
| `GET` | `/api/reports/:id/documents/identification-report` | Obtain a signed PDF URL. |
| `POST` | `/api/reports/:id/archive` or `/restore` | Archive or restore a report. |

Public health endpoints are `GET /health` on both the API and CV service. The CV engine intentionally does not expose interactive OpenAPI documentation.

## Quality checks

Run the applicable checks before committing:

```bash
cd backend
npm run format:check
npm run build
npm test

cd ../frontend
npm run format:check
npm run build
```

To run the offline CV evaluation, follow the dataset layout and commands in [`cv-service/evaluation/README.md`](cv-service/evaluation/README.md). The runner evaluates 30 genuine and 870 impostor comparisons and writes timing, threshold, FAR/FRR, and summary outputs.

## Deployment

### Render

The checked-in [`render.yaml`](render.yaml) defines two services:

| Service | Root directory | Build | Start |
| --- | --- | --- | --- |
| `gemprint-api` | `backend` | `npm ci && npm run build` | `npm run start` |
| `gemprint-cv-engine` | `cv-service` | `pip install -r requirements.txt` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

Set the backend's `FRONTEND_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CV_SERVICE_URL`, `CV_INTERNAL_SERVICE_KEY`, and `JWT_SECRET` in Render. Set the CV service's matching `CV_INTERNAL_SERVICE_KEY`. Add `ADDITIONAL_ALLOWED_ORIGINS` only for explicitly trusted additional origins.

### Vercel

Deploy `frontend/` as the project root and set `VITE_API_URL` to the deployed API URL. It is a browser-visible setting, so do not add Supabase keys, JWT secrets, or the CV internal key to Vercel.

After deployment, check the frontend plus both health endpoints. Free Render services may take 50 seconds or more to wake after inactivity; retry once after the cold start before treating a health check as failed.

## Security notes

- Keep `.env` files, the Supabase service-role key, JWT secret, and CV internal key out of Git and browser builds.
- Use a distinct high-entropy secret for each environment, and rotate a shared CV key in both services together.
- Keep the Supabase media bucket private. The API generates short-lived signed URLs only after an ownership check.
- Restrict `FRONTEND_URL` and `ADDITIONAL_ALLOWED_ORIGINS` to known origins; do not use a wildcard CORS policy.

## License

No license is currently declared. Do not assume permission to redistribute or reuse this project without the repository owner's approval.
