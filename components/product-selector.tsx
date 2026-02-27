"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2, Search, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { type Product, type LineItem, formatCurrency } from "@/lib/remito-types"

interface ProductSelectorProps {
  products: Product[]
  items: LineItem[]
  onItemsChange: (items: LineItem[]) => void
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

const extractParenParts = (s: string) => {
  const matches = s.match(/\(([^)]*)\)/g)
  if (!matches) return []
  return matches.map((m) => m.replace(/^\(/, "").replace(/\)$/, "").trim()).filter(Boolean)
}

const shortDesc = (s: string) => {
  return s
    .replace(/\([^)]*\)/g, "") // saca paréntesis
    .replace(/#\S+/g, "") // saca #Promo
    .replace(/\bTapas\s+para\s+/gi, "Tapas ") // Tapas para -> Tapas
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim()
}

const detailTags = (s: string) => {
  const parts = extractParenParts(s)
  const raw = parts
    .flatMap((p) => p.split(","))
    .map((x) => x.trim())
    .filter(Boolean)

  const mapped = raw.map((t) => {
    const n = normalize(t)
    if (n === "freir" || n === "freir.") return "Freír"
    if (n === "horno" || n === "horno.") return "Horno"
    if (n === "criolla" || n === "criolla.") return "Criolla"
    if (n.includes("consultar")) return "Consultar"
    if (n.includes("mas gruesas")) return "Más gruesas"
    if (n.includes("super crocantes")) return "Súper crocantes"
    if (n.includes("fuente de fibras")) return "Fibras"
    if (n.includes("reducida en grasas")) return "Light"
    return t
  })

  const seen = new Set<string>()
  const out: string[] = []

  // ✅ chip Promo si viene con #Promo en el texto
  if (/#promo/i.test(s)) {
    out.push("Promo")
    seen.add("promo")
  }

  for (const t of mapped) {
    const key = normalize(t)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }

  return out.slice(0, 4)
}

export function ProductSelector({ products, items, onItemsChange }: ProductSelectorProps) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = normalize(search.trim())
    if (!q) return products
    return products.filter((p) => normalize(`${p.codigo} ${p.descripcion}`).includes(q))
  }, [products, search])

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
          i.product.codigo === codigo ? { ...i, cantidad, subtotal: cantidad * i.product.precio } : i
        )
      )
    }
  }

  const removeItem = (codigo: string) => onItemsChange(items.filter((i) => i.product.codigo !== codigo))

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
        {/* Catalogo */}
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
              {/* ✅ Mobile: cards + chips */}
              <div className="sm:hidden flex flex-col gap-2">
                {filtered.map((p, idx) => {
                  const title = shortDesc(p.descripcion)
                  const tags = detailTags(p.descripcion)
                  return (
                    <div key={`${p.codigo || "NO_CODE"}-${idx}`} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold break-words">{title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            <span className="font-mono">{p.codigo}</span> ·{" "}
                            <span className="font-medium text-foreground">{formatCurrency(p.precio)}</span>
                          </p>

                          {tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {tags.map((t) => (
                                <span key={t} className="rounded-full border px-2 py-0.5 text-[11px] bg-muted/40">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button size="sm" onClick={() => addItem(p)} aria-label={`Agregar ${title}`}>
                          <Plus className="size-4" />
                          +1
                        </Button>
                      </div>
                    </div>
                  )
                })}

                {filtered.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-6 border rounded-lg">
                    No se encontraron productos
                  </div>
                )}
              </div>

              {/* Desktop: tabla + chips */}
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
                    {filtered.map((p, idx) => {
                      const title = shortDesc(p.descripcion)
                      const tags = detailTags(p.descripcion)

                      return (
                        <TableRow key={`${p.codigo || "NO_CODE"}-${idx}`}>
                          <TableCell className="text-xs font-mono text-muted-foreground">{p.codigo}</TableCell>

                          <TableCell className="text-xs">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{title}</span>
                              {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {tags.map((t) => (
                                    <span key={t} className="rounded-full border px-2 py-0.5 text-[11px] bg-muted/40">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-xs text-right font-medium">{formatCurrency(p.precio)}</TableCell>

                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => addItem(p)}
                              aria-label={`Agregar ${title}`}
                            >
                              <Plus className="size-4 text-primary" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}

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

        {/* Seleccionados */}
        <div className="flex flex-col gap-3 flex-1">
          <Label>Productos Seleccionados ({items.length})</Label>

          {items.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed py-10">
              <p className="text-sm text-muted-foreground">Agrega productos del catalogo</p>
            </div>
          ) : (
            <>
              {/* ✅ Mobile: cards + stepper + chips */}
              <div className="sm:hidden flex flex-col gap-2">
                {items.map((item) => {
                  const title = shortDesc(item.product.descripcion)
                  const tags = detailTags(item.product.descripcion)

                  return (
                    <div key={item.product.codigo} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold break-words">{title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            <span className="font-mono">{item.product.codigo}</span> · {formatCurrency(item.product.precio)}
                          </p>

                          {tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {tags.map((t) => (
                                <span key={t} className="rounded-full border px-2 py-0.5 text-[11px] bg-muted/40">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeItem(item.product.codigo)}
                          aria-label={`Quitar ${title}`}
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
                  )
                })}

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

              {/* Desktop: tabla (igual que antes, pero mostrando desc corta) */}
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
  {(() => {
    const title = shortDesc(item.product.descripcion)
    const tags = detailTags(item.product.descripcion)

    return (
      <div className="flex flex-col gap-1">
        <span>
          <span className="font-mono text-muted-foreground">{item.product.codigo}</span>
          {" - "}
          <span className="font-medium">{title}</span>
        </span>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <span key={t} className="rounded-full border px-2 py-0.5 text-[11px] bg-muted/40">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  })()}
</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.cantidad}
                            onChange={(e) => updateQuantity(item.product.codigo, parseInt(e.target.value) || 0)}
                            className="h-7 w-16 text-center text-xs mx-auto"
                          />
                        </TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(item.product.precio)}</TableCell>
                        <TableCell className="text-xs text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon-sm" onClick={() => removeItem(item.product.codigo)}>
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

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