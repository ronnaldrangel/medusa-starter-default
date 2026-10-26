import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { shalomFetch } from "../../../../../lib/shalom-client"
import { parseDniNames } from "../../../../../lib/shalom-parse"

// Consulta RENIEC via Shalom para completar nombres y apellidos del destinatario.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const dni = String(req.params.dni)
  if (!/^\d{8}$/.test(dni)) {
    return res.status(400).json({ message: "DNI inválido" })
  }
  try {
    const raw = await shalomFetch<unknown>(`/account/dni/${dni}`)
    res.json({ ...parseDniNames(raw), found: true })
  } catch (e: any) {
    res.json({ found: false, message: e.message })
  }
}
