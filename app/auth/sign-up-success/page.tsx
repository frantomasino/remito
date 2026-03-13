import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MailCheck } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-chart-2/15">
          <MailCheck className="h-8 w-8 text-chart-2" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-foreground text-balance">
            Revisa tu email
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Te enviamos un link de confirmacion. Hace click en el link para activar tu cuenta y empezar a usar Remitos.
          </p>
        </div>
        <Button asChild className="h-12 w-full rounded-xl text-base font-semibold">
          <Link href="/auth/login">Volver al login</Link>
        </Button>
      </div>
    </div>
  )
}
