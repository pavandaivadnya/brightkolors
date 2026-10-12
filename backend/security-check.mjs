import fs from "fs";

import path from "path";

import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(here, "..");

const server = fs.readFileSync(path.join(here, "server.js"), "utf8");

const pkg = JSON.parse(fs.readFileSync(path.join(here, "package.json"), "utf8"));

const checks = [
["Express fingerprint disabled", server.includes('app.disable("x-powered-by")')],
["Helmet enabled", server.includes("app.use(helmet")],
["Admin authentication uses HttpOnly cookie", server.includes('res.cookie("bk_auth"') && server.includes("httpOnly: true")],
["CSRF protection enabled", server.includes("function csrf") && server.includes('x-csrf-token')],
["Login rate limiting", server.includes("loginLimiter")],
["Quotation rate limiting", server.includes("quoteLimiter")],
["Admin mutation rate limiting", server.includes("adminMutationLimiter")],
["Upload size limit", server.includes("fileSize: 5 * 1024 * 1024")],
["Upload magic-byte validation", server.includes("validateUploadedImage")],
["Random upload filenames", server.includes("crypto.randomUUID()")],
["Production config rejects weak secrets", server.includes("JWT_SECRET.length < 32")],
["Allowed service validation", server.includes("allowedServices.has(item.service)")],
["Generic production errors", server.includes('res.status(500).json({ message: "Server error." })')],
["No CORS wildcard package", !Object.hasOwn(pkg.dependencies, "cors")],
["Admin has no inline script", !fs.readFileSync(path.join(root, "admin", "index.html"), "utf8").includes("<script>")],
["Admin has no inline event handlers", !fs.readFileSync(path.join(root, "admin", "index.html"), "utf8").match(/\son\w+\s*=/i)],
["Frontend contact script externalized", fs.existsSync(path.join(root, "frontend", "js", "contact.js"))]
];

let failed = 0;

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${name}`), failed += ok ? 0 : 1;

console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);

process.exitCode = failed ? 1 : 0;
