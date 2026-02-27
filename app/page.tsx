"use client"

import { useState, useRef, useCallback, useEffect, useMemo, startTransition } from "react"
import { Printer, Eye, FileText, RotateCcw, Trash2 } from "lucide-react"
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

const defaultClient: ClientData = {
  nombre: "",
  direccion: "",
  telefono: "",
  mail: "",
  formaPago: "",
}

// ✅ Evita state extra para fecha (y re-renders). La fecha se “congela” por remito.
// Si querés que cambie en vivo al pasar de día sin recargar, ahí sí conviene state.
function getTodayDateSafe(): string {
  return new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export default function RemitoPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<LineItem[]>([])
  const [client, setClient] = useState<ClientData>(defaultClient)
  const [nextNumber, setNextNumber] = useState(1)
  const [showPreview, setShowPreview] = useState(false)
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([])

  // ✅ Congelar fecha del remito actual sin depender de “mounted”
  const remitoDateRef = useRef<string>(getTodayDateSafe())

  // ✅ Manejo de impresión robusto (sin timeouts)
  const printIntentRef = useRef<null | "print" | "preview">(null)

  // (Si realmente lo necesitás para evitar mismatch por alguna razón, dejalo.
  // En general, acá no estás usando nada que rompa SSR/hidratación)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_PRODUCTS_CSV_URL
    if (!url) return

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

        // ✅ startTransition: evita “tironeo” si el CSV es grande
        startTransition(() => setProducts(loaded))

        // ✅ logs solo en dev
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.log("PRODUCTOS:", loaded.length)
          // eslint-disable-next-line no-console
          console.log("CÓDIGOS ÚNICOS:", new Set(loaded.map((p) => p.codigo)).size)
        }
      } catch (e) {
        if ((e as any)?.name === "AbortError") return
        console.error("No se pudieron cargar productos desde Google Sheets", e)
      }
    }

    load()
    return () => controller.abort()
  }, [])

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
    // ✅ Evita depender de mil deps: usa lo que ya está memoizado
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
      // ✅ Solo resetea si realmente disparaste una impresión desde acá
      if (!printIntentRef.current) return
      printIntentRef.current = null
      resetForNext()
    }

    window.addEventListener("afterprint", onAfterPrint)
    return () => window.removeEventListener("afterprint", onAfterPrint)
  }, [resetForNext])

  const handlePrint = useCallback(() => {
    if (!canPrint) return
    recordSale()
    printIntentRef.current = "print"
    window.print()
  }, [canPrint, recordSale])

  const handlePreviewPrint = useCallback(() => {
    if (!canPrint) return
    setShowPreview(false)
    recordSale()
    printIntentRef.current = "preview"
    window.print()
  }, [canPrint, recordSale])

  const handleNewRemito = useCallback(() => {
    setClient(defaultClient)
    setItems([])
    // ❗ No tocamos número ni fecha: “Nuevo remito” acá era limpiar el actual.
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
              <div className="flex items-center gap-4">
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
              </div>

              {items.length > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(total)}</p>
                </div>
              )}
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

        {/* Footer móvil fijo */}
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

      {/* ✅ Importante: mantené este bloque para print */}
      <div id="printable-remito">
        <RemitoPrint data={remitoData} />
      </div>
    </>
  )
}