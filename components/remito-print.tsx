"use client"

import { forwardRef } from "react"
import type { RemitoData } from "@/lib/remito-types"
import { formatCurrency } from "@/lib/remito-types"

interface RemitoPrintProps {
  data: RemitoData
}

export const RemitoPrint = forwardRef<HTMLDivElement, RemitoPrintProps>(function RemitoPrint(
  { data },
  ref
) {
  // Mantiene una altura estable en la tabla (para que no "salte" al agregar/quitar items)
  // y para que el remito siempre se vea como una grilla pre-armada.
  const MAX_ROWS = 12

  const total = data.items.reduce((s, i) => s + i.subtotal, 0)
  const rows = data.items.slice(0, MAX_ROWS)
  const emptyCount = Math.max(0, MAX_ROWS - rows.length)

  return (
    <div ref={ref} className="remito-print bg-card text-card-foreground" id="remito-print">
      <div className="mx-auto max-w-[800px] p-6 font-sans text-[13px] leading-relaxed">
        {/* Header */}
        <div className="flex items-stretch border-2 border-foreground">
          {/* Left - Title */}
          <div className="flex flex-1 items-center justify-center border-r-2 border-foreground p-4">
            <h1 className="text-xl font-bold tracking-tight text-foreground">COMPROBANTE</h1>
          </div>

          {/* Center - X mark */}
          <div className="flex items-center justify-center border-r-2 border-foreground px-4 py-4">
            <div className="flex size-12 items-center justify-center rounded border-2 border-foreground text-2xl font-bold text-foreground">
              X
            </div>
          </div>

          {/* Right - Number & Date */}
          <div className="flex flex-1 flex-col justify-center p-4">
            <p className="text-sm font-bold text-foreground">
              {"N\u00BA"} {data.numero}
            </p>
            <p className="text-sm font-semibold text-foreground">FECHA: {data.fecha}</p>
          </div>
        </div>

        {/* Client Info */}
        <div className="border-x-2 border-b-2 border-foreground">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3 text-[12px]">
            <div>
              <span className="font-semibold text-foreground">NOMBRE: </span>
              <span className="text-foreground">{data.client.nombre}</span>
            </div>
            <div>
              <span className="font-semibold text-foreground">TELEFONO: </span>
              <span className="text-foreground">{data.client.telefono}</span>
            </div>
            <div>
              <span className="font-semibold text-foreground">DIRECCION: </span>
              <span className="text-foreground">{data.client.direccion}</span>
            </div>
            <div>
              <span className="font-semibold text-foreground">MAIL: </span>
              <span className="text-foreground">{data.client.mail}</span>
            </div>
            <div className="col-span-2">
              <span className="font-semibold text-foreground">FORMA DE PAGO: </span>
              <span className="text-foreground">{data.client.formaPago}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="border-x-2 border-b-2 border-foreground">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b-2 border-foreground bg-muted/30">
                <th className="border-r border-foreground px-3 py-2 text-left font-semibold text-foreground">
                  Descripcion
                </th>
                <th className="border-r border-foreground px-3 py-2 text-center font-semibold text-foreground w-16">
                  Cant.
                </th>
                <th className="border-r border-foreground px-3 py-2 text-right font-semibold text-foreground w-28">
                  Precio Uni.
                </th>
                <th className="px-3 py-2 text-right font-semibold text-foreground w-28">Sub Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, idx) => (
                <tr key={idx} className="h-8 border-b border-foreground/30">
                  <td className="border-r border-foreground/30 px-3 py-1.5 text-foreground">
                    <span className="font-mono text-muted-foreground">{item.product.codigo}</span>
                    {" - "}
                    {item.product.descripcion}
                  </td>
                  <td className="border-r border-foreground/30 px-3 py-1.5 text-center text-foreground">
                    {item.cantidad.toFixed(2)}
                  </td>
                  <td className="border-r border-foreground/30 px-3 py-1.5 text-right text-foreground">
                    {formatCurrency(item.product.precio)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium text-foreground">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
              {/* Empty rows to fill space */}
              {Array.from({ length: emptyCount }).map((_, idx) => (
                <tr key={`empty-${idx}`} className="h-8 border-b border-foreground/10">
                  <td className="border-r border-foreground/10 px-3 py-1.5">&nbsp;</td>
                  <td className="border-r border-foreground/10 px-3 py-1.5">&nbsp;</td>
                  <td className="border-r border-foreground/10 px-3 py-1.5">&nbsp;</td>
                  <td className="px-3 py-1.5">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-x-2 border-b-2 border-foreground">
          <div className="flex justify-end p-3 gap-8">
            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex items-center gap-6">
                <span className="font-semibold text-foreground">SUBTOTAL:</span>
                <span className="text-foreground min-w-24 text-right">{formatCurrency(total)}</span>
              </div>
              <div className="flex items-center gap-6 text-base font-bold border-t border-foreground pt-1">
                <span className="text-foreground">TOTAL:</span>
                <span className="text-foreground min-w-24 text-right">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-[10px] text-muted-foreground">
          <p>Generado por Sistema de Remitos</p>
        </div>
      </div>
    </div>
  )
})
