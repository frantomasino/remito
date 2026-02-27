export interface Product {
  codigo: string
  descripcion: string
  precio: number
}

export interface LineItem {
  product: Product
  cantidad: number
  subtotal: number
}

export interface ClientData {
  nombre: string
  direccion: string
  telefono: string
  mail: string
  formaPago: string
}

export interface RemitoData {
  numero: string
  fecha: string
  client: ClientData
  items: LineItem[]
  subtotal: number
  total: number
}

export interface SaleRecord {
  id: string
  numero: string
  fecha: string
  cliente: string
  formaPago: string
  total: number
  itemCount: number
}

export function parseCSV(text: string): Product[] {
  const lines = text.trim().split("\n")
  if (lines.length < 2) return []

  const header = lines[0].toLowerCase()
  const separator = header.includes("\t") ? "\t" : header.includes(";") ? ";" : ","

  const headers = lines[0].split(separator).map((h) => h.trim().toLowerCase().replace(/"/g, ""))

  const codigoIdx = headers.findIndex((h) =>
    h.includes("codigo") || h.includes("código") || h.includes("cod") || h.includes("id") || h.includes("sku")
  )
  const descripcionIdx = headers.findIndex((h) =>
    h.includes("descripcion") || h.includes("descripción") || h.includes("nombre") || h.includes("producto") || h.includes("detalle")
  )
  const precioIdx = headers.findIndex((h) =>
    h.includes("precio") || h.includes("price") || h.includes("valor") || h.includes("importe") || h.includes("costo")
  )

  if (descripcionIdx === -1 || precioIdx === -1) {
    return []
  }

  const products: Product[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = line.split(separator).map((c) => c.trim().replace(/"/g, ""))

    const codigo = codigoIdx >= 0 ? cols[codigoIdx] || "" : String(i)
    const descripcion = cols[descripcionIdx] || ""
    const precioRaw = cols[precioIdx] || "0"
    const precio = parseFloat(precioRaw.replace(/[$.]/g, "").replace(",", ".")) || 0

    if (descripcion && precio > 0) {
      products.push({ codigo, descripcion, precio })
    }
  }

  return products
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatRemitoNumber(n: number): string {
  const punto = "00001"
  const numero = String(n).padStart(8, "0")
  return `${punto}-${numero}`
}

export function getTodayDate(): string {
  return new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}
