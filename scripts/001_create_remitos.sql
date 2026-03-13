-- Create remitos table
CREATE TABLE IF NOT EXISTS public.remitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero_remito TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  cliente_nombre TEXT NOT NULL,
  cliente_direccion TEXT,
  cliente_telefono TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'entregado', 'cancelado')),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create remito items table
CREATE TABLE IF NOT EXISTS public.remito_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remito_id UUID NOT NULL REFERENCES public.remitos(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unidad TEXT NOT NULL DEFAULT 'unidad',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.remitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remito_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for remitos
CREATE POLICY "remitos_select_own" ON public.remitos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "remitos_insert_own" ON public.remitos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "remitos_update_own" ON public.remitos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "remitos_delete_own" ON public.remitos FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for remito_items (through remito ownership)
CREATE POLICY "remito_items_select_own" ON public.remito_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.remitos WHERE id = remito_items.remito_id AND user_id = auth.uid()));
CREATE POLICY "remito_items_insert_own" ON public.remito_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.remitos WHERE id = remito_items.remito_id AND user_id = auth.uid()));
CREATE POLICY "remito_items_update_own" ON public.remito_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.remitos WHERE id = remito_items.remito_id AND user_id = auth.uid()));
CREATE POLICY "remito_items_delete_own" ON public.remito_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.remitos WHERE id = remito_items.remito_id AND user_id = auth.uid()));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add trigger for remitos updated_at
DROP TRIGGER IF EXISTS set_remitos_updated_at ON public.remitos;
CREATE TRIGGER set_remitos_updated_at
  BEFORE UPDATE ON public.remitos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
