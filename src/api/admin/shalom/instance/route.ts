import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { shalomFetch } from "../../../../lib/shalom-client"
import { SHALOM_MODULE } from "../../../../modules/shalom"
import ShalomModuleService from "../../../../modules/shalom/service"

// Conecta la cuenta Shalom Pro (necesaria para crear guias). Las credenciales
// van directo a Shalom API, que hace el login; aqui solo guardamos el instanceId.
export async function POST(
  req: MedusaRequest<{ username: string; password: string }>,
  res: MedusaResponse
) {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ message: "Usuario y contraseña de Shalom Pro son requeridos" })
  }

  const shalom: ShalomModuleService = req.scope.resolve(SHALOM_MODULE)
  const settings = await shalom.getSettings()

  let instanceId = settings.instance_id
  if (!instanceId) {
    const { instances } = await shalomFetch<{ instances: { id: string; username?: string }[] }>("/instances")
    instanceId =
      instances.find((i) => i.username === username)?.id ??
      (await shalomFetch<{ instanceId: string }>("/instances", {
        method: "POST",
        body: { name: "CCI Express - Medusa" },
      })).instanceId
  }

  try {
    await shalomFetch("/instances/login", {
      method: "POST",
      body: { instanceId, username, password },
    })
  } catch (e: any) {
    return res.status(400).json({ message: `Shalom Pro rechazó el login: ${e.message}` })
  }

  await shalom.updateShalomSettings({ id: settings.id, instance_id: instanceId })
  res.json({ connected: true, instance_id: instanceId })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const shalom: ShalomModuleService = req.scope.resolve(SHALOM_MODULE)
  const settings = await shalom.getSettings()
  if (settings.instance_id) {
    await shalomFetch("/instances/logout", {
      method: "POST",
      body: { instanceId: settings.instance_id },
    }).catch(() => null)
  }
  res.json({ connected: false })
}
