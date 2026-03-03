"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export default function PerfilPage() {
  const [email, setEmail] = useState("")

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""))
  }, [])

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold">Perfil</h1>
      <p className="mt-2 text-sm text-muted-foreground">Email: {email || "—"}</p>

      <form action="/auth/signout" method="post" className="mt-6">
        <Button type="submit" className="h-12 w-full rounded-xl text-base font-semibold">
          Cerrar sesión
        </Button>
      </form>
    </div>
  )
}