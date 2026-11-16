import { getStore } from "@netlify/blobs";

// Toutes les données du journal tiennent dans un seul document JSON.
const store = () => getStore({ name: "journal", region: "eu-central-1", consistency: "strong" });
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function allowed(req) {
  const key = Netlify.env.get("EDIT_KEY");
  return !key || req.headers.get("x-edit-key") === key;
}

const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Applique une seule fois un fichier d'import (public/lbx-import.json) aux données en ligne.
async function applyImport(state, req) {
  let imp;
  try {
    const res = await fetch(new URL("/lbx-import.json", req.url), { cache: "no-store" });
    if (!res.ok) return state;
    imp = await res.json();
  } catch { return state; }
  state.imports = state.imports || [];
  if (!imp.tag || state.imports.includes(imp.tag)) return state;
  await store().setJSON(`backup/avant-${imp.tag}`, state);
  const films = state.films;
  const byId = new Map(films.map((f) => [f.id, f]));
  for (const fx of imp.fixes || []) { const f = byId.get(fx.id); if (f) Object.assign(f, fx.set); }
  for (const u of imp.updates || []) {
    const f = byId.get(u.id); if (!f) continue;
    if (u.r && !f.r) f.r = u.r;
    if (u.c) { if (!f.c) f.c = u.c; else if (!f.c.includes(u.c.slice(0, 40))) f.c = `${f.c}\n\n${u.c}`; }
    if (u.dates && u.dates.length) {
      const [y, m, d] = u.dates[u.dates.length - 1];
      if (!f.m) { f.y = y; f.m = m; f.d = d; } else if (f.y === y && f.m === m && !f.d) f.d = d;
    }
  }
  const keyOf = (f) => `${norm(f.t)}|${f.ry || ""}`;
  const keys = new Set(films.map(keyOf));
  const now = Date.now();
  for (const a of imp.adds || []) {
    if (byId.has(a.id) || keys.has(keyOf(a))) continue;
    films.push({ ...a, ts: now }); keys.add(keyOf(a)); byId.set(a.id, a);
  }
  const wl = state.watchlist || [];
  const wlIds = new Set(wl.map((w) => w.id));
  for (const w of imp.watchlist || []) {
    if (wlIds.has(w.id) || keys.has(keyOf(w))) continue;
    wl.push(w); wlIds.add(w.id);
  }
  state.watchlist = wl;
  state.imports.push(imp.tag);
  state.savedAt = Date.now();
  await store().setJSON("state", state);
  return state;
}

export default async (req) => {
  if (req.method === "GET") {
    let state = await store().get("state", { type: "json" });
    if (state === null) return json({ empty: true }, 404);
    state = await applyImport(state, req);
    return json(state);
  }
  if (req.method === "POST") {
    // vérifie le code de modification sans rien écrire
    return new Response(null, { status: allowed(req) ? 204 : 401 });
  }
  if (req.method === "PUT") {
    if (!allowed(req)) return json({ error: "Code de modification incorrect" }, 401);
    let body;
    try { body = await req.json(); } catch { return json({ error: "JSON invalide" }, 400); }
    if (!body || !Array.isArray(body.films)) return json({ error: "Format inattendu" }, 400);
    const prev = (await store().get("state", { type: "json" })) || {};
    const state = {
      ...prev,
      savedAt: Date.now(),
      films: body.films,
      watchlist: Array.isArray(body.watchlist) ? body.watchlist : prev.watchlist || [],
    };
    await store().setJSON("state", state);
    // copie de secours datée, une par jour
    await store().setJSON(`backup/${new Date().toISOString().slice(0, 10)}`, state);
    return json({ ok: true, savedAt: state.savedAt });
  }
  return json({ error: "Méthode non permise" }, 405);
};

export const config = { path: "/api/films" };
