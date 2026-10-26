import { defineRouteConfig } from "@medusajs/admin-sdk"
import { TruckFast } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Select,
  StatusBadge,
  Table,
  Text,
  toast,
  Toaster,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

// ---------- tipos y helpers ----------
type Settings = {
  id: string
  origin_ter_id: number | null
  origin_name: string | null
  origin_address: string | null
  instance_id: string | null
  surcharge: number
}
type Shipment = {
  id: string
  order_id: string
  order_display_id: number | null
  status: "pendiente" | "creada" | "error" | "cancelada"
  ter_id: number
  agency_name: string | null
  agency_address: string | null
  dni: string
  phone: string | null
  recipient_name: string | null
  package_content: string | null
  shipping_amount: number | null
  clave: string | null
  guia: string | null
  codigo: string | null
  error: string | null
  created_at: string
}
type Agency = { ter_id: number; name: string; address: string; hours: string }

const PACKAGES = ["SOBRE", "PAQUETE XXS", "PAQUETE XS", "PAQUETE S", "PAQUETE M", "PAQUETE L"]

const STATUS: Record<Shipment["status"], { color: "orange" | "green" | "red" | "grey"; label: string }> = {
  pendiente: { color: "orange", label: "Por aprobar" },
  creada: { color: "green", label: "Guía creada" },
  error: { color: "red", label: "Error" },
  cancelada: { color: "grey", label: "Cancelada" },
}

async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`/admin/shalom${path}`, {
    method: init?.method ?? "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || `Error ${res.status}`)
  return json as T
}

const money = (n: number | null) =>
  n == null ? "—" : new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n)

// ---------- sede central ----------
function OriginCard({ settings, onSaved }: { settings: Settings; onSaved: () => void }) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<Agency[]>([])
  const [searching, setSearching] = useState(false)
  const [surcharge, setSurcharge] = useState(String(settings.surcharge ?? 0))

  const search = async () => {
    setSearching(true)
    try {
      const { agencies } = await api<{ agencies: Agency[] }>(`/agencies?q=${encodeURIComponent(q)}`)
      setResults(agencies)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSearching(false)
    }
  }

  const save = async (body: Record<string, unknown>, msg: string) => {
    try {
      await api("/settings", { method: "POST", body })
      toast.success(msg)
      setResults([])
      onSaved()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Sede central de envío</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Agencia Shalom desde donde despachas. Se usa para cotizar el envío en el checkout y como origen de cada guía.
        </Text>
      </div>
      <div className="px-6 py-4">
        {settings.origin_ter_id ? (
          <div className="flex items-start justify-between gap-4">
            <div>
              <Text weight="plus">{settings.origin_name}</Text>
              <Text size="small" className="text-ui-fg-subtle">{settings.origin_address}</Text>
            </div>
            <Badge color="green">ter_id {settings.origin_ter_id}</Badge>
          </div>
        ) : (
          <Text className="text-ui-fg-error">Aún no eliges una sede central: el envío Shalom no se puede cotizar.</Text>
        )}
      </div>
      <div className="flex flex-col gap-3 px-6 py-4">
        <Label size="small">Buscar agencia (distrito, avenida o ter_id)</Label>
        <div className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Ej. MALVINAS, LOS OLIVOS, AV. ARGENTINA"
          />
          <Button variant="secondary" onClick={search} isLoading={searching}>
            Buscar
          </Button>
        </div>
        {results.length > 0 && (
          <ul className="max-h-80 divide-y overflow-auto rounded-lg border">
            {results.map((a) => (
              <li key={a.ter_id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <Text size="small" weight="plus">{a.name}</Text>
                  <Text size="xsmall" className="text-ui-fg-subtle">{a.address}</Text>
                </div>
                <Button
                  size="small"
                  onClick={() =>
                    save(
                      { origin_ter_id: a.ter_id, origin_name: a.name, origin_address: a.address },
                      "Sede central actualizada"
                    )
                  }
                >
                  Usar como sede
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-end gap-3 px-6 py-4">
        <div className="flex-1">
          <Label size="small">Recargo por envío (S/), se suma a la tarifa Shalom</Label>
          <Input type="number" min="0" step="0.5" value={surcharge} onChange={(e) => setSurcharge(e.target.value)} />
        </div>
        <Button variant="secondary" onClick={() => save({ surcharge: Number(surcharge) || 0 }, "Recargo guardado")}>
          Guardar recargo
        </Button>
      </div>
    </Container>
  )
}

// ---------- cuenta Shalom Pro ----------
function AccountCard({
  instance,
  onSaved,
}: {
  instance: { connected: boolean; username?: string | null; error?: string }
  onSaved: () => void
}) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const connect = async () => {
    setLoading(true)
    try {
      await api("/instance", { method: "POST", body: { username, password } })
      toast.success("Cuenta Shalom Pro conectada")
      setPassword("")
      onSaved()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Cuenta Shalom Pro</Heading>
          <Text size="small" className="text-ui-fg-subtle">Necesaria para crear guías automáticamente.</Text>
        </div>
        <StatusBadge color={instance.connected ? "green" : "red"}>
          {instance.connected ? `Conectada · ${instance.username ?? ""}` : "Sin conectar"}
        </StatusBadge>
      </div>
      <div className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div>
          <Label size="small">Usuario / correo de pro.shalom.pe</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
        </div>
        <div>
          <Label size="small">Contraseña</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <Button onClick={connect} isLoading={loading} disabled={!username || !password}>
          {instance.connected ? "Reconectar" : "Conectar"}
        </Button>
      </div>
      <div className="px-6 py-3">
        <Text size="xsmall" className="text-ui-fg-muted">
          La contraseña se envía a Shalom API para iniciar sesión y no se guarda en tu tienda.
        </Text>
      </div>
    </Container>
  )
}

// ---------- aprobar envio ----------
function ApproveDrawer({ shipment, onClose, onDone }: { shipment: Shipment | null; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ dni: "", name: "", firstname: "", lastname: "", phone: "", package_content: "PAQUETE S", cantidad: "1" })
  const [loading, setLoading] = useState(false)
  const [looking, setLooking] = useState(false)

  const lookup = useCallback(async (dni: string) => {
    if (!/^\d{8}$/.test(dni)) return
    setLooking(true)
    try {
      const r = await api<{ found: boolean; name: string | null; firstname: string | null; lastname: string | null }>(`/dni/${dni}`)
      if (r.found) {
        setForm((f) => ({ ...f, name: r.name ?? f.name, firstname: r.firstname ?? f.firstname, lastname: r.lastname ?? f.lastname }))
      } else {
        toast.warning("No se encontró el DNI; completa los nombres a mano")
      }
    } finally {
      setLooking(false)
    }
  }, [])

  useEffect(() => {
    if (!shipment) return
    const [name = "", firstname = "", ...rest] = (shipment.recipient_name ?? "").split(" ")
    setForm({
      dni: shipment.dni,
      name,
      firstname,
      lastname: rest.join(" "),
      phone: shipment.phone ?? "",
      package_content: shipment.package_content ?? "PAQUETE S",
      cantidad: "1",
    })
    lookup(shipment.dni)
  }, [shipment, lookup])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  const approve = async () => {
    if (!shipment) return
    setLoading(true)
    try {
      const { shipment: s } = await api<{ shipment: Shipment }>(`/shipments/${shipment.id}/approve`, {
        method: "POST",
        body: { ...form, cantidad: Number(form.cantidad) || 1 },
      })
      toast.success(s.guia ? `Guía ${s.guia} creada` : "Guía creada en Shalom")
      onDone()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Drawer open={!!shipment} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Aprobar envío · Pedido #{shipment?.order_display_id}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-auto">
          <div className="rounded-lg bg-ui-bg-subtle p-4">
            <Text size="small" weight="plus">Agencia destino</Text>
            <Text size="small">{shipment?.agency_name} (ter_id {shipment?.ter_id})</Text>
            <Text size="xsmall" className="text-ui-fg-subtle">{shipment?.agency_address}</Text>
            <Text size="xsmall" className="mt-2">Envío cobrado al cliente: {money(shipment?.shipping_amount ?? null)}</Text>
          </div>
          <div>
            <Label size="small">DNI de quien recoge</Label>
            <div className="flex gap-2">
              <Input value={form.dni} onChange={set("dni")} maxLength={8} />
              <Button variant="secondary" onClick={() => lookup(form.dni)} isLoading={looking}>
                Buscar
              </Button>
            </div>
          </div>
          <div>
            <Label size="small">Nombres</Label>
            <Input value={form.name} onChange={set("name")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label size="small">Apellido paterno</Label>
              <Input value={form.firstname} onChange={set("firstname")} />
            </div>
            <div>
              <Label size="small">Apellido materno</Label>
              <Input value={form.lastname} onChange={set("lastname")} />
            </div>
          </div>
          <div>
            <Label size="small">Teléfono (9 dígitos)</Label>
            <Input value={form.phone} onChange={set("phone")} />
          </div>
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <div>
              <Label size="small">Tipo de paquete</Label>
              <Select value={form.package_content} onValueChange={(v) => setForm({ ...form, package_content: v })}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {PACKAGES.map((p) => (
                    <Select.Item key={p} value={p}>{p}</Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div>
              <Label size="small">Bultos</Label>
              <Input type="number" min="1" value={form.cantidad} onChange={set("cantidad")} />
            </div>
          </div>
          <Text size="xsmall" className="text-ui-fg-muted">
            Se generará una clave de recojo de 4 dígitos; quedará en el pedido para enviársela al cliente.
          </Text>
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button variant="secondary">Cancelar</Button>
          </Drawer.Close>
          <Button onClick={approve} isLoading={loading}>
            Aprobar y crear guía
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

// ---------- pedidos ----------
function ShipmentsCard({ ready }: { ready: boolean }) {
  const [filter, setFilter] = useState<"pendiente" | "creada" | "">("pendiente")
  const [rows, setRows] = useState<Shipment[]>([])
  const [selected, setSelected] = useState<Shipment | null>(null)

  const load = useCallback(async () => {
    const { shipments } = await api<{ shipments: Shipment[] }>(`/shipments${filter ? `?status=${filter}` : ""}`)
    setRows(shipments)
  }, [filter])

  useEffect(() => {
    load().catch((e) => toast.error(e.message))
  }, [load])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Pedidos Shalom</Heading>
          <Text size="small" className="text-ui-fg-subtle">Revisa cada pedido y apruébalo para generar la guía.</Text>
        </div>
        <div className="flex gap-2">
          {[
            ["pendiente", "Por aprobar"],
            ["creada", "Con guía"],
            ["", "Todos"],
          ].map(([value, label]) => (
            <Button key={label} size="small" variant={filter === value ? "primary" : "secondary"} onClick={() => setFilter(value as any)}>
              {label}
            </Button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <Text className="text-ui-fg-subtle">No hay pedidos en esta vista.</Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Pedido</Table.HeaderCell>
              <Table.HeaderCell>Destinatario</Table.HeaderCell>
              <Table.HeaderCell>Agencia destino</Table.HeaderCell>
              <Table.HeaderCell>Paquete</Table.HeaderCell>
              <Table.HeaderCell>Envío</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
              <Table.HeaderCell>Guía</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((s) => (
              <Table.Row key={s.id}>
                <Table.Cell>
                  <a href={`/app/orders/${s.order_id}`} className="text-ui-fg-interactive hover:underline">
                    #{s.order_display_id}
                  </a>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex flex-col">
                    <span>{s.recipient_name ?? "—"}</span>
                    <span className="text-ui-fg-subtle txt-compact-xsmall">DNI {s.dni}</span>
                  </div>
                </Table.Cell>
                <Table.Cell className="max-w-[220px] truncate" title={s.agency_address ?? ""}>
                  {s.agency_name}
                </Table.Cell>
                <Table.Cell>{s.package_content}</Table.Cell>
                <Table.Cell>{money(s.shipping_amount)}</Table.Cell>
                <Table.Cell>
                  <StatusBadge color={STATUS[s.status].color} title={s.error ?? ""}>
                    {STATUS[s.status].label}
                  </StatusBadge>
                </Table.Cell>
                <Table.Cell>
                  {s.guia ? (
                    <div className="flex flex-col">
                      <span className="font-mono">{s.guia}</span>
                      <span className="text-ui-fg-subtle txt-compact-xsmall">
                        cód. {s.codigo ?? "—"} · clave {s.clave}
                      </span>
                    </div>
                  ) : (
                    "—"
                  )}
                </Table.Cell>
                <Table.Cell>
                  {(s.status === "pendiente" || s.status === "error") && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="small"
                        variant="transparent"
                        onClick={async () => {
                          if (!window.confirm(`¿Descartar el envío del pedido #${s.order_display_id}?`)) return
                          await api(`/shipments/${s.id}/discard`, { method: "POST" }).catch((e) => toast.error(e.message))
                          load()
                        }}
                      >
                        Descartar
                      </Button>
                      <Button size="small" disabled={!ready} onClick={() => setSelected(s)}>
                        Aprobar
                      </Button>
                    </div>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
      <ApproveDrawer
        shipment={selected}
        onClose={() => setSelected(null)}
        onDone={() => {
          setSelected(null)
          load()
        }}
      />
    </Container>
  )
}

// ---------- pagina ----------
const ShalomPage = () => {
  const [data, setData] = useState<{
    settings: Settings
    api: { valid: boolean; error?: string }
    instance: { connected: boolean; username?: string | null }
  } | null>(null)

  const load = useCallback(() => {
    api<any>("/settings").then(setData).catch((e) => toast.error(e.message))
  }, [])

  useEffect(load, [load])

  if (!data) {
    return (
      <Container>
        <Text>Cargando Shalom…</Text>
      </Container>
    )
  }

  const ready = !!data.settings.origin_ter_id && data.instance.connected

  return (
    <div className="flex flex-col gap-4">
      <Toaster />
      <Container className="flex items-center justify-between">
        <div>
          <Heading>Envíos Shalom</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Delivery a agencias Shalom con tarifa en vivo y guías automáticas.
          </Text>
        </div>
        <StatusBadge color={data.api.valid ? "green" : "red"}>
          {data.api.valid ? "API conectada" : `API: ${data.api.error ?? "inválida"}`}
        </StatusBadge>
      </Container>
      {!ready && (
        <Container className="border-ui-tag-orange-border bg-ui-tag-orange-bg">
          <Text size="small">
            Para aprobar pedidos y crear guías completa la sede central y conecta tu cuenta Shalom Pro.
          </Text>
        </Container>
      )}
      <ShipmentsCard ready={ready} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <OriginCard settings={data.settings} onSaved={load} />
        <AccountCard instance={data.instance} onSaved={load} />
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Shalom",
  icon: TruckFast,
})

export default ShalomPage
