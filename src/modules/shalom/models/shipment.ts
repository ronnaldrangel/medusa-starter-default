import { model } from "@medusajs/framework/utils"

// Envio Shalom de un pedido: se crea "pendiente" al confirmarse la compra y
// pasa a "creada" cuando el admin lo aprueba y Shalom genera la guia.
const ShalomShipment = model.define("shalom_shipment", {
  id: model.id({ prefix: "shship" }).primaryKey(),
  order_id: model.text().unique(),
  order_display_id: model.number().nullable(),
  status: model.enum(["pendiente", "creada", "error", "cancelada"]).default("pendiente"),
  ter_id: model.number(),
  agency_name: model.text().nullable(),
  agency_address: model.text().nullable(),
  dni: model.text(),
  phone: model.text().nullable(),
  recipient_name: model.text().nullable(),
  package_content: model.text().nullable(),
  shipping_amount: model.float().nullable(),
  clave: model.text().nullable(),
  guia: model.text().nullable(),
  codigo: model.text().nullable(),
  ose_id: model.text().nullable(),
  error: model.text().nullable(),
  response: model.json().nullable(),
})

export default ShalomShipment
