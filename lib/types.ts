export interface Remito {
  id: string
  user_id: string
  numero_remito: string
  fecha: string
  cliente_nombre: string
  cliente_direccion: string | null
  cliente_telefono: string | null
  estado: "pendiente" | "entregado" | "cancelado"
  observaciones: string | null
  created_at: string
  updated_at: string
}

export interface RemitoItem {
  id: string
  remito_id: string
  descripcion: string
  cantidad: number
  unidad: string
  created_at: string
}
