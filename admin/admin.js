const API = "/api";
const root = document.getElementById("root");
let csrfToken = "";

const el = (tag, props = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "value") node.value = value;
    else if (key === "type") node.type = value;
    else if (key === "name") node.name = value;
    else if (key === "placeholder") node.placeholder = value;
    else if (key === "required") node.required = value;
    else if (key === "accept") node.accept = value;
    else if (key === "href") node.href = value;
    else node.setAttribute(key, value);
  }
  children.forEach(child => node.append(child));
  return node;
};

function showLogin(message = "") {
  root.replaceChildren();
  const box = el("form", { class: "login-box" });
  box.append(el("h2", { text: "BRIGHT KOLORS" }), el("p", { text: "Secure admin dashboard" }));
  const user = el("input", { name: "username", placeholder: "Username", required: true, autocomplete: "username" });
  const pass = el("input", { name: "password", type: "password", placeholder: "Password", required: true, autocomplete: "current-password" });
  const msg = el("p", { class: "message error", text: message });
  box.append(user, pass, el("button", { type: "submit", text: "Sign in" }), msg);
  box.addEventListener("submit", async (event) => {
    event.preventDefault();
    msg.textContent = "Signing in…";
    try {
      const response = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: user.value, password: pass.value }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Invalid login");
      csrfToken = data.csrfToken || "";
      await loadApp();
    } catch (error) { msg.textContent = error.message; }
  });
  root.append(el("div", { class: "login" }, [box]));
}

async function getCsrf() {
  const response = await fetch(`${API}/auth/csrf`, { cache: "no-store" });
  if (!response.ok) throw new Error("Security token could not be created");
  const data = await response.json();
  csrfToken = data.csrfToken;
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!options.body || typeof options.body === "string") headers.set("Content-Type", "application/json");
  if (["POST", "PATCH", "DELETE", "PUT"].includes((options.method || "GET").toUpperCase())) headers.set("X-CSRF-Token", csrfToken);
  const response = await fetch(API + path, { ...options, headers });
  if (response.status === 401) { showLogin("Your admin session has expired."); throw new Error("login"); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function logout() {
  api("/auth/logout", { method: "POST" }).finally(() => { csrfToken = ""; showLogin(); });
}

function layout() {
  root.replaceChildren();
  const app = el("div", { class: "app" });
  const top = el("div", { class: "top" });
  top.append(el("div", {}, [el("p", { class: "muted", text: "BRIGHT KOLORS SIGNAGE STUDIO" }), el("h1", { text: "Admin" })]));
  const logoutBtn = el("button", { text: "Logout" }); logoutBtn.addEventListener("click", logout); top.append(logoutBtn);
  const tabs = el("div", { class: "tabs" });
  const content = el("div", { id: "content" });
  const tabNames = [["quotes", "Quotations"], ["projects", "Projects"], ["locations", "Locations"]];
  tabNames.forEach(([name, label], index) => { const b = el("button", { text: label, class: index === 0 ? "active" : "" }); b.addEventListener("click", () => { tabs.querySelectorAll("button").forEach(x => x.classList.remove("active")); b.classList.add("active"); show(name, content); }); tabs.append(b); });
  app.append(top, tabs, content); root.append(app); return content;
}

async function show(type, content = document.getElementById("content")) {
  content.replaceChildren(el("div", { class: "panel", text: "Loading…" }));
  try {
    if (type === "quotes") await renderQuotes(content);
    if (type === "locations") await renderLocations(content);
    if (type === "projects") await renderProjects(content);
  } catch (error) { content.replaceChildren(el("div", { class: "panel error", text: error.message })); }
}

async function renderQuotes(content) {
  const quotes = await api("/quotes");
  const panel = el("div", { class: "panel" }); panel.append(el("h2", { text: "Quotation enquiries" }));
  if (!quotes.length) panel.append(el("div", { class: "empty", text: "No enquiries yet." }));
  quotes.forEach(q => {
    const row = el("div", { class: "row" });
    const info = el("div");
    info.append(el("b", { text: `#${q.id} — ${q.name}` }), el("p", { text: `${q.service} • ${q.projectType || "Project"} • ${q.location || "No location"}` }), el("p", { class: "muted", text: `${q.mobile}${q.email ? ` • ${q.email}` : ""}` }), el("p", { class: "muted", text: q.message || "" }));
    const actions = el("div", { class: "actions" });
    const select = el("select"); ["New", "Contacted", "Site Visit", "Quotation Sent", "Approved", "Completed"].forEach(s => { const option = el("option", { text: s, value: s }); option.selected = q.status === s; select.append(option); });
    select.addEventListener("change", async () => { try { await api(`/quotes/${q.id}`, { method: "PATCH", body: JSON.stringify({ status: select.value }) }); } catch (e) { alert(e.message); } });
    const del = el("button", { class: "danger", text: "Delete" }); del.addEventListener("click", async () => { if (!confirm("Delete this quotation?")) return; await api(`/quotes/${q.id}`, { method: "DELETE" }); show("quotes", content); });
    actions.append(select, del); row.append(info, actions); panel.append(row);
  }); content.replaceChildren(panel);
}

async function renderLocations(content) {
  const locations = await api("/locations");
  const add = el("div", { class: "panel" }); add.append(el("h2", { text: "Places we work" }));
  const form = el("form"); const grid = el("div", { class: "grid" });
  const name = el("input", { name: "name", placeholder: "City / Area", required: true }); const address = el("input", { name: "address", placeholder: "Address / area" }); const description = el("textarea", { name: "description", placeholder: "Short description" });
  grid.append(name, address); form.append(grid, description, el("button", { type: "submit", text: "Add location" }));
  form.addEventListener("submit", async e => { e.preventDefault(); try { await api("/locations", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) }); show("locations", content); } catch (err) { alert(err.message); } }); add.append(form);
  const list = el("div", { class: "panel" }); locations.forEach(x => { const row = el("div", { class: "row" }); row.append(el("div", {}, [el("b", { text: x.name }), el("p", { text: x.address || "" }), el("p", { class: "muted", text: x.description || "" })])); const del = el("button", { class: "danger", text: "Delete" }); del.addEventListener("click", async () => { if (confirm("Delete this location?")) { await api(`/locations/${x.id}`, { method: "DELETE" }); show("locations", content); } }); row.append(del); list.append(row); });
  content.replaceChildren(add, list);
}

async function renderProjects(content) {
  const projects = await api("/projects");
  const add = el("div", { class: "panel" }); add.append(el("h2", { text: "Add project" }));
  const form = el("form"); form.enctype = "multipart/form-data"; const grid = el("div", { class: "grid" });
  ["title", "category", "location", "interiorExterior"].forEach((name, i) => grid.append(el("input", { name, placeholder: ["Project title", "ACP / LED / Corporate", "Location", "Interior / Exterior"][i], required: name === "title" })));
  const desc = el("textarea", { name: "description", placeholder: "Project description" }); const file = el("input", { name: "image", type: "file", accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" });
  form.append(grid, desc, file, el("button", { type: "submit", text: "Add project" }));
  form.addEventListener("submit", async e => { e.preventDefault(); try { await api("/projects", { method: "POST", body: new FormData(form) }); show("projects", content); } catch (err) { alert(err.message); } }); add.append(form);
  const list = el("div", { class: "panel" }); list.append(el("h2", { text: "Projects" }));
  projects.forEach(x => { const row = el("div", { class: "row" }); const info = el("div"); if (x.image) info.append(el("img", { class: "thumb", src: `/uploads/${encodeURIComponent(x.image)}`, alt: "Project image", loading: "lazy" })); info.append(el("b", { text: x.title }), el("p", { text: `${x.category || ""} • ${x.location || ""} • ${x.interiorExterior || ""}` })); const del = el("button", { class: "danger", text: "Delete" }); del.addEventListener("click", async () => { if (confirm("Delete this project?")) { await api(`/projects/${x.id}`, { method: "DELETE" }); show("projects", content); } }); row.append(info, del); list.append(row); }); content.replaceChildren(add, list);
}

async function loadApp() {
  try {
    if (!csrfToken) await getCsrf();
    await api("/quotes");
    const content = layout();
    await renderQuotes(content);
  } catch (error) {
    if (error.message !== "login") showLogin("Please sign in to continue.");
  }
}

loadApp();
