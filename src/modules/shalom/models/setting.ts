import { model } from "@medusajs/framework/utils"

// Una sola fila: la configuracion de envios Shalom de la tienda.
const ShalomSetting = model.define("shalom_setting", {
  id: model.id({ prefix: "shset" }).primaryKey(),
  origin_ter_id: model.number().nullable(),
  origin_name: model.text().nullable(),
  origin_address: model.text().nullable(),
  instance_id: model.text().nullable(),
  surcharge: model.float().default(0),
})

export default ShalomSetting
