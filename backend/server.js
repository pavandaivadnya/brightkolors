import express from "express";

import helmet from "helmet";

import rateLimit from "express-rate-limit";

import multer from "multer";

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import nodemailer from "nodemailer";

import dotenv from "dotenv";

import path from "path";

import fs from "fs";

import crypto from "crypto";

import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.resolve(__dirname, "..");

const PORT = Number(process.env.PORT || 5000);

const NODE_ENV = process.env.NODE_ENV || "development";

const IS_PROD = NODE_ENV === "production";

const app = express();

const uploadDir = path.join(__dirname, "uploads");

const dataDir = path.join(__dirname, "data");

const dataFile = path.join(dataDir, "db.json");

fs.mkdirSync(uploadDir, { recursive: true });

fs.mkdirSync(dataDir, { recursive: true });

function failStartup(message) {
console.error(`\nSECURITY CONFIGURATION ERROR: ${message}\n`);

process.exit(1);

}

const adminUser = process.env.ADMIN_USER?.trim();

const adminPassword = process.env.ADMIN_PASSWORD || "";

const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || "";

const JWT_SECRET = process.env.JWT_SECRET || "";

if (!adminUser) failStartup("ADMIN_USER is required in backend/.env");

if (adminPasswordHash) {
if (!adminPasswordHash.startsWith("$2")) failStartup("ADMIN_PASSWORD_HASH must be a bcrypt hash");

} else if (adminPassword.length < 14) {
failStartup("Set ADMIN_PASSWORD to at least 14 characters, or provide ADMIN_PASSWORD_HASH");

}
if (JWT_SECRET.length < 32) failStartup("JWT_SECRET must be at least 32 characters");

const initialDb = {
quotes: [],
locations: [],
projects: [],
counters: { quotes: 0, locations: 0, projects: 0 }
};

function loadDb() {
try {
if (!fs.existsSync(dataFile)) return structuredClone(initialDb);

const parsed = JSON.parse(fs.readFileSync(dataFile, "utf8"));

return {
...structuredClone(initialDb),
...parsed,
counters: { ...initialDb.counters, ...(parsed.counters || {}) }
};

} catch (error) {
console.error("Database read error:", error.message);

return structuredClone(initialDb);

}
}

let db = loadDb();

let saveQueue = Promise.resolve();

function saveDb() {
const snapshot = JSON.stringify(db, null, 2);

saveQueue = saveQueue.then(async () => {
const tmp = `${dataFile}.${process.pid}.${Date.now()}.tmp`;
await fs.promises.writeFile(tmp, snapshot, "utf8");
await fs.promises.rename(tmp, dataFile);
}).catch((error) => console.error("Database write error:", error.message));

return saveQueue;

}

function nextId(type) {
db.counters[type] = Number(db.counters[type] || 0) + 1;

return db.counters[type];

}

function clean(value, max = 5000) {
return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);

}

function isEmail(value) {
return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

}

function isMobile(value) {
return /^\+?[0-9 ()-]{7,20}$/.test(value);

}

const allowedServices = new Set([
"ACP 3D & 2D Boards",
"LED Letters",
"In-Shop Branding",
"Reflective Sign Boards",
"Corporate Sign Boards",
"Name Plates"
]);

const allowedQuoteStatuses = new Set([
"New", "Contacted", "Site Visit", "Quotation Sent", "Approved", "Completed"
]);

const cookieOptions = {
httpOnly: true,
secure: IS_PROD,
sameSite: "strict",
path: "/",
maxAge: 30 * 60 * 1000
};

function signAdminToken(username) {
return jwt.sign({ sub: username, role: "admin" }, JWT_SECRET, { expiresIn: "30m", issuer: "bright-kolors", audience: "admin" });

}

function csrfToken() {
return crypto.randomBytes(32).toString("base64url");

}

function setAuthCookie(res, token) {
res.cookie("bk_auth", token, cookieOptions);

}

function clearAuthCookie(res) {
res.clearCookie("bk_auth", { httpOnly: true, secure: IS_PROD, sameSite: "strict", path: "/" });

}

function auth(req, res, next) {
try {
const token = req.cookies?.bk_auth;

if (!token) return res.status(401).json({ message: "Unauthorized" });

const payload = jwt.verify(token, JWT_SECRET, { issuer: "bright-kolors", audience: "admin" });

if (payload.role !== "admin") return res.status(403).json({ message: "Forbidden" });

req.admin = payload;

next();

} catch {
return res.status(401).json({ message: "Unauthorized" });

}
}

function csrf(req, res, next) {
const safe = ["GET", "HEAD", "OPTIONS"].includes(req.method);

if (safe) return next();

const cookie = req.cookies?.bk_csrf;

const header = req.get("x-csrf-token");

if (!cookie || !header || cookie.length < 32 || !crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) {
return res.status(403).json({ message: "CSRF validation failed" });

}
next();

}

function requireAllowedOrigin(req, res, next) {
const origin = req.get("origin");

if (!origin) return next();

const configured = (process.env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);

if (configured.length && !configured.includes(origin)) return res.status(403).json({ message: "Origin not allowed" });

if (!configured.length && IS_PROD) return res.status(403).json({ message: "Origin not configured" });

next();

}

// Secure defaults and headers. CSP permits only the CDNs already used by the site.
app.disable("x-powered-by");

app.set("trust proxy", IS_PROD ? 1 : false);

app.use(helmet({
contentSecurityPolicy: {
directives: {
defaultSrc: ["'self'"],
baseUri: ["'self'"],
objectSrc: ["'none'"],
frameAncestors: ["'none'"],
formAction: ["'self'"],
scriptSrc: ["'self'", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
imgSrc: ["'self'", "data:", "blob:", "https:"],
connectSrc: [
  "'self'",
  "https://brightkolors.onrender.com",
  "https://brightkolors.shop"
],
upgradeInsecureRequests: IS_PROD ? [] : null
}
},
referrerPolicy: { policy: "strict-origin-when-cross-origin" },
crossOriginEmbedderPolicy: false,
crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use((_req, res, next) => {
res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
next();
});

app.use(express.json({ limit: "32kb", strict: true }));

app.use(express.urlencoded({ extended: false, limit: "32kb", parameterLimit: 50 }));

// Cookie parser without another dependency: only parse the two cookies this app owns.
app.use((req, _res, next) => {
const raw = req.headers.cookie || "";
req.cookies = Object.fromEntries(raw.split(";").map(v => v.trim().split("=")).filter(p => p.length === 2).map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]));
next();
});

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false, message: { message: "Too many requests. Please try again later." } });

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false, skipSuccessfulRequests: true, message: { message: "Too many login attempts. Please try again later." } });

const quoteLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, message: { message: "Too many quotation requests. Please try again later." } });

const adminMutationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false, message: { message: "Too many admin changes. Please try again later." } });

/* CORS: allow only explicitly configured website origins. */
app.use((req, res, next) => {
  const origin = req.get("Origin");

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

  if (origin) {
    if (
      (allowedOrigins.length && !allowedOrigins.includes(origin)) ||
      (!allowedOrigins.length && IS_PROD)
    ) {
      return res.status(403).json({
        message: "Origin not allowed"
      });
    }

    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, DELETE, OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-CSRF-Token"
      );
      res.setHeader("Access-Control-Max-Age", "600");
    }
  }

  // Answer browser preflight requests before API rate limiting.
  if (req.method === "OPTIONS" && req.path.startsWith("/api/")) {
    return res.sendStatus(204);
  }

  next();
});

app.use("/api", apiLimiter, requireAllowedOrigin);

// Uploads are generated by the server and are never allowed to choose their own filenames.
const upload = multer({
storage: multer.diskStorage({
destination: uploadDir,
filename: (_req, file, cb) => {
const ext = path.extname(file.originalname).toLowerCase();
cb(null, `${crypto.randomUUID()}${ext}`);
}
}),
limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 30, fieldSize: 32 * 1024 },
fileFilter: (_req, file, cb) => cb(null, /^(image\/jpeg|image\/png|image\/webp)$/.test(file.mimetype))
});

async function validateUploadedImage(file) {
if (!file) return true;

const ext = path.extname(file.filename).toLowerCase();

const bytes = await fs.promises.readFile(file.path);

const jpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

const png = bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));

const webp = bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";

const valid = (ext === ".jpg" || ext === ".jpeg") ? jpeg : ext === ".png" ? png : ext === ".webp" ? webp : false;

if (!valid) {
await fs.promises.unlink(file.path).catch(() => {});

return false;

}
return true;

}

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "BRIGHT KOLORS backend", environment: NODE_ENV, security: "hardened" }));

app.get("/api/auth/csrf", (req, res) => {
const token = csrfToken();
res.cookie("bk_csrf", token, { httpOnly: false, secure: IS_PROD, sameSite: "strict", path: "/", maxAge: 30 * 60 * 1000 });
res.json({ csrfToken: token });
});

app.post("/api/auth/login", loginLimiter, async (req, res) => {
const username = clean(req.body.username, 100);
const password = String(req.body.password || "");
const hash = adminPasswordHash || await bcrypt.hash(adminPassword, 12);
const valid = username === adminUser && await bcrypt.compare(password, hash);
if (!valid) return res.status(401).json({ message: "Invalid login" });
const token = signAdminToken(username);
setAuthCookie(res, token);
const csrf = csrfToken();
res.cookie("bk_csrf", csrf, { httpOnly: false, secure: IS_PROD, sameSite: "strict", path: "/", maxAge: 30 * 60 * 1000 });
res.json({ success: true, csrfToken: csrf });
});

app.post("/api/auth/logout", auth, csrf, (req, res) => {
clearAuthCookie(res);
res.clearCookie("bk_csrf", { secure: IS_PROD, sameSite: "strict", path: "/" });
res.json({ success: true });
});

app.post("/api/quotes", quoteLimiter, upload.single("reference"), async (req, res) => {
try {
if (!(await validateUploadedImage(req.file))) return res.status(400).json({ message: "Only valid JPG, PNG or WEBP images are allowed." });
const b = req.body;
const item = {
id: nextId("quotes"),
name: clean(b.name, 120), mobile: clean(b.mobile, 40), email: clean(b.email, 160),
company: clean(b.company, 160), location: clean(b.location, 200), service: clean(b.service, 120),
projectType: clean(b.projectType, 120), width: clean(b.width, 60), height: clean(b.height, 60),
quantity: clean(b.quantity, 60), message: clean(b.message, 5000), reference: req.file?.filename || "",
status: "New", createdAt: new Date().toISOString()
};
if (!item.name || !item.mobile || !item.service) { if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {}); return res.status(400).json({ message: "Name, mobile and service are required" }); }
if (!isMobile(item.mobile)) { if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {}); return res.status(400).json({ message: "Please enter a valid mobile number." }); }
if (!isEmail(item.email)) { if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {}); return res.status(400).json({ message: "Please enter a valid email address." }); }
if (!allowedServices.has(item.service)) { if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {}); return res.status(400).json({ message: "Invalid service selected." }); }
if (item.quantity && !/^\d{1,5}$/.test(item.quantity)) { if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {}); return res.status(400).json({ message: "Invalid quantity." }); }
db.quotes.unshift(item);
await saveDb();
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
try {
const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: Number(process.env.SMTP_PORT) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
await t.sendMail({ from: process.env.SMTP_USER, to: process.env.NOTIFY_EMAIL || process.env.SMTP_USER, subject: `New quotation #${item.id} — ${item.service}`, text: `${item.name} | ${item.mobile} | ${item.email}\nLocation: ${item.location}\n${item.message}` });
} catch (error) { console.error("Email notification failed:", error.message); }
}
res.status(201).json({ success: true, id: item.id });
} catch (error) {
if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
res.status(400).json({ message: "Invalid quotation request." });
}
});

app.get("/api/quotes", auth, (req, res) => res.json(db.quotes));

app.patch("/api/quotes/:id", auth, adminMutationLimiter, csrf, async (req, res) => {
const id = Number(req.params.id);
const status = clean(req.body.status, 80);
if (!Number.isSafeInteger(id) || !allowedQuoteStatuses.has(status)) return res.status(400).json({ message: "Invalid request." });
const item = db.quotes.find(q => q.id === id);
if (!item) return res.status(404).json({ message: "Not found" });
item.status = status;
await saveDb();
res.json({ success: true });
});

app.delete("/api/quotes/:id", auth, adminMutationLimiter, csrf, async (req, res) => {
const id = Number(req.params.id);
if (!Number.isSafeInteger(id)) return res.status(400).json({ message: "Invalid request." });
db.quotes = db.quotes.filter(q => q.id !== id);
await saveDb();
res.json({ success: true });
});

app.get("/api/locations", (_req, res) => res.json(db.locations));

app.post("/api/locations", auth, adminMutationLimiter, csrf, async (req, res) => {
const x = { id: nextId("locations"), name: clean(req.body.name, 160), address: clean(req.body.address, 300), description: clean(req.body.description, 1000), createdAt: new Date().toISOString() };
if (!x.name) return res.status(400).json({ message: "Location name is required" });
db.locations.push(x); await saveDb(); res.status(201).json(x);
});

app.delete("/api/locations/:id", auth, adminMutationLimiter, csrf, async (req, res) => {
const id = Number(req.params.id); if (!Number.isSafeInteger(id)) return res.status(400).json({ message: "Invalid request." });
db.locations = db.locations.filter(x => x.id !== id); await saveDb(); res.json({ success: true });
});

app.get("/api/projects", (_req, res) => res.json(db.projects));

app.post("/api/projects", auth, adminMutationLimiter, upload.single("image"), async (req, res) => {
try {
if (!(await validateUploadedImage(req.file))) return res.status(400).json({ message: "Only valid JPG, PNG or WEBP images are allowed." });
const x = { id: nextId("projects"), title: clean(req.body.title, 180), category: clean(req.body.category, 120), location: clean(req.body.location, 200), description: clean(req.body.description, 2000), interiorExterior: clean(req.body.interiorExterior, 80), image: req.file?.filename || "", createdAt: new Date().toISOString() };
if (!x.title) { if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {}); return res.status(400).json({ message: "Project title is required" }); }
db.projects.unshift(x); await saveDb(); res.status(201).json(x);
} catch {
if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
res.status(400).json({ message: "Invalid project request." });
}
});

app.delete("/api/projects/:id", auth, adminMutationLimiter, csrf, async (req, res) => {
const id = Number(req.params.id); if (!Number.isSafeInteger(id)) return res.status(400).json({ message: "Invalid request." });
const x = db.projects.find(p => p.id === id);
if (x?.image) await fs.promises.unlink(path.join(uploadDir, path.basename(x.image))).catch(() => {});
db.projects = db.projects.filter(p => p.id !== id); await saveDb(); res.json({ success: true });
});

app.use("/uploads", express.static(uploadDir, { index: false, fallthrough: false, dotfiles: "deny", maxAge: IS_PROD ? "7d" : 0 }));

app.use("/admin", express.static(path.join(ROOT, "admin"), { index: "index.html", dotfiles: "deny" }));

app.use(express.static(path.join(ROOT, "frontend"), { dotfiles: "deny", index: "index.html" }));

app.get("/admin", (req, res) => res.sendFile(path.join(ROOT, "admin", "index.html")));

app.get("*", (req, res) => { if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) return res.status(404).end(); res.sendFile(path.join(ROOT, "frontend", "index.html")); });

app.use((err, req, res, next) => {
console.error("Unhandled request error:", err.message);
if (err instanceof multer.MulterError) return res.status(400).json({ message: "Upload rejected. Check the file type and 5 MB size limit." });
res.status(500).json({ message: "Server error." });
});

const server = app.listen(PORT, () => console.log(`BRIGHT KOLORS backend running at http://localhost:${PORT}`));

server.requestTimeout = 15_000;

server.headersTimeout = 20_000;

server.keepAliveTimeout = 5_000;
