"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClipboardList, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError("Email o contrasena incorrectos")
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <ClipboardList className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground text-balance text-center">
            Remitos
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            Ingresa a tu cuenta para gestionar tus remitos
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Contrasena
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Tu contrasena"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 rounded-xl pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

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
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {"No tenes cuenta? "}
          <Link href="/auth/sign-up" className="font-medium text-primary underline underline-offset-4">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}
