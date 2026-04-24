# Invoice Manager (Local Full Stack)

This project is split into:

- `frontend` Vite app for the frontend
- `backend` Express API with MongoDB

## Prerequisites

- Node.js 18+
- MongoDB running locally

## Setup

1. Install frontend dependencies:
   - `npm --prefix frontend install`
2. Install backend dependencies:
   - `npm --prefix backend install`
3. Install root dependencies:
   - `npm install`

## Environment

Optional frontend env (`.env.local`):

```bash
VITE_API_BASE_URL=http://localhost:4000/api
```

Optional backend env (`backend/.env`):

```bash
PORT=4000
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=http://localhost:5173
```

Database name is set to `invoice-manager`.

## Run Locally

Run both frontend and backend together:

- `npm run dev:all`

Or run separately:

- Frontend: `npm run dev:frontend`
- Backend: `npm run dev:backend`

## Netlify Deployment

This repo includes `netlify.toml` and a function at `netlify/functions/api.ts`.

- Build output: `frontend/dist`
- API routing: `/api/*` -> `/.netlify/functions/api/:splat`

Set this environment variable in Netlify site settings:

- `MONGODB_URI=your_mongodb_connection_string`

You can optionally set `VITE_API_BASE_URL=/api` in Netlify, but the frontend already defaults to `/api`.

### Single-Repo Netlify Setup

- Base directory: repo root
- Build command: from `netlify.toml` (`npm --prefix frontend install && npm --prefix frontend run build`)
- Publish directory: `frontend/dist`
- Functions directory: `netlify/functions`

### Netlify Deploy Checklist

- Confirm site build settings are picked up from `netlify.toml`.
- Set `MONGODB_URI` in Netlify Environment Variables.
- Trigger a deploy and verify build logs show frontend build success.
- Open the deployed app and test login/register flow.
- Verify API endpoints by checking app actions that hit `/api/*` routes.

### Health Check

- Browser/API check: `GET /api/health` should return `{ "ok": true }`.
- Function route check: both redirected `/api/*` and Netlify function path should resolve through `netlify/functions/api.ts`.

## Authentication

- Users can register and login from the app.
- Data is isolated per account: each user only sees their own records.
- API uses the logged-in user id for scoped CRUD endpoints.
