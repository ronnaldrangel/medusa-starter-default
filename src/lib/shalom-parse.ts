// Shalom devuelve "espejos" de su sistema sin esquema fijo documentado.
// Estos ayudantes buscan los campos por nombre en cualquier nivel del JSON.

function findValue(obj: unknown, test: (key: string) => boolean): unknown {
  if (!obj || typeof obj !== "object") return undefined
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (test(key.toLowerCase()) && value !== null && value !== "" && typeof value !== "object") {
      return value
    }
  }
  for (const value of Object.values(obj as Record<string, unknown>)) {
    const found = findValue(value, test)
    if (found !== undefined) return found
  }
  return undefined
}

const str = (v: unknown) => (v === undefined || v === null ? null : String(v).trim())

export function parseDniNames(raw: unknown) {
  return {
    name: str(findValue(raw, (k) => k === "nombres" || k === "nombre" || k === "name" || k === "prenombres")),
    firstname: str(
      findValue(raw, (k) => k.includes("paterno") || k === "apepat" || k === "first_last_name" || k === "firstname")
    ),
    lastname: str(
      findValue(raw, (k) => k.includes("materno") || k === "apemat" || k === "second_last_name" || k === "lastname")
    ),
  }
}

export function parseGuide(raw: unknown) {
  return {
    guia: str(findValue(raw, (k) => ["guia", "nro_guia", "numero_guia", "ose_numero", "numero", "order_number", "ordernumber"].includes(k))),
    codigo: str(findValue(raw, (k) => ["codigo", "codigo_seguridad", "ose_codigo", "code", "order_code", "ordercode"].includes(k))),
    ose_id: str(findValue(raw, (k) => k === "ose_id" || k === "service_order_id" || k === "id_orden")),
  }
}
