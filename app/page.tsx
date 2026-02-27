"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Printer, Eye, FileText, RotateCcw } from "lucide-react"
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
  const [mounted, setMounted] = useState(false)
  const [todayDate, setTodayDate] = useState("")
  const printRef = useRef<HTMLDivElement>(null)

  // 1) Mount + fecha
  useEffect(() => {
    setMounted(true)
    setTodayDate(getTodayDateSafe())
  }, [])

  // 2) ✅ Cargar productos AUTOMÁTICAMENTE desde Google Sheets (CSV)
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_PRODUCTS_CSV_URL
    if (!url) return

    const load = async () => {
      try {
        const res = await fetch(`/api/products-csv?url=${encodeURIComponent(url)}`, {
          cache: "no-store",
        })
        if (!res.ok) throw new Error("No se pudo traer el CSV")

        const text = await res.text()
        const loaded = parseCSV(text)
        setProducts(loaded)
      } catch (e) {
        console.error("No se pudieron cargar productos desde Google Sheets", e)
      }
    }

    load()
  }, [])

  const remitoNumero = formatRemitoNumber(nextNumber)
  const total = items.reduce((s, i) => s + i.subtotal, 0)

  const remitoData: RemitoData = {
    numero: remitoNumero,
    fecha: todayDate,
    client,
    items,
    subtotal: total,
    total,
  }

  const recordSale = useCallback(() => {
    const record: SaleRecord = {
      id: crypto.randomUUID(),
      numero: remitoNumero,
      fecha: todayDate,
      cliente: client.nombre,
      formaPago: client.formaPago || "Sin especificar",
      total,
      itemCount: items.length,
    }
    setSalesHistory((prev) => [record, ...prev])
  }, [remitoNumero, todayDate, client.nombre, client.formaPago, total, items.length])

  const handlePrint = useCallback(() => {
    recordSale()
    setTimeout(() => window.print(), 200)
    setTimeout(() => {
      setNextNumber((n) => n + 1)
      setClient(defaultClient)
      setItems([])
      setTodayDate(getTodayDateSafe())
    }, 500)
  }, [recordSale])

  const handlePreviewPrint = useCallback(() => {
    setShowPreview(false)
    recordSale()
    setTimeout(() => window.print(), 200)
    setTimeout(() => {
      setNextNumber((n) => n + 1)
      setClient(defaultClient)
      setItems([])
      setTodayDate(getTodayDateSafe())
    }, 500)
  }, [recordSale])

  const handleNewRemito = () => {
    setClient(defaultClient)
    setItems([])
  }

  // ✅ NO obligatorio cliente
  const canPrint = items.length > 0

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
      {/* Screen UI - hidden when printing */}
      <div id="screen-ui" className="min-h-screen bg-background">
        {/* Header */}
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

        {/* Main Content */}
        <main className="mx-auto max-w-5xl px-4 py-6 lg:px-6 pb-24">
          <div className="flex flex-col gap-6">
            {/* Remito Number & Info Bar */}
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
                  <p className="text-sm font-semibold text-foreground">{todayDate}</p>
                </div>
              </div>

              {items.length > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(total)}</p>
                </div>
              )}
            </div>

            {/* Sales History */}
            <SalesHistory records={salesHistory} onClear={() => setSalesHistory([])} />

            {/* Step 2: Client Data */}
            <section className="rounded-xl bg-card border p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </span>
                <h2 className="text-base font-semibold text-foreground">Datos del Cliente</h2>
              </div>
              <ClientForm data={client} onChange={setClient} />
            </section>

            {/* Step 3: Select Products */}
            <section className="rounded-xl bg-card border p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  3
                </span>
                <h2 className="text-base font-semibold text-foreground">Seleccionar Productos</h2>
              </div>
              <ProductSelector products={products} items={items} onItemsChange={setItems} />
            </section>

            {/* Print button bottom (desktop) */}
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

        {/* ✅ Barra inferior fija (solo móvil) */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur sm:hidden">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex flex-col leading-tight">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" disabled={!canPrint} onClick={() => setShowPreview(true)}>
                <Eye className="size-4" />
                Ver
              </Button>
              <Button disabled={!canPrint} onClick={handlePrint}>
                <Printer className="size-4" />
                Imprimir
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
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
            <div className="flex justify-end gap-2">
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

      {/* Printable remito - hidden on screen, shown only for print */}
      <div id="printable-remito">
        <RemitoPrint ref={printRef} data={remitoData} />
      </div>
    </>
  )
}