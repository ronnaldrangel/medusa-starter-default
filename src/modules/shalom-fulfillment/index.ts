import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import ShalomFulfillmentProviderService from "./service"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [ShalomFulfillmentProviderService],
})
