"use client"

import {
  Users,
  Building,
  FileText,
  DollarSign,
  MoreHorizontal,
} from "lucide-react"
import type { User } from "@/lib/db/schema"

type SalesTeamRow = {
  user: User
  autoscuoleCount: number
  contractsMtd: number
  commissionsMtd: number
}

type Stats = {
  activeSales: number
  totalAutoscuole: number
  unassigned: number
}

export function GestioneSalesClient({
  team,
  stats,
}: {
  team: SalesTeamRow[]
  stats: Stats
}) {
  const totalContracts = team.reduce((sum, t) => sum + t.contractsMtd, 0)
  const totalCommissions = team.reduce((sum, t) => sum + t.commissionsMtd, 0)

  const statCards = [
    { label: "Sales attivi", value: stats.activeSales, icon: Users, color: "#EC4899" },
    { label: "Autoscuole", value: stats.totalAutoscuole, icon: Building, color: "#3B82F6" },
    { label: "Contratti MTD", value: totalContracts, icon: FileText, color: "#10B981" },
    {
      label: "Commissioni MTD",
      value: `€${totalCommissions.toLocaleString("it-IT")}`,
      icon: DollarSign,
      color: "#F59E0B",
    },
  ]

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <h1 className="mb-1 text-[22px] font-bold tracking-tight text-ink-900">Gestione Sales</h1>
      <p className="mb-6 text-[13px] text-ink-500">
        Team commerciale · {team.length} membri
      </p>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-[18px] border border-border-1 bg-surface p-5">
            <div className="mb-2 flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: s.color + "15" }}
              >
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <span className="text-[12px] font-medium text-ink-500">{s.label}</span>
            </div>
            <p className="font-mono text-[24px] font-bold text-ink-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Team table */}
      <div className="rounded-[18px] border border-border-1 bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-1">
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase">
                Sales
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase">
                Territorio
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold text-ink-400 uppercase">
                Autoscuole
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold text-ink-400 uppercase">
                Contratti
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold text-ink-400 uppercase">
                Commissioni
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold text-ink-400 uppercase">
                Quota
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold text-ink-400 uppercase">
                Stato
              </th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {team.map((row) => {
              const quotaPercent =
                row.user.quota && row.user.quota > 0
                  ? Math.min(100, Math.round((row.commissionsMtd / row.user.quota) * 100))
                  : 0
              const initials = row.user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()

              return (
                <tr
                  key={row.user.id}
                  className="border-b border-border-2 transition-colors hover:bg-surface-2"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ backgroundColor: row.user.color }}
                      >
                        {initials}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-ink-900">{row.user.name}</p>
                        <p className="text-[11px] text-ink-400">{row.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-[999px] bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-600">
                      {row.user.territory}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-[13px] text-ink-900">
                    {row.autoscuoleCount}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-[13px] text-ink-900">
                    {row.contractsMtd}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[13px] font-semibold text-ink-900">
                    €{row.commissionsMtd.toLocaleString("it-IT")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-pink"
                          style={{ width: `${quotaPercent}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-ink-500">{quotaPercent}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="rounded-[999px] px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: row.user.active ? "#ECFDF5" : "#FEF2F2",
                        color: row.user.active ? "#10B981" : "#EF4444",
                      }}
                    >
                      {row.user.active ? "Attivo" : "Inattivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 hover:bg-surface-2">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
