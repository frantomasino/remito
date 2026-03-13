import type { Remito, RemitoItem } from "./types"

export type RemitoWithItems = Remito & { remito_items: RemitoItem[] }
