"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  Building,
  FileText,
  DollarSign,
  MoreHorizontal,
  Plus,
  X,
} from "lucide-react"
import { createUser, updateUser, toggleUserActive, deleteUser } from "@/lib/actions/users"
import { SALES_COLORS } from "@/lib/constants"
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
  const router = useRouter()
  const totalContracts = team.reduce((sum, t) => sum + t.contractsMtd, 0)
  const totalCommissions = team.reduce((sum, t) => sum + t.commissionsMtd, 0)
  const [showNewUser, setShowNewUser] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-[22px] font-bold tracking-tight text-ink-900">Gestione Sales</h1>
          <p className="text-[13px] text-ink-500">
            Team commerciale · {team.length} membri
          </p>
        </div>
        <button
          onClick={() => setShowNewUser(true)}
          className="flex h-9 items-center gap-1.5 rounded-[999px] bg-pink px-4 text-[13px] font-semibold text-white hover:bg-pink/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuovo Sales
        </button>
      </div>

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
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === row.user.id ? null : row.user.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 hover:bg-surface-2"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {menuOpen === row.user.id && (
                        <UserMenu
                          user={row.user}
                          onEdit={() => { setEditUser(row.user); setMenuOpen(null) }}
                          onToggleActive={() => { setMenuOpen(null) }}
                          onDelete={() => { setDeleteConfirm(row.user.id); setMenuOpen(null) }}
                          onClose={() => setMenuOpen(null)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      {showNewUser && (
        <UserFormDialog
          onClose={() => setShowNewUser(false)}
          onDone={() => { setShowNewUser(false); router.refresh() }}
        />
      )}

      {editUser && (
        <UserFormDialog
          user={editUser}
          onClose={() => setEditUser(null)}
          onDone={() => { setEditUser(null); router.refresh() }}
        />
      )}

      {deleteConfirm && (
        <DeleteUserDialog
          userId={deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onDone={() => { setDeleteConfirm(null); router.refresh() }}
        />
      )}
    </div>
  )
}

function UserMenu({
  user,
  onEdit,
  onToggleActive,
  onDelete,
  onClose,
}: {
  user: User
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleToggle() {
    startTransition(async () => {
      await toggleUserActive(user.id)
      onToggleActive()
      router.refresh()
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-1 w-[160px] rounded-[10px] border border-border-1 bg-surface py-1 shadow-lg">
        <button
          onClick={onEdit}
          className="flex w-full items-center px-3 py-2 text-[12.5px] text-ink-700 hover:bg-surface-2"
        >
          Modifica
        </button>
        <button
          onClick={handleToggle}
          disabled={isPending}
          className="flex w-full items-center px-3 py-2 text-[12.5px] text-ink-700 hover:bg-surface-2"
        >
          {user.active ? "Disattiva" : "Attiva"}
        </button>
        <div className="my-1 h-px bg-border-1" />
        <button
          onClick={onDelete}
          className="flex w-full items-center px-3 py-2 text-[12.5px] text-red-500 hover:bg-red-50"
        >
          Elimina
        </button>
      </div>
    </>
  )
}

function UserFormDialog({
  user,
  onClose,
  onDone,
}: {
  user?: User
  onClose: () => void
  onDone: () => void
}) {
  const isEdit = !!user
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    phone: user?.phone ?? "",
    role: user?.role ?? ("sales" as "sales" | "admin" | "both"),
    territory: user?.territory ?? "",
    color: user?.color ?? SALES_COLORS[0],
    quota: user?.quota ?? 5000,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email) return
    if (!isEdit && !form.password) return

    startTransition(async () => {
      if (isEdit) {
        await updateUser(user!.id, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          territory: form.territory,
          color: form.color,
          quota: form.quota,
        })
      } else {
        await createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          role: form.role,
          territory: form.territory,
          color: form.color,
          quota: form.quota,
        })
      }
      onDone()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-[520px] rounded-[20px] border border-border-1 bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-ink-900">
            {isEdit ? "Modifica Sales" : "Nuovo Sales"}
          </h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-surface-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Nome *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Email *</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              type="email"
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
              required
            />
          </div>

          {!isEdit && (
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Password *</label>
              <input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                type="password"
                className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
                required
                minLength={8}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Telefono</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Territorio</label>
              <input
                value={form.territory}
                onChange={(e) => setForm({ ...form, territory: e.target.value })}
                className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Ruolo</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as "sales" | "admin" | "both" })}
                className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink"
              >
                <option value="sales">Sales</option>
                <option value="admin">Admin</option>
                <option value="both">Sales + Admin</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Quota (€)</label>
              <input
                value={form.quota}
                onChange={(e) => setForm({ ...form, quota: Number(e.target.value) })}
                type="number"
                className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none focus:border-pink focus:ring-2 focus:ring-pink/20"
              />
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Colore</label>
            <div className="flex gap-2">
              {SALES_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className="flex h-7 w-7 items-center justify-center rounded-full transition-transform"
                  style={{
                    backgroundColor: c,
                    transform: form.color === c ? "scale(1.2)" : "scale(1)",
                    outline: form.color === c ? `2px solid ${c}` : "none",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-[999px] border border-border-1 px-4 text-[13px] font-medium text-ink-600 hover:bg-surface-2"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-9 rounded-[999px] bg-pink px-5 text-[13px] font-semibold text-white hover:bg-pink/90 disabled:opacity-50"
            >
              {isPending ? "Salvataggio..." : isEdit ? "Salva" : "Crea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteUserDialog({
  userId,
  onClose,
  onDone,
}: {
  userId: string
  onClose: () => void
  onDone: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteUser(userId)
      onDone()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-[420px] rounded-[20px] border border-border-1 bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-[18px] font-bold text-ink-900">Elimina utente</h2>
        <p className="mb-5 text-[13px] text-ink-500">
          Le autoscuole assegnate a questo utente verranno svincolate. Questa azione è irreversibile.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 rounded-[999px] border border-border-1 px-4 text-[13px] font-medium text-ink-600 hover:bg-surface-2"
          >
            Annulla
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="h-9 rounded-[999px] bg-red-500 px-5 text-[13px] font-semibold text-white hover:bg-red-600 disabled:opacity-50"
          >
            {isPending ? "Eliminazione..." : "Elimina"}
          </button>
        </div>
      </div>
    </div>
  )
}
