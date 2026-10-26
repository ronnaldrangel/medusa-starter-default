import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { packageForWeight } from "../lib/shalom-client"
import { SHALOM_MODULE } from "../modules/shalom"
import ShalomModuleService from "../modules/shalom/service"

// Registra como "pendiente" cada pedido que eligio envio a agencia Shalom,
// para aprobarlo y generar la guia desde la pagina Shalom del admin.
export default async function shalomOrderPlaced({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const shalom: ShalomModuleService = container.resolve(SHALOM_MODULE)

  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "shipping_address.*",
      "shipping_methods.*",
      "items.quantity",
      "items.variant.weight",
    ],
    filters: { id: data.id },
  })

  const method = order?.shipping_methods?.find((m: any) => m?.data?.ter_id)
  if (!order || !method) {
    return
  }

  const methodData = method.data as Record<string, any>
  const grams = (order.items ?? []).reduce(
    (sum: number, item: any) => sum + (Number(item?.variant?.weight) || 1000) * Number(item?.quantity ?? 1),
    0
  )
  const address = order.shipping_address

  await shalom.createShalomShipments({
    order_id: order.id,
    order_display_id: Number(order.display_id) || null,
    ter_id: Number(methodData.ter_id),
    agency_name: methodData.agency_name ?? null,
    agency_address: methodData.agency_address ?? null,
    dni: String(methodData.dni),
    phone: address?.phone ?? null,
    recipient_name: [address?.first_name, address?.last_name].filter(Boolean).join(" ") || null,
    package_content: packageForWeight(grams).content,
    shipping_amount: Number(method.amount) || null,
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
