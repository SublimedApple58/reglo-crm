import { Providers } from "@/components/providers"
import { AppSidebar } from "@/components/layout/app-sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </Providers>
  )
}
