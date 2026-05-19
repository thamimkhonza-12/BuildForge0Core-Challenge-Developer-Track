const app = document.querySelector("#app");

const state = {
  user: null,
  authMode: "signin",
  tasks: [],
  submissions: [],
  loading: true,
  toast: ""
};

const statusLabels = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

function showToast(message) {
  state.toast = message;
  render();
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    state.toast = "";
    render();
  }, 3200);
}

async function loadSession() {
  state.loading = true;
  render();
  try {
    const { user } = await api("/api/me");
    state.user = user;
    if (user) await loadDashboard();
  } finally {
    state.loading = false;
    render();
  }
}

async function loadDashboard() {
  const [{ tasks }, { submissions }] = await Promise.all([
    api("/api/tasks"),
    api("/api/submissions")
  ]);
  state.tasks = tasks;
  state.submissions = submissions;
}

async function handleAuth(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const body = Object.fromEntries(form.entries());
  const path = state.authMode === "signin" ? "/api/auth/signin" : "/api/auth/signup";
  try {
    const { user } = await api(path, { method: "POST", body: JSON.stringify(body) });
    state.user = user;
    await loadDashboard();
    showToast(`Signed in as ${user.name}`);
  } catch (error) {
    showToast(error.message);
  }
}

async function signOut() {
  await api("/api/auth/signout", { method: "POST" });
  state.user = null;
  state.tasks = [];
  state.submissions = [];
  render();
}

async function createSubmission(event) {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    await api("/api/submissions", { method: "POST", body: JSON.stringify(body) });
    event.currentTarget.reset();
    await loadDashboard();
    showToast("Submission sent for review");
  } catch (error) {
    showToast(error.message);
  }
}

async function reviewSubmission(id, status) {
  const note = document.querySelector(`[data-note="${id}"]`)?.value || "";
  try {
    await api(`/api/submissions/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify({ status, decisionNote: note })
    });
    await loadDashboard();
    showToast(`Submission marked ${status}`);
  } catch (error) {
    showToast(error.message);
  }
}

function renderAuth() {
  const isSignup = state.authMode === "signup";
  return `
    <main class="auth-layout">
      <section class="intro">
        <div class="brand" aria-label="BuildForge Mini">
          <div class="brand-mark">BF</div>
          <div>
            <strong>BuildForge Mini</strong>
            <span>Developer Core Challenge</span>
          </div>
        </div>
        <h1>Ship, submit, and review builder work.</h1>
        <p>A compact full-stack clone with role-based task queues, authenticated submissions, and an admin approval flow ready for a live deployment.</p>
      </section>
      <section class="auth-card">
        <div class="tabs" role="tablist">
          <button class="tab ${!isSignup ? "active" : ""}" data-auth-mode="signin">Sign in</button>
          <button class="tab ${isSignup ? "active" : ""}" data-auth-mode="signup">Sign up</button>
        </div>
        <form data-auth-form>
          ${
            isSignup
              ? `<label>Name<input name="name" autocomplete="name" required placeholder="Ada Lovelace" /></label>`
              : ""
          }
          <label>Email<input name="email" type="email" autocomplete="email" required placeholder="dev@buildforge.dev" /></label>
          <label>Password<input name="password" type="password" autocomplete="${isSignup ? "new-password" : "current-password"}" required placeholder="${isSignup ? "At least 8 characters" : "Dev12345!"}" /></label>
          ${
            isSignup
              ? `<label>Role<select name="role"><option value="developer">Developer</option><option value="admin">Admin</option></select></label>`
              : ""
          }
          <button class="button" type="submit">${isSignup ? "Create account" : "Enter workspace"}</button>
        </form>
        <p class="muted">Demo accounts: dev@buildforge.dev / Dev12345! and admin@buildforge.dev / Admin123!</p>
      </section>
    </main>
  `;
}

function renderTopbar() {
  return `
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">BF</div>
        <div>
          <strong>BuildForge Mini</strong>
          <span>${escapeHtml(state.user.name)} · ${escapeHtml(state.user.role)}</span>
        </div>
      </div>
      <div class="nav-actions">
        <a class="button secondary" href="https://github.com/" target="_blank" rel="noreferrer">Repo</a>
        <button class="button" data-signout>Sign out</button>
      </div>
    </header>
  `;
}

function renderTasks() {
  return `
    <section class="panel stack">
      <div class="section-title">
        <div>
          <h2>Role Tasks</h2>
          <p>Filtered for the signed-in ${escapeHtml(state.user.role)} role.</p>
        </div>
      </div>
      ${state.tasks
        .map(
          (task) => `
          <article class="card">
            <h3>${escapeHtml(task.title)}</h3>
            <p>${escapeHtml(task.summary)}</p>
            <div class="task-meta">
              <span class="pill">${escapeHtml(task.priority)}</span>
              <span class="pill">${escapeHtml(task.estimate)}</span>
              <span class="pill">${escapeHtml(task.role)}</span>
            </div>
          </article>`
        )
        .join("")}
    </section>
  `;
}

function renderSubmissionForm() {
  if (state.user.role === "admin") {
    return `
      <section class="panel">
        <div class="section-title">
          <div>
            <h2>Admin Queue</h2>
            <p>Review candidate builds and record a decision.</p>
          </div>
        </div>
        ${renderKpis()}
      </section>
    `;
  }
  return `
    <section class="panel">
      <div class="section-title">
        <div>
          <h2>Submit Build</h2>
          <p>Send your live app and repository for admin review.</p>
        </div>
      </div>
      <form data-submission-form>
        <label>Project title<input name="title" required placeholder="BuildForge Mini Clone" /></label>
        <label>Repository URL<input name="repoUrl" type="url" required placeholder="https://github.com/you/buildforge-mini" /></label>
        <label>Live URL<input name="liveUrl" type="url" required placeholder="https://buildforge-mini.example.com" /></label>
        <label>Notes<textarea name="notes" placeholder="Architecture choices, tradeoffs, or review notes"></textarea></label>
        <button class="button" type="submit">Submit for review</button>
      </form>
    </section>
  `;
}

function renderKpis() {
  const totals = state.submissions.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { pending: 0, approved: 0, rejected: 0 }
  );
  return `
    <div class="kpis">
      <div class="kpi"><strong>${totals.pending}</strong><span class="muted">Pending</span></div>
      <div class="kpi"><strong>${totals.approved}</strong><span class="muted">Approved</span></div>
      <div class="kpi"><strong>${totals.rejected}</strong><span class="muted">Rejected</span></div>
    </div>
  `;
}

function renderSubmissions() {
  const rows = state.submissions
    .map((submission) => {
      const adminControls =
        state.user.role === "admin"
          ? `
            <div class="decision-row">
              <input data-note="${submission.id}" value="${escapeHtml(submission.decisionNote)}" placeholder="Decision note" />
              <button class="button approve" data-review="${submission.id}" data-status="approved">Approve</button>
              <button class="button reject" data-review="${submission.id}" data-status="rejected">Reject</button>
            </div>`
          : submission.decisionNote
            ? `<p><strong>Decision:</strong> ${escapeHtml(submission.decisionNote)}</p>`
            : "";
      return `
        <article class="card">
          <div class="section-title">
            <div>
              <h3>${escapeHtml(submission.title)}</h3>
              <p>${escapeHtml(submission.notes || "No notes provided.")}</p>
            </div>
            <span class="pill ${submission.status}">${statusLabels[submission.status]}</span>
          </div>
          <div class="submission-meta">
            <a href="${escapeHtml(submission.repoUrl)}" target="_blank" rel="noreferrer">Repository</a>
            <a href="${escapeHtml(submission.liveUrl)}" target="_blank" rel="noreferrer">Live app</a>
            <span class="pill">${escapeHtml(submission.user?.name || "Unknown")}</span>
            <span class="pill">${formatDate(submission.updatedAt)}</span>
          </div>
          ${adminControls}
        </article>`;
    })
    .join("");
  return `
    <section class="panel stack">
      <div class="section-title">
        <div>
          <h2>${state.user.role === "admin" ? "Submissions" : "My Submissions"}</h2>
          <p>${state.user.role === "admin" ? "Every candidate submission is visible here." : "Track review status from pending to final decision."}</p>
        </div>
      </div>
      ${rows || `<div class="empty">No submissions yet.</div>`}
    </section>
  `;
}

function renderDashboard() {
  return `
    <div class="app-shell">
      ${renderTopbar()}
      <main class="workspace">
        <aside class="stack">
          ${renderSubmissionForm()}
          ${renderTasks()}
        </aside>
        ${renderSubmissions()}
      </main>
    </div>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.authMode = button.dataset.authMode;
      render();
    });
  });
  document.querySelector("[data-auth-form]")?.addEventListener("submit", handleAuth);
  document.querySelector("[data-signout]")?.addEventListener("click", signOut);
  document.querySelector("[data-submission-form]")?.addEventListener("submit", createSubmission);
  document.querySelectorAll("[data-review]").forEach((button) => {
    button.addEventListener("click", () => reviewSubmission(button.dataset.review, button.dataset.status));
  });
}

function render() {
  app.innerHTML = `
    ${state.loading ? `<div class="topbar"><div class="brand"><div class="brand-mark">BF</div><strong>Loading workspace</strong></div></div>` : state.user ? renderDashboard() : renderAuth()}
    ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ""}
  `;
  bindEvents();
}

loadSession().catch((error) => {
  state.loading = false;
  render();
  showToast(error.message);
});
