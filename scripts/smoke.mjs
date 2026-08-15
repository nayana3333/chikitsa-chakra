import "dotenv/config";
import { SignJWT } from "jose";
import pg from "pg";

const BASE = "http://localhost:3100";
const key = new TextEncoder().encode(process.env.SESSION_SECRET);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const emails = [
  ["patient@chikitsa.dev", "/patient"],
  ["doctor@chikitsa.dev", "/doctor"],
  ["therapist@chikitsa.dev", "/therapist"],
  ["admin@chikitsa.dev", "/admin"],
];

let failures = 0;

for (const [email, path] of emails) {
  const { rows } = await client.query(
    'select id, role from "User" where email = $1',
    [email],
  );
  if (!rows.length) {
    console.log(`✗ ${email}: no such user`);
    failures++;
    continue;
  }

  const { id, role } = rows[0];
  const token = await new SignJWT({
    userId: id,
    role,
    expiresAt: Date.now() + 7 * 864e5,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);

  const res = await fetch(BASE + path, {
    headers: { cookie: `chikitsa_session=${token}` },
    redirect: "manual",
  });
  const html = await res.text();

  const ok = res.status === 200;
  const hasShell = html.includes("workspace");

  // The rendered <h1> is the reliable signal. Searching the whole document for
  // error text gives false positives: Next serialises the not-found and
  // forbidden boundary components into every page's RSC payload, so their
  // copy is present in the HTML of a perfectly healthy page.
  const sample =
    html.match(/<h1[^>]*>([^<]{3,60})</)?.[1]?.trim() ?? "(no h1)";
  const errored =
    /Something went wrong|This page doesn/.test(sample) ||
    html.includes("PrismaClientKnownRequestError");

  const verdict = ok && hasShell && !errored ? "✓" : "✗";
  if (verdict === "✗") failures++;
  console.log(
    `${verdict} ${path.padEnd(11)} ${res.status}  h1="${sample}"  shell=${hasShell} error=${errored}`,
  );
}

// Cross-role check: a patient must not reach the admin area.
const { rows: p } = await client.query(
  `select id, role from "User" where email = 'patient@chikitsa.dev'`,
);
const patientToken = await new SignJWT({
  userId: p[0].id,
  role: p[0].role,
  expiresAt: Date.now() + 7 * 864e5,
})
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("7d")
  .sign(key);

const cross = await fetch(BASE + "/admin", {
  headers: { cookie: `chikitsa_session=${patientToken}` },
  redirect: "manual",
});
const blocked = cross.status === 307 || cross.status === 302 || cross.status === 403;
console.log(
  `${blocked ? "✓" : "✗"} RBAC: patient → /admin blocked (status ${cross.status}${
    cross.headers.get("location") ? ` → ${cross.headers.get("location")}` : ""
  })`,
);
if (!blocked) failures++;

// Unauthenticated access must be redirected to login.
const anon = await fetch(BASE + "/patient", { redirect: "manual" });
const anonBlocked = anon.status === 307 || anon.status === 302;
console.log(
  `${anonBlocked ? "✓" : "✗"} Anonymous → /patient redirected (status ${anon.status})`,
);
if (!anonBlocked) failures++;

// A tampered cookie must not authenticate.
const forged = await fetch(BASE + "/admin", {
  headers: { cookie: "chikitsa_session=not.a.real.token" },
  redirect: "manual",
});
const forgedBlocked = forged.status === 307 || forged.status === 302;
console.log(
  `${forgedBlocked ? "✓" : "✗"} Forged cookie rejected (status ${forged.status})`,
);
if (!forgedBlocked) failures++;

// ── Sub-pages ────────────────────────────────────────────────
async function tokenFor(email) {
  const { rows } = await client.query(
    'select id, role from "User" where email = $1',
    [email],
  );
  return new SignJWT({
    userId: rows[0].id,
    role: rows[0].role,
    expiresAt: Date.now() + 7 * 864e5,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

const patientJwt = await tokenFor("patient@chikitsa.dev");
const doctorJwt = await tokenFor("doctor@chikitsa.dev");
const adminJwt = await tokenFor("admin@chikitsa.dev");

const subPages = [
  ["/patient/schedule", patientJwt],
  ["/patient/constitution", patientJwt],
  ["/patient/assistant", patientJwt],
  ["/notifications", patientJwt],
  ["/doctor/patients", doctorJwt],
  ["/admin/inventory", adminJwt],
  ["/admin/audit", adminJwt],
];

console.log("");
for (const [path, jwt] of subPages) {
  const res = await fetch(BASE + path, {
    headers: { cookie: `chikitsa_session=${jwt}` },
    redirect: "manual",
  });
  const html = await res.text();
  const h1 = html.match(/<h1[^>]*>([^<]{3,60})</)?.[1]?.trim() ?? "(no h1)";
  const bad =
    res.status !== 200 ||
    /Something went wrong|This page doesn/.test(h1) ||
    html.includes("PrismaClientKnownRequestError");
  if (bad) failures++;
  console.log(`${bad ? "✗" : "✓"} ${path.padEnd(24)} ${res.status}  h1="${h1}"`);
}

// ── Assistant streaming endpoint ─────────────────────────────
console.log("");
const aiRes = await fetch(BASE + "/api/assistant", {
  method: "POST",
  headers: {
    cookie: `chikitsa_session=${patientJwt}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ threadId: null, message: "What does Pitta mean?" }),
});

const aiText = await aiRes.text();
const aiOk =
  aiRes.status === 200 &&
  aiRes.headers.get("X-Thread-Id") &&
  aiText.length > 80;
if (!aiOk) failures++;
console.log(
  `${aiOk ? "✓" : "✗"} POST /api/assistant  ${aiRes.status}  mode=${aiRes.headers.get("X-Ai-Mode")}  ${aiText.length} chars streamed`,
);

// The endpoint must reject an unauthenticated caller.
const aiAnon = await fetch(BASE + "/api/assistant", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: "hello" }),
  redirect: "manual",
});
const aiAnonBlocked = aiAnon.status !== 200;
if (!aiAnonBlocked) failures++;
console.log(
  `${aiAnonBlocked ? "✓" : "✗"} Unauthenticated /api/assistant rejected (status ${aiAnon.status})`,
);

await client.end();
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
