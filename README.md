# BRIGHT KOLORS SIGNAGE STUDIO — Secure Full Project

Full frontend + Node/Express backend + admin dashboard.

## Local setup

Requirements: Node.js 20+ recommended.

1. Open this project in VS Code.
2. Open a terminal in `backend`.
3. Copy `.env.development.example` to `.env` for local testing, or create `.env` from `.env.example` for production.
4. Set a unique admin username/password and JWT secret.
5. Run:

```text
npm install
npm run check
npm audit
npm start
```

6. Open `http://localhost:5000`.
7. Admin: `http://localhost:5000/admin`.

## Production

Use HTTPS, `NODE_ENV=production`, real random secrets, a real `ALLOWED_ORIGINS` value, a patched Node runtime and a reverse proxy/CDN if appropriate.

Do not commit `backend/.env`, `backend/data/db.json`, uploads or `node_modules`.

## Security

See `SECURITY.md` for the hardening controls and deployment requirements.
See `DEBUG-REPORT.md` for the code review, fixes and test status.
