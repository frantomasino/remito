"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ClientData } from "@/lib/remito-types"

interface ClientFormProps {
  data: ClientData
  onChange: (data: ClientData) => void
}

export function ClientForm({ data, onChange }: ClientFormProps) {
  const [openMobile, setOpenMobile] = useState(false)

  const update = (field: keyof ClientData, value: string) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="sr-only">Datos del Cliente</legend>

      {/* ✅ Solo móvil: desplegable fácil */}
      <div className="sm:hidden">
       <Button
  type="button"
  variant="outline"
  className="w-full"
  onClick={() => setOpenMobile((v) => !v)}
>
  {openMobile ? "Ocultar cliente (opcional)" : "Cliente (opcional)"}
</Button>
      </div>

      {/* ✅ Desktop: siempre visible */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="client-nombre">Nombre / Comercio</Label>
            <Input
              id="client-nombre"
              value={data.nombre}
              onChange={(e) => update("nombre", e.target.value)}
              placeholder="Ej: Kiosco Juan"
              inputMode="text"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="client-direccion">Dirección</Label>
            <Input
              id="client-direccion"
              value={data.direccion}
              onChange={(e) => update("direccion", e.target.value)}
              placeholder="Dirección del cliente"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-telefono">Teléfono</Label>
            <Input
              id="client-telefono"
              type="tel"
              value={data.telefono}
              onChange={(e) => update("telefono", e.target.value)}
              placeholder="Ej: 11-1234-5678"
              inputMode="tel"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-mail">Mail</Label>
            <Input
              id="client-mail"
              type="email"
              value={data.mail}
              onChange={(e) => update("mail", e.target.value)}
              placeholder="correo@ejemplo.com"
              inputMode="email"
            />
          </div>
        </div>
      </div>

      {/* ✅ Mobile: colapsable */}
      <div className={`sm:hidden ${openMobile ? "block" : "hidden"}`}>
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-client-nombre">Nombre / Comercio</Label>
            <Input
              id="m-client-nombre"
              value={data.nombre}
              onChange={(e) => update("nombre", e.target.value)}
              placeholder="Ej: Kiosco Juan"
              inputMode="text"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-client-direccion">Dirección</Label>
            <Input
              id="m-client-direccion"
              value={data.direccion}
              onChange={(e) => update("direccion", e.target.value)}
              placeholder="Dirección del cliente"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-client-telefono">Teléfono</Label>
            <Input
              id="m-client-telefono"
              type="tel"
              value={data.telefono}
              onChange={(e) => update("telefono", e.target.value)}
              placeholder="Ej: 11-1234-5678"
              inputMode="tel"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-client-mail">Mail</Label>
            <Input
              id="m-client-mail"
              type="email"
              value={data.mail}
              onChange={(e) => update("mail", e.target.value)}
              placeholder="correo@ejemplo.com"
              inputMode="email"
            />
          </div>
        </div>
      </div>
    </fieldset>
  )
}