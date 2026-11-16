import { getStore } from "@netlify/blobs";

// Toutes les données du journal tiennent dans un seul document JSON.
const store = () => getStore({ name: "journal", region: "eu-central-1", consistency: "strong" });
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function allowed(req) {
  const key = Netlify.env.get("EDIT_KEY");
  return !key || req.headers.get("x-edit-key") === key;
}

export default async (req) => {
  if (req.method === "GET") {
    const state = await store().get("state", { type: "json" });
    return state === null ? json({ empty: true }, 404) : json(state);
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
    const state = { savedAt: Date.now(), films: body.films };
    await store().setJSON("state", state);
    // copie de secours datée, une par jour
    await store().setJSON(`backup/${new Date().toISOString().slice(0, 10)}`, state);
    return json({ ok: true, savedAt: state.savedAt });
  }
  return json({ error: "Méthode non permise" }, 405);
};

export const config = { path: "/api/films" };
