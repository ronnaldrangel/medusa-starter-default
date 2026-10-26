import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listAgencies } from "../../../../lib/shalom-client"

// Agencias Shalom de destino para un ubigeo. Primero las del mismo distrito,
// luego el resto de la provincia; si la provincia no tiene, todo el departamento.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const depId = Number(req.query.dep_id)
  const provId = Number(req.query.prov_id)
  const distId = Number(req.query.dist_id)

  if (!depId) {
    return res.status(400).json({ message: "dep_id es requerido" })
  }

  const all = await listAgencies()
  const inDep = all.filter((a) => a.dep_id === depId)
  const inProv = provId ? inDep.filter((a) => a.prov_id === provId) : inDep
  const pool = inProv.length ? inProv : inDep

  const agencies = pool
    .map((a) => ({
      ter_id: a.ter_id,
      name: a.lugar_over,
      zona: a.zona,
      provincia: a.provincia,
      departamento: a.departamento,
      address: a.direccion,
      hours: a.hora_atencion,
      sunday: a.hora_domingo || null,
      phone: a.telefono,
      lat: Number(a.latitud),
      lng: Number(a.longitud),
      same_district: !!distId && a.dist_id === distId,
    }))
    .sort((a, b) => Number(b.same_district) - Number(a.same_district) || a.zona.localeCompare(b.zona))

  res.json({ agencies, exact_province: inProv.length > 0 })
}
