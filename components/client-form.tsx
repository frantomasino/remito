"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ClientData } from "@/lib/remito-types"

interface ClientFormProps {
  data: ClientData
  onChange: (data: ClientData) => void
}

export function ClientForm({ data, onChange }: ClientFormProps) {
  const update = (field: keyof ClientData, value: string) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="sr-only">Datos del Cliente</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client-nombre">Nombre</Label>
          <Input
            id="client-nombre"
            value={data.nombre}
            onChange={(e) => update("nombre", e.target.value)}
            placeholder="Nombre del cliente"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client-direccion">Direccion</Label>
          <Input
            id="client-direccion"
            value={data.direccion}
            onChange={(e) => update("direccion", e.target.value)}
            placeholder="Direccion del cliente"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client-telefono">Telefono</Label>
          <Input
            id="client-telefono"
            type="tel"
            value={data.telefono}
            onChange={(e) => update("telefono", e.target.value)}
            placeholder="Ej: 11-1234-5678"
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
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="client-forma-pago">Forma de Pago</Label>
          <Select
            value={data.formaPago}
            onValueChange={(value) => update("formaPago", value)}
          >
            <SelectTrigger id="client-forma-pago">
              <SelectValue placeholder="Seleccionar forma de pago" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Efectivo">Efectivo</SelectItem>
              <SelectItem value="Mercado Pago">Mercado Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </fieldset>
  )
}
