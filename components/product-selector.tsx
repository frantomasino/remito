"use client"

import { useState } from "react"
import { Plus, Trash2, Search, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type Product, type LineItem, formatCurrency } from "@/lib/remito-types"

interface ProductSelectorProps {
  products: Product[]
  items: LineItem[]
  onItemsChange: (items: LineItem[]) => void
}

export function ProductSelector({ products, items, onItemsChange }: ProductSelectorProps) {
  const [search, setSearch] = useState("")

  const filtered = products.filter(
    (p) =>
      p.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo.toLowerCase().includes(search.toLowerCase())
  )

  const addItem = (product: Product) => {
    const existing = items.find((i) => i.product.codigo === product.codigo)
    if (existing) {
      onItemsChange(
        items.map((i) =>
          i.product.codigo === product.codigo
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.product.precio }
            : i
        )
      )
    } else {
      onItemsChange([...items, { product, cantidad: 1, subtotal: product.precio }])
    }
  }

  const updateQuantity = (codigo: string, cantidad: number) => {
    if (cantidad <= 0) {
      onItemsChange(items.filter((i) => i.product.codigo !== codigo))
    } else {
      onItemsChange(
        items.map((i) =>
          i.product.codigo === codigo
            ? { ...i, cantidad, subtotal: cantidad * i.product.precio }
            : i
        )
      )
    }
  }

  const removeItem = (codigo: string) => {
    onItemsChange(items.filter((i) => i.product.codigo !== codigo))
  }

  const dec = (codigo: string) => {
    const it = items.find((x) => x.product.codigo === codigo)
    if (!it) return
    updateQuantity(codigo, it.cantidad - 1)
  }

  const inc = (codigo: string) => {
    const it = items.find((x) => x.product.codigo === codigo)
    if (!it) return
    updateQuantity(codigo, it.cantidad + 1)
  }

  const total = items.reduce((s, i) => s + i.subtotal, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        {/* Product catalog */}
        <div className="flex flex-col gap-3 flex-1">
          <Label>Catalogo de Productos</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o codigo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {products.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed py-10">
              <p className="text-sm text-muted-foreground">No hay productos cargados</p>
            </div>
          ) : (
            <>
              {/* ✅ Mobile catalog (cards) */}
              <div className="sm:hidden flex flex-col gap-2">
                {filtered.map((p) => (
                  <div key={p.codigo} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.descripcion}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{p.codigo}</span> ·{" "}
                        <span className="font-medium text-foreground">{formatCurrency(p.precio)}</span>
                      </p>
                    </div>
                    <Button size="sm" onClick={() => addItem(p)} aria-label={`Agregar ${p.descripcion}`}>
                      <Plus className="size-4" />
                      +1
                    </Button>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-6 border rounded-lg">
                    No se encontraron productos
                  </div>
                )}
              </div>

              {/* Desktop catalog (table) */}
              <div className="hidden sm:block max-h-64 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Cod.</TableHead>
                      <TableHead className="text-xs">Descripcion</TableHead>
                      <TableHead className="text-xs text-right">Precio</TableHead>
                      <TableHead className="text-xs w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.codigo}>
                        <TableCell className="text-xs font-mono text-muted-foreground">{p.codigo}</TableCell>
                        <TableCell className="text-xs">{p.descripcion}</TableCell>
                        <TableCell className="text-xs text-right font-medium">{formatCurrency(p.precio)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => addItem(p)}
                            aria-label={`Agregar ${p.descripcion}`}
                          >
                            <Plus className="size-4 text-primary" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                          No se encontraron productos
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        {/* Selected items */}
        <div className="flex flex-col gap-3 flex-1">
          <Label>Productos Seleccionados ({items.length})</Label>

          {items.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed py-10">
              <p className="text-sm text-muted-foreground">Agrega productos del catalogo</p>
            </div>
          ) : (
            <>
              {/* ✅ Mobile selected (cards + stepper) */}
              <div className="sm:hidden flex flex-col gap-2">
                {items.map((item) => (
                  <div key={item.product.codigo} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{item.product.descripcion}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-mono">{item.product.codigo}</span> · {formatCurrency(item.product.precio)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeItem(item.product.codigo)}
                        aria-label={`Quitar ${item.product.descripcion}`}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => dec(item.product.codigo)} aria-label="Restar">
                          <Minus className="size-4" />
                        </Button>
                        <span className="w-10 text-center font-semibold">{item.cantidad}</span>
                        <Button variant="outline" size="sm" onClick={() => inc(item.product.codigo)} aria-label="Sumar">
                          <Plus className="size-4" />
                        </Button>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Subtotal</p>
                        <p className="text-sm font-bold">{formatCurrency(item.subtotal)}</p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end rounded-lg bg-muted/50 px-4 py-3">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(total)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-base font-bold">
                      <span>Total:</span>
                      <span className="text-primary">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop selected (table) */}
              <div className="hidden sm:block max-h-64 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Producto</TableHead>
                      <TableHead className="text-xs w-20 text-center">Cant.</TableHead>
                      <TableHead className="text-xs text-right">P. Unit.</TableHead>
                      <TableHead className="text-xs text-right">Subtotal</TableHead>
                      <TableHead className="text-xs w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.product.codigo}>
                        <TableCell className="text-xs">
                          <span className="font-mono text-muted-foreground">{item.product.codigo}</span>
                          {" - "}
                          {item.product.descripcion}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.cantidad}
                            onChange={(e) => updateQuantity(item.product.codigo, parseInt(e.target.value) || 0)}
                            className="h-7 w-16 text-center text-xs mx-auto"
                            aria-label={`Cantidad de ${item.product.descripcion}`}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(item.product.precio)}</TableCell>
                        <TableCell className="text-xs text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeItem(item.product.codigo)}
                            aria-label={`Quitar ${item.product.descripcion}`}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Desktop totals */}
              <div className="hidden sm:flex justify-end rounded-lg bg-muted/50 px-4 py-3">
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-base font-bold">
                    <span>Total:</span>
                    <span className="text-primary">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}