"use client"

import type React from "react"
import { useCallback, useDeferredValue, useMemo, useState } from "react"
import { Plus, Trash2, Search, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { type Product, type LineItem, formatCurrency } from "@/lib/remito-types"

interface ProductSelectorProps {
  products: Product[]
  items: LineItem[]
  onItemsChange: React.Dispatch<React.SetStateAction<LineItem[]>>
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

const shortDesc = (s: string) =>
  s
    .replace(/\([^)]*\)/g, "")
    .replace(/#\S+/g, "")
    .replace(/\bTapas\s+para\s+/gi, "Tapas ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim()

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

type Derived = { title: string; tags: string[]; haystack: string }

export function ProductSelector({ products, items, onItemsChange }: ProductSelectorProps) {
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [addQty, setAddQty] = useState<Record<string, number>>({})

  const qtyOptions = useMemo(() => Array.from({ length: 100 }, (_, i) => i + 1), [])

  const getQty = useCallback((codigo: string) => addQty[codigo] ?? 1, [addQty])
  const setQty = useCallback((codigo: string, qty: number) => {
    setAddQty((prev) => (prev[codigo] === qty ? prev : { ...prev, [codigo]: qty }))
  }, [])

  const itemsByCode = useMemo(() => {
    const m = new Map<string, LineItem>()
    for (const it of items) m.set(it.product.codigo, it)
    return m
  }, [items])

  const derivedByCode = useMemo(() => {
    const m = new Map<string, Derived>()
    for (const p of products) {
      const title = shortDesc(p.descripcion)
      const tags = detailTags(p.descripcion)
      const haystack = normalize(`${p.codigo} ${p.descripcion}`)
      m.set(p.codigo, { title, tags, haystack })
    }
    return m
  }, [products])

  const filtered = useMemo(() => {
    const q = normalize(deferredSearch.trim())
    if (!q) return products
    return products.filter((p) => (derivedByCode.get(p.codigo)?.haystack ?? "").includes(q))
  }, [products, deferredSearch, derivedByCode])

  const addItemWithQty = useCallback(
    (product: Product, qty: number) => {
      const q = Math.min(100, Math.max(1, qty || 1))

      onItemsChange((prev) => {
        const idx = prev.findIndex((i) => i.product.codigo === product.codigo)

        if (idx >= 0) {
          const next = prev.slice()
          const cur = next[idx]
          const cantidad = cur.cantidad + q
          next[idx] = { ...cur, cantidad, subtotal: cantidad * cur.product.precio }
          return next
        }

        return [...prev, { product, cantidad: q, subtotal: q * product.precio }]
      })

      setQty(product.codigo, 1)
    },
    [onItemsChange, setQty]
  )

  const updateQuantity = useCallback(
    (codigo: string, cantidad: number) => {
      onItemsChange((prev) => {
        const idx = prev.findIndex((i) => i.product.codigo === codigo)
        if (idx < 0) return prev

        if (cantidad <= 0) return prev.filter((i) => i.product.codigo !== codigo)

        const next = prev.slice()
        const cur = next[idx]
        if (cur.cantidad === cantidad) return prev

        next[idx] = { ...cur, cantidad, subtotal: cantidad * cur.product.precio }
        return next
      })
    },
    [onItemsChange]
  )

  const removeItem = useCallback(
    (codigo: string) => {
      onItemsChange((prev) => prev.filter((i) => i.product.codigo !== codigo))
    },
    [onItemsChange]
  )

  const dec = useCallback(
    (codigo: string) => {
      const it = itemsByCode.get(codigo)
      if (!it) return
      updateQuantity(codigo, it.cantidad - 1)
    },
    [itemsByCode, updateQuantity]
  )

  const inc = useCallback(
    (codigo: string) => {
      const it = itemsByCode.get(codigo)
      if (!it) return
      updateQuantity(codigo, it.cantidad + 1)
    },
    [itemsByCode, updateQuantity]
  )

  const total = useMemo(() => items.reduce((s, i) => s + i.subtotal, 0), [items])

  return (
    <div className="flex flex-col gap-4 overflow-x-hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 overflow-x-hidden">
        {/* Catálogo */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
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
              {/* Móvil */}
              <div className="sm:hidden flex flex-col gap-2 min-w-0">
                {filtered.map((p, idx) => {
                  const d = derivedByCode.get(p.codigo)
                  const title = d?.title ?? shortDesc(p.descripcion)
                  const tags = d?.tags ?? detailTags(p.descripcion)
                  const qty = getQty(p.codigo)

                  return (
                    <div key={`${p.codigo || "NO_CODE"}-${idx}`} className="rounded-lg border p-3 overflow-x-hidden">
                      <p className="text-[12px] font-semibold leading-snug break-words">{title}</p>

                      <p className="mt-1 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">{formatCurrency(p.precio)}</span>
                      </p>

                      {tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {tags.map((t) => (
                            <span key={t} className="rounded-full border px-2 py-0.5 text-[10px] bg-muted/40">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-2 min-w-0">
                        <div className="w-20 flex-shrink-0">
                          <Select value={String(qty)} onValueChange={(v) => setQty(p.codigo, Number(v))}>
                            <SelectTrigger className="h-8 w-full px-2 text-[12px]">
                              <SelectValue placeholder="Cant." />
                            </SelectTrigger>

                            <SelectContent className="max-h-72 w-[var(--radix-select-trigger-width)]">
                              {qtyOptions.map((n) => (
                                <SelectItem key={n} value={String(n)} className="text-[12px]">
                                  {n}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button className="h-8 flex-1 px-3 text-[12px]" onClick={() => addItemWithQty(p, qty)}>
                          <Plus className="size-4" />
                          Agregar
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop */}
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
                      const d = derivedByCode.get(p.codigo)
                      const title = d?.title ?? shortDesc(p.descripcion)
                      const tags = d?.tags ?? detailTags(p.descripcion)

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
                              onClick={() => addItemWithQty(p, 1)}
                              aria-label={`Agregar ${title}`}
                            >
                              <Plus className="size-4 text-primary" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        {/* Seleccionados */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <Label>Productos Seleccionados ({items.length})</Label>

          {items.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed py-10">
              <p className="text-sm text-muted-foreground">Agrega productos del catalogo</p>
            </div>
          ) : (
            <>
              {/* Móvil */}
              <div className="sm:hidden flex flex-col gap-2 min-w-0">
                {items.map((item) => {
                  const d = derivedByCode.get(item.product.codigo)
                  const title = d?.title ?? shortDesc(item.product.descripcion)
                  const tags = d?.tags ?? detailTags(item.product.descripcion)

                  return (
                    <div key={item.product.codigo} className="rounded-lg border p-3 overflow-x-hidden">
                      <div className="flex items-start justify-between gap-3 min-w-0">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold leading-snug break-words">{title}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{formatCurrency(item.product.precio)}</p>

                          {tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {tags.map((t) => (
                                <span key={t} className="rounded-full border px-2 py-0.5 text-[10px] bg-muted/40">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button variant="ghost" size="icon-sm" onClick={() => removeItem(item.product.codigo)} aria-label="Quitar">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button variant="outline" size="sm" onClick={() => dec(item.product.codigo)} aria-label="Restar">
                            <Minus className="size-4" />
                          </Button>
                          <span className="w-10 text-center font-semibold text-[12px]">{item.cantidad}</span>
                          <Button variant="outline" size="sm" onClick={() => inc(item.product.codigo)} aria-label="Sumar">
                            <Plus className="size-4" />
                          </Button>
                        </div>

                        <div className="text-right min-w-0">
                          <p className="text-[11px] text-muted-foreground">Subtotal</p>
                          <p className="text-[12px] font-bold truncate max-w-[38vw]">{formatCurrency(item.subtotal)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}

                <div className="flex justify-end rounded-lg bg-muted/50 px-4 py-3 overflow-x-hidden">
                  <div className="flex flex-col items-end gap-1 min-w-0">
                    <div className="flex items-center gap-4 text-[11px] min-w-0">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium truncate max-w-[45vw]">{formatCurrency(total)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[13px] font-bold min-w-0">
                      <span>Total:</span>
                      <span className="text-primary truncate max-w-[45vw]">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop */}
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
                          {derivedByCode.get(item.product.codigo)?.title ?? shortDesc(item.product.descripcion)}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.cantidad}
                            onChange={(e) => updateQuantity(item.product.codigo, parseInt(e.target.value) || 0)}
                            className="h-7 w-16 text-center text-xs mx-auto"
                            inputMode="numeric"
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}