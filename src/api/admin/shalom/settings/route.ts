import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { shalomFetch } from "../../../../lib/shalom-client"
import { SHALOM_MODULE } from "../../../../modules/shalom"
import ShalomModuleService from "../../../../modules/shalom/service"

export const SHALOM_PROVIDER_ID = "shalom_shalom"

async function instanceStatus(instanceId?: string | null) {
  if (!instanceId) return { connected: false }
  try {
    const s = await shalomFetch<{ isLoggedIn: boolean; username?: string }>("/instances/status", {
      method: "POST",
      body: { instanceId },
    })
    return { connected: !!s.isLoggedIn, username: s.username ?? null }
  } catch (e: any) {
    return { connected: false, error: e.message }
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const shalom: ShalomModuleService = req.scope.resolve(SHALOM_MODULE)
  const settings = await shalom.getSettings()

  let api: Record<string, unknown> = { valid: false }
  try {
    api = await shalomFetch("/validate")
  } catch (e: any) {
    api = { valid: false, error: e.message }
  }

  res.json({ settings, api, instance: await instanceStatus(settings.instance_id) })
}

type Body = { origin_ter_id?: number; origin_name?: string; origin_address?: string; surcharge?: number }

export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const shalom: ShalomModuleService = req.scope.resolve(SHALOM_MODULE)
  const current = await shalom.getSettings()
  const { origin_ter_id, origin_name, origin_address, surcharge } = req.body

  const settings = await shalom.updateShalomSettings({
    id: current.id,
    ...(origin_ter_id !== undefined && { origin_ter_id: Number(origin_ter_id) }),
    ...(origin_name !== undefined && { origin_name }),
    ...(origin_address !== undefined && { origin_address }),
    ...(surcharge !== undefined && { surcharge: Number(surcharge) || 0 }),
  })

  // El proveedor de envio lee la sede y el recargo desde el data de la opcion.
  const fulfillment = req.scope.resolve(Modules.FULFILLMENT)
  const options = (await fulfillment.listShippingOptions({})).filter(
    (o) => o.provider_id === SHALOM_PROVIDER_ID
  )
  for (const option of options) {
    await fulfillment.updateShippingOptions(option.id, {
      data: {
        ...(option.data ?? {}),
        origin_ter_id: settings.origin_ter_id,
        surcharge: Number(settings.surcharge) || 0,
      },
    })
  }

  res.json({ settings, updated_options: options.length })
}
