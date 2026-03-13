import { BottomNav } from "@/components/bottom-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background pb-20">
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  )
}
