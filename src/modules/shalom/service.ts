import { MedusaService } from "@medusajs/framework/utils"
import ShalomSetting from "./models/setting"
import ShalomShipment from "./models/shipment"

class ShalomModuleService extends MedusaService({
  ShalomSetting,
  ShalomShipment,
}) {
  async getSettings() {
    const [settings] = await this.listShalomSettings({}, { take: 1 })
    return settings ?? (await this.createShalomSettings({}))
  }
}

export default ShalomModuleService
