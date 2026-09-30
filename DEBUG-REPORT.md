# BRIGHT KOLORS V9 — Backend Debug & Security Review

## Stage 1 — Project structure

Checked the V8 project before changes. It contains the frontend, Node/Express backend, admin dashboard, JSON datastore, upload directory and service pages.

## Stage 2 — Authentication review

### Issues found
- Admin JWT was stored in `localStorage`, increasing exposure if an XSS bug reached the admin page.
- Default admin credentials and a weak default JWT secret existed in server code.
- Login had only the global API rate limit.

### Fixed
- Authentication moved to an HttpOnly SameSite cookie.
- JWT lifetime reduced to 30 minutes.
- Production startup now refuses missing/weak secrets.
- Login receives a dedicated strict rate limit.
- Logout clears the authentication cookie.

## Stage 3 — CSRF / request origin

### Issues found
- State-changing admin endpoints accepted bearer tokens without a CSRF mechanism.
- CORS was globally enabled.

### Fixed
- CSRF token required for POST/PATCH/DELETE admin mutations.
- Same-origin operation is the default.
- Optional `ALLOWED_ORIGINS` allow-list is enforced in production.

## Stage 4 — Input validation

### Issues found
- Most fields were truncated but not strongly validated.
- Quote service/status values were not allow-listed.

### Fixed
- Mobile and email validation.
- Service allow-list.
- Status allow-list.
- Quantity validation.
- Strict request body limits.
- Generic error responses.

## Stage 5 — File upload security

### Issues found
- Original filenames were used in generated upload paths.
- MIME type alone was trusted.

### Fixed
- Random UUID filenames.
- JPG/PNG/WEBP only.
- 5 MB limit.
- File-signature/magic-byte verification.
- Invalid files are removed.
- Uploaded files cannot choose executable filenames.

## Stage 6 — Admin XSS review

### Issues found
- Admin dashboard inserted quotation/location/project data into `innerHTML`.
- Inline event handlers and inline admin JavaScript weakened CSP.

### Fixed
- Admin dashboard moved to external `admin.js`.
- User-controlled values are rendered with DOM text nodes.
- No inline event handlers.
- CSP can therefore be stricter than before.

## Stage 7 — HTTP hardening

Added:
- Helmet.
- Content Security Policy.
- `X-Content-Type-Options` through Helmet.
- Referrer Policy.
- Frame-ancestor protection.
- Permissions Policy.
- `X-Powered-By` disabled.
- Request timeouts.

## Stage 8 — Data persistence

The project intentionally keeps the simple JSON datastore. Writes are serialized through an atomic temporary-file rename so simultaneous requests are less likely to corrupt the file.

For a larger business workload, move to PostgreSQL/MySQL rather than continuing to scale a JSON file.

## Stage 9 — Static verification

The following were checked in the build environment:

- Node syntax check for backend.
- Node syntax check for admin JavaScript.
- Node syntax checks for frontend JavaScript files.
- Security hardening checklist.

The build environment did **not** have the project's npm dependencies installed, and package installation timed out during this build session. Therefore a real runtime HTTP integration test and `npm audit` could not be completed here. The supplied project includes the commands to run those checks locally after `npm install`.

## Stage 10 — Local final checks

From `backend`:

```text
npm install
npm run check
npm audit
npm start
```

Then open:

```text
http://localhost:5000
http://localhost:5000/admin
```

The production deployment must use HTTPS and real secrets in `backend/.env`.
