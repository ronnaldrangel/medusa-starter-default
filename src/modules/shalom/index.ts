import { Module } from "@medusajs/framework/utils"
import ShalomModuleService from "./service"

export const SHALOM_MODULE = "shalom"

export default Module(SHALOM_MODULE, {
  service: ShalomModuleService,
})
