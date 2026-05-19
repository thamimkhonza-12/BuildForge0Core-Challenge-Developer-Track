const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const SESSION_COOKIE = "bf_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const SECRET = process.env.SESSION_SECRET || "buildforge-local-dev-secret-change-me";

const ROLE_TASKS = [
  {
    id: "frontend-polish",
    title: "Refine candidate dashboard",
    role: "developer",
    priority: "High",
    estimate: "2h",
    summary: "Improve the task list experience and responsive states for builders."
  },
  {
    id: "api-health",
    title: "Add API health endpoint",
    role: "developer",
    priority: "Medium",
    estimate: "45m",
    summary: "Expose a lightweight status check for deployment monitors."
  },
  {
    id: "review-submissions",
    title: "Review challenge submissions",
    role: "admin",
    priority: "High",
    estimate: "Daily",
    summary: "Approve or reject submitted BuildForge mini builds."
  },
  {
    id: "triage-builders",
    title: "Triage core team candidates",
    role: "admin",
    priority: "Medium",
    estimate: "1h",
    summary: "Scan submission quality and identify follow-up candidates."
  }
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

async function ensureDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    const admin = createUserRecord("admin@buildforge.dev", "Admin123!", "admin", "BuildForge Admin");
    const developer = createUserRecord("dev@buildforge.dev", "Dev12345!", "developer", "Demo Developer");
    await writeDb({
      users: [admin, developer],
      sessions: [],
      submissions: [
        {
          id: crypto.randomUUID(),
          userId: developer.id,
          title: "BuildForge Mini Demo",
          repoUrl: "https://github.com/example/buildforge-mini",
          liveUrl: "https://buildforge-mini.example.com",
          notes: "Seed submission showing the review workflow.",
          status: "pending",
          decisionNote: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    });
  }
}

async function readDb() {
  await ensureDb();
  return JSON.parse(await fs.readFile(DB_PATH, "utf8"));
}

async function writeDb(db) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

function createUserRecord(email, password, role, name) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    id: crypto.randomUUID(),
    email: normalizeEmail(email),
    name: name.trim(),
    role,
    salt,
    passwordHash: hashPassword(password, salt),
    createdAt: new Date().toISOString()
  };
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function sign(value) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
}

function createSessionToken(sessionId) {
  return `${sessionId}.${sign(sessionId)}`;
}

function readCookie(req, name) {
  const raw = req.headers.cookie || "";
  return raw
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function verifySessionToken(token) {
  if (!token || !token.includes(".")) return null;
  const [sessionId, signature] = token.split(".");
  const expected = sign(sessionId);
  const a = Buffer.from(signature || "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return sessionId;
}

async function getAuth(req, db) {
  const sessionId = verifySessionToken(readCookie(req, SESSION_COOKIE));
  if (!sessionId) return { user: null, session: null };
  const session = db.sessions.find((item) => item.id === sessionId);
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
    return { user: null, session: null };
  }
  return { session, user: db.users.find((user) => user.id === session.userId) || null };
}

function setSessionCookie(res, sessionId) {
  const token = createSessionToken(sessionId);
  const expires = new Date(Date.now() + SESSION_TTL_MS).toUTCString();
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Expires=${expires}`
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("Invalid JSON body"), { status: 400 });
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function requireFields(body, fields) {
  for (const field of fields) {
    if (!String(body[field] || "").trim()) {
      throw Object.assign(new Error(`${field} is required`), { status: 400 });
    }
  }
}

function assertUrl(value, field) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("bad protocol");
  } catch {
    throw Object.assign(new Error(`${field} must be a valid URL`), { status: 400 });
  }
}

function visibleSubmissions(db, user) {
  const enriched = db.submissions.map((submission) => ({
    ...submission,
    user: publicUser(db.users.find((candidate) => candidate.id === submission.userId))
  }));
  if (user.role === "admin") return enriched;
  return enriched.filter((submission) => submission.userId === user.id);
}

async function handleApi(req, res, url) {
  const db = await readDb();
  const { user, session } = await getAuth(req, db);

  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, name: "buildforge-mini" });
  }

  if (req.method === "GET" && url.pathname === "/api/me") {
    return sendJson(res, 200, { user: publicUser(user) });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/signup") {
    const body = await parseBody(req);
    requireFields(body, ["name", "email", "password"]);
    const email = normalizeEmail(body.email);
    if (String(body.password).length < 8) {
      return sendError(res, 400, "Password must be at least 8 characters");
    }
    if (db.users.some((candidate) => candidate.email === email)) {
      return sendError(res, 409, "Email is already registered");
    }
    const role = body.role === "admin" ? "admin" : "developer";
    const nextUser = createUserRecord(email, body.password, role, body.name);
    const nextSession = {
      id: crypto.randomUUID(),
      userId: nextUser.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
    };
    db.users.push(nextUser);
    db.sessions.push(nextSession);
    await writeDb(db);
    setSessionCookie(res, nextSession.id);
    return sendJson(res, 201, { user: publicUser(nextUser) });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/signin") {
    const body = await parseBody(req);
    requireFields(body, ["email", "password"]);
    const found = db.users.find((candidate) => candidate.email === normalizeEmail(body.email));
    const passwordHash = found ? hashPassword(body.password, found.salt) : "";
    if (!found || passwordHash !== found.passwordHash) {
      return sendError(res, 401, "Invalid email or password");
    }
    const nextSession = {
      id: crypto.randomUUID(),
      userId: found.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
    };
    db.sessions.push(nextSession);
    await writeDb(db);
    setSessionCookie(res, nextSession.id);
    return sendJson(res, 200, { user: publicUser(found) });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/signout") {
    if (session) {
      const index = db.sessions.findIndex((item) => item.id === session.id);
      if (index >= 0) db.sessions.splice(index, 1);
      await writeDb(db);
    }
    clearSessionCookie(res);
    return sendJson(res, 200, { ok: true });
  }

  if (!user) return sendError(res, 401, "Sign in required");

  if (req.method === "GET" && url.pathname === "/api/tasks") {
    const tasks = ROLE_TASKS.filter((task) => task.role === user.role || user.role === "admin");
    return sendJson(res, 200, { tasks });
  }

  if (req.method === "GET" && url.pathname === "/api/submissions") {
    return sendJson(res, 200, { submissions: visibleSubmissions(db, user) });
  }

  if (req.method === "POST" && url.pathname === "/api/submissions") {
    const body = await parseBody(req);
    requireFields(body, ["title", "repoUrl", "liveUrl"]);
    assertUrl(body.repoUrl, "Repo URL");
    assertUrl(body.liveUrl, "Live URL");
    const submission = {
      id: crypto.randomUUID(),
      userId: user.id,
      title: String(body.title).trim(),
      repoUrl: String(body.repoUrl).trim(),
      liveUrl: String(body.liveUrl).trim(),
      notes: String(body.notes || "").trim(),
      status: "pending",
      decisionNote: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.submissions.unshift(submission);
    await writeDb(db);
    return sendJson(res, 201, { submission });
  }

  const reviewMatch = url.pathname.match(/^\/api\/submissions\/([^/]+)\/review$/);
  if (req.method === "PATCH" && reviewMatch) {
    if (user.role !== "admin") return sendError(res, 403, "Admin role required");
    const body = await parseBody(req);
    if (!["approved", "rejected", "pending"].includes(body.status)) {
      return sendError(res, 400, "Status must be pending, approved, or rejected");
    }
    const found = db.submissions.find((item) => item.id === reviewMatch[1]);
    if (!found) return sendError(res, 404, "Submission not found");
    found.status = body.status;
    found.decisionNote = String(body.decisionNote || "").trim();
    found.updatedAt = new Date().toISOString();
    await writeDb(db);
    return sendJson(res, 200, { submission: found });
  }

  sendError(res, 404, "API route not found");
}

async function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    const shell = await fs.readFile(path.join(PUBLIC_DIR, "index.html"));
    res.writeHead(200, { "Content-Type": MIME_TYPES[".html"] });
    res.end(shell);
  }
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
    } else {
      await serveStatic(req, res, url);
    }
  } catch (error) {
    sendError(res, error.status || 500, error.status ? error.message : "Unexpected server error");
  }
}

ensureDb().then(() => {
  http.createServer(handleRequest).listen(PORT, () => {
    console.log(`BuildForge mini running at http://localhost:${PORT}`);
  });
});
