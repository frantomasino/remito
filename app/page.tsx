"use client"

import { useState, useRef, useCallback, useEffect, useMemo, startTransition } from "react"
import { Printer, Eye, FileText, RotateCcw, Trash2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ClientForm } from "@/components/client-form"
import { ProductSelector } from "@/components/product-selector"
import { RemitoPrint } from "@/components/remito-print"
import { SalesHistory } from "@/components/sales-history"
import {
  type Product,
  type LineItem,
  type ClientData,
  type RemitoData,
  type SaleRecord,
  formatRemitoNumber,
  formatCurrency,
  parseCSV,
} from "@/lib/remito-types"

type PriceListId = "minorista" | "mayorista" | "oferta"

const PRICE_LISTS: { id: PriceListId; label: string; url?: string }[] = [
  { id: "minorista", label: "Minorista", url: process.env.NEXT_PUBLIC_LISTA_MINORISTA_URL },
  { id: "mayorista", label: "Mayorista", url: process.env.NEXT_PUBLIC_LISTA_MAYORISTA_URL },
  { id: "oferta", label: "Oferta", url: process.env.NEXT_PUBLIC_LISTA_OFERTA_URL },
]

const defaultClient: ClientData = {
  nombre: "",
  direccion: "",
  telefono: "",
  mail: "",
  formaPago: "",
}

function getTodayDateSafe(): string {
  return new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const LS_KEYS = {
  priceListId: "priceListId",
  salesHistory: "salesHistory",
  nextNumber: "nextNumber",
  lastDay: "lastDay",
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)

export default function RemitoPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<LineItem[]>([])
  const [client, setClient] = useState<ClientData>(defaultClient)
  const [nextNumber, setNextNumber] = useState(1)
  const [showPreview, setShowPreview] = useState(false)
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([])

  const [priceListId, setPriceListId] = useState<PriceListId>("minorista")
  const remitoDateRef = useRef<string>(getTodayDateSafe())
  const printIntentRef = useRef<null | "print" | "preview">(null)

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // ✅ restore + reset diario
  useEffect(() => {
    try {
      const today = getTodayDateSafe()
      const lastDay = localStorage.getItem(LS_KEYS.lastDay)

      if (lastDay && lastDay !== today) {
        localStorage.removeItem(LS_KEYS.salesHistory)
        setSalesHistory([])
      }

      localStorage.setItem(LS_KEYS.lastDay, today)

      const savedList = localStorage.getItem(LS_KEYS.priceListId) as PriceListId | null
      if (savedList === "minorista" || savedList === "mayorista" || savedList === "oferta") {
        setPriceListId(savedList)
      }

      const savedNext = localStorage.getItem(LS_KEYS.nextNumber)
      if (savedNext) {
        const n = Number(savedNext)
        if (Number.isFinite(n) && n > 0) setNextNumber(n)
      }

      const savedHistory = localStorage.getItem(LS_KEYS.salesHistory)
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory) as SaleRecord[]
        if (Array.isArray(parsed)) setSalesHistory(parsed)
      }
    } catch {
      // nada
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.priceListId, priceListId)
    } catch {}
  }, [priceListId])

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.nextNumber, String(nextNumber))
    } catch {}
  }, [nextNumber])

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.salesHistory, JSON.stringify(salesHistory))
    } catch {}
  }, [salesHistory])

  // ✅ load products
  useEffect(() => {
    const selected = PRICE_LISTS.find((x) => x.id === priceListId)
    const url = selected?.url

    if (!url) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`Falta la env para la lista "${priceListId}". Revisá NEXT_PUBLIC_LISTA_*_URL`)
      }
      return
    }

    const controller = new AbortController()

    const load = async () => {
      try {
        const res = await fetch(`/api/products-csv?url=${encodeURIComponent(url)}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!res.ok) throw new Error("No se pudo traer el CSV/TSV")

        const text = await res.text()
        const loaded = parseCSV(text)
        startTransition(() => setProducts(loaded))
      } catch (e) {
        if ((e as any)?.name === "AbortError") return
        console.error("No se pudieron cargar productos desde Google Sheets", e)
      }
    }

    load()
    return () => controller.abort()
  }, [priceListId])

  const remitoNumero = useMemo(() => formatRemitoNumber(nextNumber), [nextNumber])
  const total = useMemo(() => items.reduce((s, i) => s + i.subtotal, 0), [items])

  const remitoData: RemitoData = useMemo(
    () => ({
      numero: remitoNumero,
      fecha: remitoDateRef.current,
      client,
      items,
      subtotal: total,
      total,
    }),
    [remitoNumero, client, items, total]
  )

  const canPrint = items.length > 0

  const recordSale = useCallback(() => {
    const record: SaleRecord = {
      id: crypto.randomUUID(),
      numero: remitoData.numero,
      fecha: remitoData.fecha,
      cliente: remitoData.client.nombre,
      formaPago: remitoData.client.formaPago || "Sin especificar",
      total: remitoData.total,
      itemCount: remitoData.items.length,
    }
    setSalesHistory((prev) => [record, ...prev])
  }, [remitoData])

  const resetForNext = useCallback(() => {
    setNextNumber((n) => n + 1)
    setClient(defaultClient)
    setItems([])
    remitoDateRef.current = getTodayDateSafe()
  }, [])

  useEffect(() => {
    const onAfterPrint = () => {
      if (!printIntentRef.current) return
      printIntentRef.current = null
      resetForNext()
    }
    window.addEventListener("afterprint", onAfterPrint)
    return () => window.removeEventListener("afterprint", onAfterPrint)
  }, [resetForNext])

  // ✅ iOS fix: abrir ventana con botón "Imprimir" (gesto real)
  const openIOSPrintWindow = useCallback(() => {
    const printable = document.getElementById("printable-remito")
    if (!printable) return

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join("\n")

    const win = window.open("", "_blank")
    if (!win) return

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Imprimir Remito</title>
${styles}
<style>
  body { margin: 0; background: #f5f5f5; }
  .topbar{
    position: sticky; top:0; z-index:10;
    display:flex; gap:10px; justify-content:flex-end; align-items:center;
    padding:12px; background:#fff; border-bottom:1px solid #ddd;
  }
  .btn{
    font-size:16px; padding:10px 14px; border-radius:10px;
    border:1px solid #ccc; background:#fff;
  }
  .btn-primary{ background:#0f172a; color:#fff; border-color:#0f172a; }
  .sheet{ padding:12px; }
  /* fuerza visible */
  #printable-remito{ display:block !important; background:#fff !important; }
</style>
</head>
<body>
  <div class="topbar">
    <button class="btn" id="btnClose">Cerrar</button>
    <button class="btn btn-primary" id="btnPrint">Imprimir</button>
  </div>
  <div class="sheet">
    ${printable.outerHTML}
  </div>
  <script>
    document.getElementById("btnPrint").addEventListener("click", () => window.print());
    document.getElementById("btnClose").addEventListener("click", () => window.close());
  </script>
</body>
</html>`

    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()
  }, [])

  const handlePrint = useCallback(() => {
    if (!canPrint) return
    recordSale()
    printIntentRef.current = "print"

    if (isIOS()) {
      openIOSPrintWindow()
      // en iOS puede no disparar afterprint, no reseteamos automáticamente
      return
    }

    window.print()
  }, [canPrint, recordSale, openIOSPrintWindow])

  const handlePreviewPrint = useCallback(() => {
    if (!canPrint) return
    setShowPreview(false)
    recordSale()
    printIntentRef.current = "preview"

    if (isIOS()) {
      openIOSPrintWindow()
      return
    }

    window.print()
  }, [canPrint, recordSale, openIOSPrintWindow])

  const handleNewRemito = useCallback(() => {
    setClient(defaultClient)
    setItems([])
  }, [])

  const handleClearItems = useCallback(() => {
    setItems([])
  }, [])

  const downloadTodaySalesCSV = useCallback(() => {
    const today = getTodayDateSafe()
    const todays = salesHistory.filter((r) => r.fecha === today)

    const escapeCSV = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`
    const header = ["Nro Remito", "Fecha", "Cliente", "Total"]

    const rows = todays.map((r) => [escapeCSV(r.numero), escapeCSV(r.fecha), escapeCSV(r.cliente || ""), String(r.total)])

    const totalHoy = todays.reduce((s, r) => s + r.total, 0)
    rows.push(["", "", escapeCSV("TOTAL DEL DÍA"), String(totalHoy)])

    const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })

    const safeDate = today.replaceAll("/", "-")
    const filename = `ventas-${safeDate}.csv`

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [salesHistory])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
            <FileText className="size-5 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div id="screen-ui" className="min-h-screen bg-background overflow-x-hidden">
        <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 lg:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
                <FileText className="size-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">Generador de Remitos</h1>
                <p className="text-xs text-muted-foreground">Crea comprobantes para tus clientes</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleNewRemito}>
                <RotateCcw className="size-4" />
                <span className="hidden sm:inline">Nuevo Remito</span>
              </Button>

              <Button variant="outline" size="sm" disabled={!canPrint} onClick={() => setShowPreview(true)}>
                <Eye className="size-4" />
                <span className="hidden sm:inline">Vista Previa</span>
              </Button>

              <Button size="sm" onClick={handlePrint} disabled={!canPrint}>
                <Printer className="size-4" />
                <span className="hidden sm:inline">Imprimir</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6 lg:px-6 pb-24 overflow-x-hidden">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-card border p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Comprobante</p>
                  <p className="text-lg font-bold font-mono text-foreground">
                    {"N\u00BA"} {remitoNumero}
                  </p>
                </div>

                <div className="h-8 w-px bg-border" />

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha</p>
                  <p className="text-sm font-semibold text-foreground">{remitoDateRef.current}</p>
                </div>

                <div className="h-8 w-px bg-border hidden sm:block" />

                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Lista</span>
                  <select
                    className="border rounded px-3 py-2 text-sm bg-background"
                    value={priceListId}
                    onChange={(e) => setPriceListId(e.target.value as PriceListId)}
                  >
                    {PRICE_LISTS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {items.length > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(total)}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={downloadTodaySalesCSV} disabled={salesHistory.length === 0}>
                <Download className="size-4" />
                Descargar ventas de hoy
              </Button>
            </div>

            <SalesHistory records={salesHistory} onClear={() => setSalesHistory([])} />

            <section className="rounded-xl bg-card border p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </span>
                <h2 className="text-base font-semibold text-foreground">Datos del Cliente</h2>
              </div>
              <ClientForm data={client} onChange={setClient} />
            </section>

            <section className="rounded-xl bg-card border p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  3
                </span>
                <h2 className="text-base font-semibold text-foreground">Seleccionar Productos</h2>
              </div>
              <ProductSelector products={products} items={items} onItemsChange={setItems} />
            </section>

            {canPrint && (
              <div className="hidden sm:flex justify-end gap-3 pb-8">
                <Button variant="outline" size="lg" onClick={() => setShowPreview(true)}>
                  <Eye className="size-4" />
                  Vista Previa
                </Button>
                <Button size="lg" onClick={handlePrint}>
                  <Printer className="size-4" />
                  Imprimir Remito
                </Button>
              </div>
            )}
          </div>
        </main>

        <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 backdrop-blur sm:hidden">
          <div className="px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground leading-none">Total</p>
              <p className="text-[14px] font-bold text-primary tabular-nums truncate max-w-[42vw] leading-tight">
                {formatCurrency(total)}
              </p>
            </div>

            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="outline"
                size="icon"
                disabled={items.length === 0}
                onClick={handleClearItems}
                aria-label="Vaciar"
                className="h-9 w-9"
              >
                <Trash2 className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                disabled={!canPrint}
                onClick={() => setShowPreview(true)}
                aria-label="Ver"
                className="h-9 w-9"
              >
                <Eye className="size-4" />
              </Button>

              <Button size="icon" disabled={!canPrint} onClick={handlePrint} aria-label="Imprimir" className="h-9 w-9">
                <Printer className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="w-[100vw] h-[100vh] max-w-none sm:max-w-4xl sm:max-h-[90vh] overflow-y-auto p-0 sm:p-6">
            <DialogHeader>
              <DialogTitle>Vista Previa del Remito</DialogTitle>
            </DialogHeader>

            <div className="p-4 sm:p-0">
              <div className="border rounded-lg overflow-hidden bg-white">
                <RemitoPrint data={remitoData} />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-4 pb-4 sm:px-0 sm:pb-0">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Cerrar
              </Button>
              <Button onClick={handlePreviewPrint}>
                <Printer className="size-4" />
                Imprimir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Printable: queda oculto en pantalla por CSS, se muestra en @media print */}
      <div id="printable-remito">
        <RemitoPrint data={remitoData} />
      </div>
    </>
  )
}