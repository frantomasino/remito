"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Package, ChevronRight } from "lucide-react"
import type { Remito } from "@/lib/types"

const estadoConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendiente: { label: "Pendiente", variant: "secondary" },
  entregado: { label: "Entregado", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}

export default function DashboardPage() {
  const [remitos, setRemitos] = useState<Remito[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchRemitos = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("remitos")
      .select("*")
      .order("created_at", { ascending: false })

    if (data) setRemitos(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRemitos()
  }, [fetchRemitos])

  const filtered = remitos.filter(
    (r) =>
      r.numero_remito.toLowerCase().includes(search.toLowerCase()) ||
      r.cliente_nombre.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-4 px-4 pt-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Mis Remitos</h1>
        <p className="text-sm text-muted-foreground">
          {remitos.length} {remitos.length === 1 ? "remito" : "remitos"} en total
        </p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por numero o cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 rounded-xl pl-10"
        />
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Package className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-base font-medium text-foreground">
                {search ? "Sin resultados" : "No hay remitos"}
              </p>
              <p className="text-sm text-muted-foreground">
                {search
                  ? "Proba con otro termino de busqueda"
                  : "Crea tu primer remito tocando el boton Nuevo"}
              </p>
            </div>
          </div>
        ) : (
          filtered.map((remito) => {
            const cfg = estadoConfig[remito.estado] || estadoConfig.pendiente
            return (
              <Link
                key={remito.id}
                href={`/dashboard/${remito.id}`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors active:bg-accent"
              >
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-foreground">
                      #{remito.numero_remito}
                    </span>
                    <Badge variant={cfg.variant} className="text-[11px]">
                      {cfg.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground">{remito.cliente_nombre}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(remito.fecha)}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
