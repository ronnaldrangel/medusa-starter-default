import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listAgencies } from "../../../../lib/shalom-client"

const km = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const r = (d: number) => (d * Math.PI) / 180
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(a))
}

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

  // Con agencias en el distrito del cliente, el resto se ordena por cercania a ellas.
  const ref = agencies.filter((a) => a.same_district && a.lat && a.lng)
  if (ref.length) {
    const lat = ref.reduce((s, a) => s + a.lat, 0) / ref.length
    const lng = ref.reduce((s, a) => s + a.lng, 0) / ref.length
    agencies.forEach((a: any) => (a.distance_km = Math.round(km(lat, lng, a.lat, a.lng) * 10) / 10))
    agencies.sort((a: any, b: any) => a.distance_km - b.distance_km)
  } else {
    agencies.sort((a, b) => a.zona.localeCompare(b.zona))
  }

  res.json({ agencies, exact_province: inProv.length > 0 })
}
