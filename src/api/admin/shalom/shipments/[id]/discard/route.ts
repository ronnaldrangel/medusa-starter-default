import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SHALOM_MODULE } from "../../../../../../modules/shalom"
import ShalomModuleService from "../../../../../../modules/shalom/service"

// Saca de la cola un envio que no se despachara (pedido anulado, prueba, etc.).
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const shalom: ShalomModuleService = req.scope.resolve(SHALOM_MODULE)
  const shipment = await shalom.retrieveShalomShipment(req.params.id)
  if (shipment.status === "creada") {
    return res.status(400).json({ message: "La guía ya fue creada en Shalom; anúlala desde Shalom Pro" })
  }
  const updated = await shalom.updateShalomShipments({ id: shipment.id, status: "cancelada" })
  res.json({ shipment: updated })
}
