// Cliente minimo de Shalom API (https://api.shalom-api.lat).
// La key vive en SHALOM_API_KEY; nunca se expone al navegador.

const BASE_URL = process.env.SHALOM_API_URL || "https://api.shalom-api.lat"

export type ShalomAgency = {
  ter_id: number
  nombre: string
  lugar_over: string
  zona: string
  provincia: string
  departamento: string
  direccion: string
  telefono: string
  hora_atencion: string
  hora_domingo?: string
  latitud: string
  longitud: string
  dep_id: number
  prov_id: number
  dist_id: number
  ubi_id: number
  origen: number
  destino: number
}

export type ShalomTariff = {
  sobre: number
  cajapaquetexxs: number
  cajapaquetexs: number
  cajapaquetes: number
  cajapaquetem: number
  cajapaquetel: number
  peso: number
}

export type ShalomQuote = { tariff: ShalomTariff; lead_time: string }

export class ShalomError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
  }
}

export async function shalomFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const apiKey = process.env.SHALOM_API_KEY
  if (!apiKey) {
    throw new ShalomError("SHALOM_API_KEY no esta configurada")
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method ?? "GET",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })

  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // respuesta no JSON (ej. PDF): la devuelve el llamador por otro camino
  }

  if (!res.ok) {
    throw new ShalomError(json?.error || json?.message || `Shalom respondio ${res.status}`, res.status)
  }
  return json as T
}

// --- caches en memoria: el catalogo de Shalom se refresca cada 3 h en origen
const cache = new Map<string, { at: number; value: unknown }>()

async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < ttlMs) {
    return hit.value as T
  }
  const value = await load()
  cache.set(key, { at: Date.now(), value })
  return value
}

const HOURS = 60 * 60 * 1000

export const listAgencies = () =>
  cached("agencies", 3 * HOURS, async () => {
    const res = await shalomFetch<{ data: ShalomAgency[] }>("/agencies")
    return res.data.filter((a) => a.destino === 1)
  })

export const listLocations = (path: string) =>
  cached(`loc:${path}`, 24 * HOURS, async () => {
    const res = await shalomFetch<{ items: { id: number; name: string; ubi_id: number }[] }>(
      `/locations/departments${path}`
    )
    return res.items
  })

export const quote = (origin: number, destination: number) =>
  cached(`quote:${origin}:${destination}`, 30 * 60 * 1000, async () => {
    const res = await shalomFetch<{ data: { tariff: ShalomTariff; lead_time: string } }>(
      "/account/quote",
      { method: "POST", body: { origin, destination } }
    )
    return { tariff: res.data.tariff, lead_time: res.data.lead_time } as ShalomQuote
  })

// Tamanos de bulto de Shalom y el nombre que espera /account/register.
export const PACKAGE_SIZES = [
  { key: "cajapaquetexxs", content: "PAQUETE XXS", label: "XXS", maxGrams: 500 },
  { key: "cajapaquetexs", content: "PAQUETE XS", label: "XS", maxGrams: 1500 },
  { key: "cajapaquetes", content: "PAQUETE S", label: "S", maxGrams: 4000 },
  { key: "cajapaquetem", content: "PAQUETE M", label: "M", maxGrams: 8000 },
  { key: "cajapaquetel", content: "PAQUETE L", label: "L", maxGrams: Infinity },
] as const

export type PackageSize = (typeof PACKAGE_SIZES)[number]

export const packageForWeight = (grams: number): PackageSize =>
  PACKAGE_SIZES.find((p) => grams <= p.maxGrams) ?? PACKAGE_SIZES[PACKAGE_SIZES.length - 1]

// Precio del bulto: tarifa por tamano; sobre los 10 kg se cobra por peso si sale mas.
export const priceForPackage = (tariff: ShalomTariff, size: PackageSize, grams: number) => {
  const base = Number(tariff[size.key as keyof ShalomTariff]) || 0
  const byWeight = (Number(tariff.peso) || 0) * (grams / 1000)
  return Math.max(base, size.key === "cajapaquetel" ? byWeight : 0)
}
