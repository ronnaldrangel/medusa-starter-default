import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SHALOM_MODULE } from "../../../../modules/shalom"
import ShalomModuleService from "../../../../modules/shalom/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const shalom: ShalomModuleService = req.scope.resolve(SHALOM_MODULE)
  const status = req.query.status ? String(req.query.status) : undefined

  const [shipments, count] = await shalom.listAndCountShalomShipments(
    status ? { status: status as any } : {},
    { order: { created_at: "DESC" }, take: 100 }
  )
  res.json({ shipments, count })
}
