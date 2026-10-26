import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listLocations } from "../../../../lib/shalom-client"

// GET /store/shalom/locations            -> departamentos
// GET /store/shalom/locations?dep_id=15  -> provincias
// GET /store/shalom/locations?dep_id=15&prov_id=1 -> distritos
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const depId = Number(req.query.dep_id) || null
  const provId = Number(req.query.prov_id) || null

  const path = !depId
    ? ""
    : !provId
    ? `/${depId}/provinces`
    : `/${depId}/provinces/${provId}/districts`

  res.json({ items: await listLocations(path) })
}
