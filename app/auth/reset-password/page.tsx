"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function translateSupabaseError(msg: string) {
  const m = msg.toLowerCase()
  if (m.includes("new password should be different")) return "La nueva contraseña debe ser diferente a la anterior."
  if (m.includes("password should be at least")) return "La contraseña debe tener al menos 6 caracteres."
  if (m.includes("rate limit")) return "Se excedió el límite de envíos. Esperá unos minutos y probá de nuevo."
  if (m.includes("invalid") && (m.includes("token") || m.includes("code"))) {
    return "El enlace de recuperación es inválido o ya venció. Pedí uno nuevo."
  }
  if (m.includes("expired")) return "El enlace de recuperación venció. Pedí uno nuevo."
  return msg
}

function parseHashTokens(hash: string) {
  // hash viene como "#access_token=...&refresh_token=...&type=recovery"
  const h = hash.startsWith("#") ? hash.slice(1) : hash
  const p = new URLSearchParams(h)
  const access_token = p.get("access_token")
  const refresh_token = p.get("refresh_token")
  return { access_token, refresh_token }
}

function ResetPasswordInner() {
  const router = useRouter()
  const params = useSearchParams()

  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const run = async () => {
      setChecking(true)
      setError(null)

      try {
        // ✅ 1) Soporta flow con ?code=...
        const code = params.get("code")
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setReady(false)
            setError(translateSupabaseError(error.message))
            setChecking(false)
            return
          }
        } else if (typeof window !== "undefined" && window.location.hash) {
          // ✅ 2) Soporta flow con #access_token=...&refresh_token=...
          const { access_token, refresh_token } = parseHashTokens(window.location.hash)

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token })
            if (error) {
              setReady(false)
              setError(translateSupabaseError(error.message))
              setChecking(false)
              return
            }

            // Limpia el hash para que no quede expuesto
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        }

        // ✅ 3) Confirmar que ya hay sesión
        const { data } = await supabase.auth.getSession()
        setReady(!!data.session)

        if (!data.session) {
          setError("No se pudo validar el enlace. Pedí uno nuevo desde “Olvidé mi contraseña”.")
        }
      } catch {
        setReady(false)
        setError("No se pudo validar el enlace. Pedí uno nuevo desde “Olvidé mi contraseña”.")
      } finally {
        setChecking(false)
      }
    }

    run()
  }, [params])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(translateSupabaseError(error.message))
      return
    }

    setSuccess("Contraseña actualizada con éxito. Ya podés ingresar.")
    setTimeout(() => router.replace("/auth/login"), 900)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center">Nueva contraseña</h1>
        <p className="mt-2 text-sm text-muted-foreground text-center">Elegí una nueva contraseña para tu cuenta.</p>

        {checking ? (
          <p className="mt-8 text-sm text-muted-foreground text-center">Validando enlace...</p>
        ) : !ready ? (
          <p className="mt-8 text-sm text-muted-foreground text-center">{error}</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Nueva contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm" className="text-sm font-medium text-foreground">
                Confirmar contraseña
              </Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-12 rounded-xl pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-green-600 text-center" role="status">
                {success}
              </p>
            )}

            <Button type="submit" disabled={loading} className="h-12 rounded-xl text-base font-semibold">
              {loading ? "Guardando..." : "Guardar contraseña"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background px-6">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  )
}