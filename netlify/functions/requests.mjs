import { getStore } from "@netlify/blobs";

const STORE_NAME = "solicitudes-stgo";
const DATA_KEY = "pedidos";
const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function validItem(item) {
  return item &&
    typeof item.direccion === "string" &&
    typeof item.escalafon === "string" &&
    typeof item.especialidad === "string" &&
    Number.isFinite(Number(item.grado)) &&
    Number(item.solicitado) > 0 &&
    Number(item.otorgado) > 0;
}

export default async function handler(request) {
  const store = getStore(STORE_NAME);

  try {
    if (request.method === "GET") {
      const pedidos = await store.get(DATA_KEY, {
        type: "json",
        consistency: "strong"
      });
      return json(Array.isArray(pedidos) ? pedidos : []);
    }

    if (request.method === "POST") {
      const nuevos = await request.json();
      if (!Array.isArray(nuevos) || !nuevos.length || !nuevos.every(validItem)) {
        return json({ error: "El pedido recibido no es válido." }, 400);
      }

      const actuales = await store.get(DATA_KEY, {
        type: "json",
        consistency: "strong"
      });
      const pedidos = Array.isArray(actuales) ? actuales : [];
      const guardados = nuevos.map(item => ({
        ...item,
        id: crypto.randomUUID(),
        guardadoEn: new Date().toISOString()
      }));

      await store.setJSON(DATA_KEY, [...pedidos, ...guardados]);
      return json({ ok: true, guardados: guardados.length }, 201);
    }

    if (request.method === "DELETE") {
      await store.delete(DATA_KEY);
      return json({ ok: true });
    }

    return json({ error: "Método no permitido." }, 405);
  } catch (error) {
    console.error("Error en requests:", error);
    return json({ error: "No fue posible guardar o consultar los pedidos." }, 500);
  }
}
