import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PACKAGE_SIZES, shalomFetch } from "../../../../../../lib/shalom-client"
import { parseGuide } from "../../../../../../lib/shalom-parse"
import { SHALOM_MODULE } from "../../../../../../modules/shalom"
import ShalomModuleService from "../../../../../../modules/shalom/service"

type Body = {
  name: string
  firstname: string
  lastname: string
  dni?: string
  phone?: string
  package_content?: string
  cantidad?: number
}

// Aprueba un envio pendiente y crea la guia en Shalom Pro.
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const shalom: ShalomModuleService = req.scope.resolve(SHALOM_MODULE)
  const settings = await shalom.getSettings()
  const shipment = await shalom.retrieveShalomShipment(req.params.id)

  if (shipment.status === "creada") {
    return res.status(400).json({ message: `Este envío ya tiene la guía ${shipment.guia}` })
  }
  if (!settings.instance_id) {
    return res.status(400).json({ message: "Conecta tu cuenta Shalom Pro antes de crear guías" })
  }
  if (!settings.origin_ter_id) {
    return res.status(400).json({ message: "Configura la sede central de envío" })
  }

  const { name, firstname, lastname } = req.body
  const dni = req.body.dni || shipment.dni
  const phone = String(req.body.phone || shipment.phone || "").replace(/\D/g, "").slice(-9)
  const content =
    PACKAGE_SIZES.find((p) => p.content === req.body.package_content)?.content ??
    shipment.package_content ??
    "PAQUETE S"

  if (!name || !firstname || !lastname) {
    return res.status(400).json({ message: "Nombres, apellido paterno y materno son requeridos" })
  }
  if (!/^\d{9}$/.test(phone)) {
    return res.status(400).json({ message: "El teléfono del destinatario debe tener 9 dígitos" })
  }

  const clave = shipment.clave || String(Math.floor(1000 + Math.random() * 9000))

  let response: unknown
  try {
    response = await shalomFetch("/account/register", {
      method: "POST",
      body: {
        instanceId: settings.instance_id,
        origen: settings.origin_ter_id,
        destino: shipment.ter_id,
        content,
        cantidad: Number(req.body.cantidad) || 1,
        documento: dni,
        name: name.toUpperCase(),
        firstname: firstname.toUpperCase(),
        lastname: lastname.toUpperCase(),
        phone: Number(phone),
        clave,
      },
    })
  } catch (e: any) {
    await shalom.updateShalomShipments({ id: shipment.id, status: "error", error: e.message })
    return res.status(502).json({ message: `Shalom no creó la guía: ${e.message}` })
  }

  const guide = parseGuide(response)
  const updated = await shalom.updateShalomShipments({
    id: shipment.id,
    status: "creada",
    error: null,
    clave,
    dni,
    phone,
    package_content: content,
    recipient_name: `${name} ${firstname} ${lastname}`.toUpperCase(),
    guia: guide.guia,
    codigo: guide.codigo,
    ose_id: guide.ose_id,
    response: response as Record<string, unknown>,
  })

  // Deja la guia visible en el pedido de Medusa.
  const orderModule = req.scope.resolve(Modules.ORDER)
  const order = await orderModule.retrieveOrder(shipment.order_id, { select: ["id", "metadata"] })
  await orderModule.updateOrders(shipment.order_id, {
    metadata: {
      ...(order.metadata ?? {}),
      shalom_guia: guide.guia,
      shalom_codigo: guide.codigo,
      shalom_clave: clave,
    },
  })

  // Seguimiento automatico si Shalom devolvio numero y codigo.
  if (guide.guia && guide.codigo) {
    await shalomFetch("/tracking/subscriptions", {
      method: "POST",
      body: { orderNumber: guide.guia, orderCode: guide.codigo },
    }).catch((e) =>
      req.scope.resolve(ContainerRegistrationKeys.LOGGER).warn(`Shalom tracking: ${e.message}`)
    )
  }

  res.json({ shipment: updated })
}
