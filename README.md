# Viralstan Academy API

NestJS REST API foundation for the student application and future admin dashboard. Data is intentionally held in memory and is reset whenever the server restarts.

## Run locally

```bash
npm install
npm run start:dev
```

Set a strong `JWT_SECRET` in the environment outside local development. Every route is prefixed with `/api`.

## Deploy on Render

The repository includes a `render.yaml` Blueprint. If configuring an existing Render web service manually, set:

- Root Directory: `backend`
- Build Command: `npm ci && npm run build`
- Start Command: `npm run start:prod`

Set `MONGODB_URI` and `JWT_SECRET` in the service environment. The build must finish before the start command runs; it creates `backend/dist/main.js`, which `start:prod` executes. Render supplies `PORT` automatically.

## Authentication and roles

`POST /api/auth/register` creates a student account. `POST /api/auth/login` returns a bearer token. Public registration cannot select the `admin` role; create the first admin through a database seed or migration when persistence is introduced.

Protected requests use `Authorization: Bearer <accessToken>`. Course and lesson mutations and every `/api/admin/*` endpoint require an admin JWT.

## Persistence boundary

The services currently own in-memory collections. During database integration, replace those collections with repositories while retaining controller contracts, DTO validation, authorization guards, and service rules.
