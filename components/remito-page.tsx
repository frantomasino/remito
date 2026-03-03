"use client"

import { createClient } from "@/lib/supabase/client"
import { useState, useRef, useCallback, useEffect, useMemo, startTransition } from "react"
import { Printer, Eye, FileText, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ClientForm } from "@/components/client-form"
import { ProductSelector } from "@/components/product-selector"
import { RemitoPrint } from "@/components/remito-print"
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

const LS_BASE_KEYS = {
  priceListId: "priceListId",
  salesHistory: "salesHistory",
  nextNumber: "nextNumber",
  lastDay: "lastDay",
} as const

function k(base: string, userId: string) {
  return `${base}:${userId}`
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)

export default function RemitoPage() {
  const [userId, setUserId] = useState<string>("")

  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<LineItem[]>([])
  const [client, setClient] = useState<ClientData>(defaultClient)
  const [nextNumber, setNextNumber] = useState(1)
  const [showPreview, setShowPreview] = useState(false)
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([])

  const [priceListId, setPriceListId] = useState<PriceListId>("minorista")
  const remitoDateRef = useRef<string>(getTodayDateSafe())

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // ✅ obtener userId (para separar localStorage por usuario)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? "")
    })
  }, [])

  // ✅ restore + reset diario (POR USUARIO) — sin migración
  useEffect(() => {
    if (!userId) return

    try {
      const today = getTodayDateSafe()

      const salesKey = k(LS_BASE_KEYS.salesHistory, userId)
      const nextKey = k(LS_BASE_KEYS.nextNumber, userId)
      const listKey = k(LS_BASE_KEYS.priceListId, userId)
      const lastDayKey = k(LS_BASE_KEYS.lastDay, userId)

      // reset diario por usuario
      const lastDay = localStorage.getItem(lastDayKey)
      if (lastDay && lastDay !== today) {
        localStorage.removeItem(salesKey)
        setSalesHistory([])
      }
      localStorage.setItem(lastDayKey, today)

      // restore lista
      const savedList = localStorage.getItem(listKey) as PriceListId | null
      if (savedList === "minorista" || savedList === "mayorista" || savedList === "oferta") {
        setPriceListId(savedList)
      }

      // restore next
      const savedNext = localStorage.getItem(nextKey)
      if (savedNext) {
        const n = Number(savedNext)
        if (Number.isFinite(n) && n > 0) setNextNumber(n)
      }

      // restore history
      const savedHistory = localStorage.getItem(salesKey)
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory) as SaleRecord[]
        if (Array.isArray(parsed)) setSalesHistory(parsed)
      }
    } catch {
      // nada
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    try {
      localStorage.setItem(k(LS_BASE_KEYS.priceListId, userId), priceListId)
    } catch {}
  }, [priceListId, userId])

  useEffect(() => {
    if (!userId) return
    try {
      localStorage.setItem(k(LS_BASE_KEYS.nextNumber, userId), String(nextNumber))
    } catch {}
  }, [nextNumber, userId])

  // ✅ load products (Google Sheets)
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
    [remitoNumero, client, items, total],
  )

  const canPrint = items.length > 0

  // ✅ guardar historial EN EL MOMENTO de agregar el remito (POR USUARIO)
  const recordSale = useCallback(() => {
    if (!userId) return

    const record: SaleRecord = {
      id: crypto.randomUUID(),
      numero: remitoData.numero,
      fecha: remitoData.fecha,
      cliente: remitoData.client.nombre,
      formaPago: remitoData.client.formaPago || "Sin especificar",
      total: remitoData.total,
      itemCount: remitoData.items.length,
    }

    setSalesHistory((prev) => {
      const next = [record, ...prev]
      try {
        localStorage.setItem(k(LS_BASE_KEYS.salesHistory, userId), JSON.stringify(next))
      } catch {}
      return next
    })
  }, [remitoData, userId])

  // ✅ CLAVE: avanzar consecutivo y resetear ANTES de imprimir (no depender de afterprint)
  const advanceAndReset = useCallback(() => {
    setNextNumber((n) => {
      const next = n + 1
      try {
        if (userId) localStorage.setItem(k(LS_BASE_KEYS.nextNumber, userId), String(next))
      } catch {}
      return next
    })

    setClient(defaultClient)
    setItems([])
    remitoDateRef.current = getTodayDateSafe()
  }, [userId])

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
    advanceAndReset()

    if (isIOS()) {
      openIOSPrintWindow()
      return
    }

    window.print()
  }, [canPrint, recordSale, advanceAndReset, openIOSPrintWindow])

  const handlePreviewPrint = useCallback(() => {
    if (!canPrint) return

    setShowPreview(false)
    recordSale()
    advanceAndReset()

    if (isIOS()) {
      openIOSPrintWindow()
      return
    }

    window.print()
  }, [canPrint, recordSale, advanceAndReset, openIOSPrintWindow])

  const handleNewRemito = useCallback(() => {
    setClient(defaultClient)
    setItems([])
  }, [])

  const handleClearItems = useCallback(() => {
    setItems([])
  }, [])

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
          <DialogContent
            className="
              fixed left-1/2 top-1/2 z-50
              flex flex-col
              w-[calc(100vw-16px)] sm:w-full
              max-w-none sm:max-w-4xl
              h-[calc(100vh-16px)] sm:h-auto
              max-h-[calc(100vh-16px)] sm:max-h-[90vh]
              -translate-x-1/2 -translate-y-1/2
              p-0
              overflow-hidden
            "
          >
            <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
              <DialogTitle>Vista Previa del Remito</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="border rounded-lg overflow-hidden bg-white">
                <RemitoPrint data={remitoData} />
              </div>
            </div>

            <div className="sticky bottom-0 border-t bg-card/95 backdrop-blur px-4 py-3 sm:px-6">
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Cerrar
                </Button>
                <Button onClick={handlePreviewPrint}>
                  <Printer className="size-4" />
                  Imprimir
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div id="printable-remito">
        <RemitoPrint data={remitoData} />
      </div>
    </>
  )
}