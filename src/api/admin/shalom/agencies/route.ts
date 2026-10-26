import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listAgencies } from "../../../../lib/shalom-client"

// Busqueda de agencias para elegir la sede central (origen de los envios).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = String(req.query.q ?? "").trim().toUpperCase()
  const all = (await listAgencies()).filter((a) => a.origen === 1)
  const words = q.split(/\s+/).filter(Boolean)
  const found = words.length
    ? all.filter((a) => {
        const text = `${a.nombre} ${a.direccion} ${a.zona} ${a.ter_id}`.toUpperCase()
        return words.every((w) => text.includes(w))
      })
    : all

  res.json({
    agencies: found.slice(0, 30).map((a) => ({
      ter_id: a.ter_id,
      name: a.nombre,
      address: a.direccion,
      hours: a.hora_atencion,
    })),
    total: found.length,
  })
}
