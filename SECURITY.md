# BRIGHT KOLORS SIGNAGE STUDIO — Security Hardening

This project is hardened for a small business website and admin dashboard. It is **not guaranteed to be unhackable**. Security depends on the hosting server, domain/DNS, credentials, operating system, dependencies, backups and deployment configuration as well as this code.

## Included protections

- Helmet security headers and a Content Security Policy.
- `X-Powered-By` fingerprint reduction.
- HttpOnly, Secure-in-production, SameSite=Strict admin authentication cookie.
- Short-lived 30-minute admin JWTs.
- CSRF token protection for state-changing admin requests.
- Login, public quotation and admin-mutation rate limits.
- Strict JSON/urlencoded body limits.
- Same-origin API by default; production origin allow-list through `ALLOWED_ORIGINS`.
- Server-side validation of quotation fields and allowed services.
- Server-generated random upload filenames.
- JPG/PNG/WEBP allow-list, 5 MB upload limit and file-signature validation.
- Generic production error responses.
- Admin UI no longer stores authentication tokens in `localStorage`.
- Admin UI renders user-controlled values through DOM text nodes instead of `innerHTML`.
- Atomic queued JSON database writes.
- Request timeout limits.
- `robots` exclusion on the admin page.
- `security-check.mjs` for repeatable local hardening checks.

## Required production secrets

Create `backend/.env` and never commit it.

Generate a JWT secret with:

```text
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Use a unique admin username and a long unique password (14+ characters). `JWT_SECRET` must be at least 32 characters.

For production, set:

```text
NODE_ENV=production
ADMIN_USER=...
ADMIN_PASSWORD=...
JWT_SECRET=...
ALLOWED_ORIGINS=https://YOUR-DOMAIN
```

## Deployment requirements

1. Use HTTPS/TLS. A free Let's Encrypt certificate is sufficient for a normal site.
2. Keep the Node runtime and OS patched.
3. Run `npm audit` and `npm outdated` regularly after installing dependencies.
4. Keep `backend/.env`, `backend/data/db.json` and `backend/uploads/` out of Git.
5. Back up the JSON database and uploads separately from the web server.
6. Do not expose Node's development/watch mode in production.
7. Put a reverse proxy/CDN such as Cloudflare or Nginx in front of the application if desired.
8. Restrict server firewall ports to the minimum required. Normally only 80/443 should be public when a reverse proxy is used.

## What this does not solve automatically

- Compromised hosting accounts, GitHub accounts, domain registrar accounts or email accounts.
- Vulnerabilities introduced by future dependencies or custom code changes.
- Weak passwords chosen after deployment.
- Stolen administrator devices or browser sessions.
- DDoS capacity beyond the protection available from the chosen hosting/CDN.
- Business-logic abuse that requires a human review process.
