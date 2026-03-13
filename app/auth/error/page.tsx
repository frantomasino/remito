import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-foreground text-balance">
            Error de autenticacion
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ocurrio un error durante el proceso de autenticacion. Por favor, intenta de nuevo.
          </p>
        </div>
        <Button asChild className="h-12 w-full rounded-xl text-base font-semibold">
          <Link href="/auth/login">Volver al login</Link>
        </Button>
      </div>
    </div>
  )
}
