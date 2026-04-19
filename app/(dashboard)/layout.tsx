import { Providers } from "@/components/providers"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Topbar } from "@/components/layout/topbar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </Providers>
  )
}
