"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

interface ItemForm {
  descripcion: string
  cantidad: string
  unidad: string
}

export default function NuevoRemitoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    numero_remito: "",
    fecha: new Date().toISOString().split("T")[0],
    cliente_nombre: "",
    cliente_direccion: "",
    cliente_telefono: "",
    estado: "pendiente" as const,
    observaciones: "",
  })

  const [items, setItems] = useState<ItemForm[]>([
    { descripcion: "", cantidad: "1", unidad: "unidad" },
  ])

  function addItem() {
    setItems([...items, { descripcion: "", cantidad: "1", unidad: "unidad" }])
  }

  function removeItem(index: number) {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof ItemForm, value: string) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!form.numero_remito || !form.cliente_nombre) {
      setError("Numero de remito y nombre del cliente son obligatorios")
      setLoading(false)
      return
    }

    const hasEmptyItem = items.some((item) => !item.descripcion.trim())
    if (hasEmptyItem) {
      setError("Todos los items deben tener una descripcion")
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError("Sesion expirada. Por favor, ingresa de nuevo.")
      setLoading(false)
      return
    }

    const { data: remito, error: remitoError } = await supabase
      .from("remitos")
      .insert({
        user_id: user.id,
        numero_remito: form.numero_remito,
        fecha: form.fecha,
        cliente_nombre: form.cliente_nombre,
        cliente_direccion: form.cliente_direccion || null,
        cliente_telefono: form.cliente_telefono || null,
        estado: form.estado,
        observaciones: form.observaciones || null,
      })
      .select()
      .single()

    if (remitoError || !remito) {
      setError("Error al crear el remito. Intenta de nuevo.")
      setLoading(false)
      return
    }

    const remitoItems = items.map((item) => ({
      remito_id: remito.id,
      descripcion: item.descripcion,
      cantidad: parseFloat(item.cantidad) || 1,
      unidad: item.unidad,
    }))

    const { error: itemsError } = await supabase
      .from("remito_items")
      .insert(remitoItems)

    if (itemsError) {
      setError("Remito creado pero hubo un error con los items.")
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
      <header className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground transition-colors active:bg-accent"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">Nuevo Remito</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Datos del remito */}
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Datos del remito
          </h2>

          <div className="flex flex-col gap-2">
            <Label htmlFor="numero">Numero de remito *</Label>
            <Input
              id="numero"
              placeholder="Ej: 0001-00000012"
              value={form.numero_remito}
              onChange={(e) => setForm({ ...form, numero_remito: e.target.value })}
              required
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="estado">Estado</Label>
            <Select
              value={form.estado}
              onValueChange={(v) => setForm({ ...form, estado: v as typeof form.estado })}
            >
              <SelectTrigger id="estado" className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="entregado">Entregado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Datos del cliente */}
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Datos del cliente
          </h2>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cliente">Nombre del cliente *</Label>
            <Input
              id="cliente"
              placeholder="Nombre o razon social"
              value={form.cliente_nombre}
              onChange={(e) => setForm({ ...form, cliente_nombre: e.target.value })}
              required
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="direccion">Direccion</Label>
            <Input
              id="direccion"
              placeholder="Direccion de entrega"
              value={form.cliente_direccion}
              onChange={(e) => setForm({ ...form, cliente_direccion: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="telefono">Telefono</Label>
            <Input
              id="telefono"
              type="tel"
              placeholder="Numero de contacto"
              value={form.cliente_telefono}
              onChange={(e) => setForm({ ...form, cliente_telefono: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>
        </section>

        {/* Items */}
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Items
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addItem}
              className="h-8 gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </Button>
          </div>

          {items.map((item, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-lg border border-border/50 bg-background p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Item {index + 1}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-muted-foreground transition-colors active:text-destructive"
                    aria-label="Eliminar item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Input
                placeholder="Descripcion del producto"
                value={item.descripcion}
                onChange={(e) => updateItem(index, "descripcion", e.target.value)}
                className="h-10 rounded-lg"
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Cant."
                    value={item.cantidad}
                    onChange={(e) => updateItem(index, "cantidad", e.target.value)}
                    className="h-10 rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <Select
                    value={item.unidad}
                    onValueChange={(v) => updateItem(index, "unidad", v)}
                  >
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidad">Unidad</SelectItem>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="litro">Litro</SelectItem>
                      <SelectItem value="metro">Metro</SelectItem>
                      <SelectItem value="caja">Caja</SelectItem>
                      <SelectItem value="bulto">Bulto</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Observaciones */}
        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Observaciones
          </h2>
          <Textarea
            placeholder="Notas adicionales..."
            value={form.observaciones}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            className="min-h-20 rounded-xl resize-none"
          />
        </section>

        {error && (
          <p className="text-sm text-destructive text-center" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-12 rounded-xl text-base font-semibold"
        >
          {loading ? "Creando..." : "Crear Remito"}
        </Button>
      </form>
    </div>
  )
}
