"use client"

import { Trash2, DollarSign, CreditCard, Banknote, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type SaleRecord, formatCurrency } from "@/lib/remito-types"

interface SalesHistoryProps {
  records: SaleRecord[]
  onClear: () => void
}

export function SalesHistory({ records, onClear }: SalesHistoryProps) {
  const [expanded, setExpanded] = useState(true)

  const totalEfectivo = records
    .filter((r) => r.formaPago === "Efectivo")
    .reduce((s, r) => s + r.total, 0)

  const totalMercadoPago = records
    .filter((r) => r.formaPago === "Mercado Pago")
    .reduce((s, r) => s + r.total, 0)

  const totalGeneral = records.reduce((s, r) => s + r.total, 0)

  if (records.length === 0) return null

  return (
    <section className="rounded-xl bg-card border p-5">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 cursor-pointer bg-transparent border-none p-0"
          aria-expanded={expanded}
          aria-controls="sales-history-content"
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            <DollarSign className="size-4" />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Historial de Ventas ({records.length})
          </h2>
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>
        <Button variant="outline" size="sm" onClick={onClear}>
          <Trash2 className="size-3.5" />
          Limpiar
        </Button>
      </div>

      {expanded && (
        <div id="sales-history-content" className="flex flex-col gap-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-green-100">
                <Banknote className="size-5 text-green-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Efectivo</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(totalEfectivo)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100">
                <CreditCard className="size-5 text-blue-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mercado Pago</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(totalMercadoPago)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total General</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(totalGeneral)}</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="max-h-64 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Nro. Remito</TableHead>
                  <TableHead className="text-xs">Fecha</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Forma de Pago</TableHead>
                  <TableHead className="text-xs text-center">Items</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-xs font-mono">{record.numero}</TableCell>
                    <TableCell className="text-xs">{record.fecha}</TableCell>
                    <TableCell className="text-xs">{record.cliente}</TableCell>
                    <TableCell className="text-xs">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          record.formaPago === "Efectivo"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {record.formaPago === "Efectivo" ? (
                          <Banknote className="size-3" />
                        ) : (
                          <CreditCard className="size-3" />
                        )}
                        {record.formaPago}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-center">{record.itemCount}</TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      {formatCurrency(record.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </section>
  )
}
