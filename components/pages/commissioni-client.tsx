"use client"

import { TrendingUp, TrendingDown, Award, Target, FileText } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { COMMISSION_TIERS } from "@/lib/constants"
import type { Commission, CommissionLine, Autoscuola } from "@/lib/db/schema"

const MONTHS_IT = [
  "", "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
]

export function CommissioniClient({
  commissions,
  currentMonth,
  lines,
  quota,
}: {
  commissions: Commission[]
  currentMonth: Commission | null
  lines: { line: CommissionLine; autoscuola: Autoscuola | null }[]
  quota: number
}) {
  const gross = currentMonth?.gross ?? 0
  const contracts = currentMonth?.contracts ?? 0
  const quotaProgress = quota > 0 ? gross / quota : 0
  const ytd = commissions.reduce((sum, c) => sum + (c.gross ?? 0), 0)

  // Calculate real trend vs previous month
  const prevMonth = commissions.length >= 2 ? commissions[commissions.length - 2] : null
  const prevGross = prevMonth?.gross ?? 0
  const trend = prevGross > 0 ? ((gross - prevGross) / prevGross) * 100 : 0
  const trendPositive = trend >= 0

  const chartData = commissions.map((c) => ({
    month: MONTHS_IT[c.month],
    gross: c.gross,
  }))

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-6">
      <h1 className="mb-1 text-[22px] font-bold tracking-tight text-ink-900">Commissioni</h1>
      <p className="mb-6 text-[13px] text-ink-500">
        Aprile 2026 · YTD: €{ytd.toLocaleString("it-IT")}
      </p>

      {/* Top stats */}
      <div className="mb-5 grid grid-cols-2 gap-4">
        {/* Maturato */}
        <div className="rounded-[18px] border border-border-1 bg-surface p-5">
          <p className="mb-1 text-[12px] font-medium text-ink-500">Maturato questo mese</p>
          <div className="flex items-end gap-3">
            <span className="font-mono text-[36px] font-bold leading-none tracking-tight text-ink-900">
              €{gross.toLocaleString("it-IT")}
            </span>
            {prevGross > 0 && (
              <span
                className="mb-1 flex items-center gap-1 rounded-[999px] px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  backgroundColor: trendPositive ? "#ECFDF5" : "#FEF2F2",
                  color: trendPositive ? "#10B981" : "#EF4444",
                }}
              >
                {trendPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trendPositive ? "+" : ""}{trend.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="mt-2 text-[12px] text-ink-400">
            {contracts} contratti · media €{contracts > 0 ? Math.round(gross / contracts).toLocaleString("it-IT") : "0"}/contratto
          </p>
        </div>

        {/* Quota */}
        <div className="rounded-[18px] border border-border-1 bg-surface p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-medium text-ink-500">Progresso quota</p>
            <span className="font-mono text-[14px] font-bold text-pink">
              {Math.round(quotaProgress * 100)}%
            </span>
          </div>
          <div className="mb-2 h-3 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, quotaProgress * 100)}%`,
                background: "linear-gradient(90deg, #EC4899, #F472B6)",
              }}
            />
          </div>
          <div className="flex justify-between text-[11.5px] text-ink-400">
            <span>€{gross.toLocaleString("it-IT")} maturato</span>
            <span>€{quota.toLocaleString("it-IT")} quota</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-5 rounded-[18px] border border-border-1 bg-surface p-5">
        <h3 className="mb-4 text-[14px] font-semibold text-ink-900">Storico commissioni</h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `€${v}`}
              />
              <Tooltip
                formatter={(value) => [`€${Number(value).toLocaleString("it-IT")}`, "Commissione"]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #E2E8F0",
                  fontSize: 12,
                }}
              />
              <ReferenceLine
                y={quota}
                stroke="#EC4899"
                strokeDasharray="4 4"
                label={{ value: "Quota", fill: "#EC4899", fontSize: 10 }}
              />
              <Bar dataKey="gross" fill="#EC4899" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Commission plan */}
      <div className="mb-5 rounded-[18px] border border-border-1 bg-surface p-5">
        <h3 className="mb-3 text-[14px] font-semibold text-ink-900">Piano commissioni</h3>
        <div className="grid grid-cols-3 gap-3">
          {COMMISSION_TIERS.map((tier) => {
            const isHighlight = "highlight" in tier && tier.highlight
            return (
            <div
              key={tier.tier}
              className="rounded-[14px] p-4"
              style={{
                backgroundColor: isHighlight ? "#FDF2F8" : "#F8FAFC",
                border: `1px solid ${isHighlight ? "#EC489930" : "#E2E8F0"}`,
              }}
            >
              <div className="mb-1 flex items-center gap-2">
                <Award
                  className="h-4 w-4"
                  style={{ color: isHighlight ? "#EC4899" : "#64748B" }}
                />
                <span className="text-[12px] font-semibold text-ink-900">{tier.tier}</span>
              </div>
              <p className="mb-2 font-mono text-[24px] font-bold text-ink-900">
                {Math.round(tier.rate * 100)}%
              </p>
              <p className="text-[11.5px] leading-relaxed text-ink-500">{tier.desc}</p>
            </div>
            )
          })}
        </div>
      </div>

      {/* Lines table */}
      <div className="rounded-[18px] border border-border-1 bg-surface p-5">
        <h3 className="mb-3 text-[14px] font-semibold text-ink-900">
          Contratti del mese ({lines.length})
        </h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-1">
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-ink-400 uppercase">
                Data
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-ink-400 uppercase">
                Autoscuola
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold text-ink-400 uppercase">
                Piano
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-ink-400 uppercase">
                Valore
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold text-ink-400 uppercase">
                Commissione
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr
                key={l.line.id}
                className="border-b border-border-2 transition-colors hover:bg-surface-2"
              >
                <td className="px-3 py-2.5 text-[13px] text-ink-600">
                  {l.line.date
                    ? new Date(l.line.date).toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "short",
                      })
                    : ""}
                </td>
                <td className="px-3 py-2.5 text-[13px] font-medium text-ink-900">
                  {l.autoscuola?.name?.replace("Autoscuola ", "") ?? "–"}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="rounded-[999px] px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor:
                        l.line.commissionRate >= 0.25 ? "#FDF2F8" : "#F8FAFC",
                      color:
                        l.line.commissionRate >= 0.25 ? "#EC4899" : "#64748B",
                    }}
                  >
                    {l.line.commissionRate >= 0.25 ? "Premium" : "Base"} {Math.round(l.line.commissionRate * 100)}%
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[13px] font-medium text-ink-900">
                  €{l.line.contractValue.toLocaleString("it-IT")}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[13px] font-semibold text-green">
                  €{l.line.commissionAmount.toLocaleString("it-IT")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
