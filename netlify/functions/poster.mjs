import { getStore } from "@netlify/blobs";

const store = () => getStore({ name: "posters", region: "eu-central-1", consistency: "strong" });

// Sans EDIT_KEY configurée sur Netlify, toute écriture est refusée.
function allowed(req) {
  const key = Netlify.env.get("EDIT_KEY");
  return Boolean(key) && req.headers.get("x-edit-key") === key;
}

export default async (req, context) => {
  const id = context.params.id;
  if (!id || !/^[\w-]{1,80}$/.test(id)) return new Response("Identifiant invalide", { status: 400 });
  if (req.method === "GET") {
    const img = await store().get(id, { type: "arrayBuffer" });
    if (img === null) return new Response("Introuvable", { status: 404 });
    return new Response(img, { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
  }
  if (req.method === "PUT") {
    if (!allowed(req)) return new Response("Code de modification incorrect", { status: 401 });
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 2_000_000) return new Response("Image trop lourde", { status: 413 });
    await store().set(id, buf);
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
  }
  if (req.method === "DELETE") {
    if (!allowed(req)) return new Response("Code de modification incorrect", { status: 401 });
    await store().delete(id);
    return new Response(null, { status: 204 });
  }
  return new Response("Méthode non permise", { status: 405 });
};

export const config = { path: "/api/poster/:id" };
