"use client"

import { useState, useTransition } from "react"
import { User, Mail, MapPin, Shield } from "lucide-react"
import { changePassword } from "@/lib/actions/users"

type UserInfo = {
  id: string
  name: string
  email: string
  role: string
  territory: string
  avatar: string | null
}

export function ProfiloClient({ user }: { user: UserInfo }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  function handleChangePassword() {
    setMessage(null)

    if (password.length < 8) {
      setMessage({ type: "error", text: "La password deve essere di almeno 8 caratteri" })
      return
    }
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Le password non coincidono" })
      return
    }
    if (!currentPassword) {
      setMessage({ type: "error", text: "Inserisci la password corrente" })
      return
    }

    startTransition(async () => {
      try {
        await changePassword(currentPassword, password)
        setMessage({ type: "success", text: "Password aggiornata con successo" })
        setCurrentPassword("")
        setPassword("")
        setConfirmPassword("")
      } catch (err) {
        setMessage({ type: "error", text: err instanceof Error ? err.message : "Errore durante il cambio password" })
      }
    })
  }

  return (
    <div className="mx-auto max-w-[640px] px-6 py-8">
      <h1 className="mb-6 text-[22px] font-bold tracking-tight text-ink-900">Profilo</h1>

      {/* Avatar + Name */}
      <div className="mb-6 flex items-center gap-4">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink text-[18px] font-bold text-white">
            {initials}
          </div>
        )}
        <div>
          <h2 className="text-[18px] font-bold text-ink-900">{user.name}</h2>
          <p className="text-[13px] text-ink-500">{user.email}</p>
        </div>
      </div>

      {/* Info */}
      <div className="mb-6 rounded-[18px] border border-border-1 bg-surface p-5">
        <h3 className="mb-4 text-[14px] font-semibold text-ink-900">Informazioni</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-ink-400" />
            <span className="w-24 text-[13px] text-ink-500">Nome</span>
            <span className="text-[13px] font-medium text-ink-900">{user.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-ink-400" />
            <span className="w-24 text-[13px] text-ink-500">Email</span>
            <span className="text-[13px] font-medium text-ink-900">{user.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-ink-400" />
            <span className="w-24 text-[13px] text-ink-500">Territorio</span>
            <span className="text-[13px] font-medium text-ink-900">{user.territory}</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-ink-400" />
            <span className="w-24 text-[13px] text-ink-500">Ruolo</span>
            <span className="rounded-[999px] bg-pink/10 px-2 py-0.5 text-[11px] font-semibold text-pink capitalize">
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-[18px] border border-border-1 bg-surface p-5">
        <h3 className="mb-4 text-[14px] font-semibold text-ink-900">Cambio password</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">
              Password corrente
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] outline-none placeholder:text-ink-400 focus:border-pink focus:ring-2 focus:ring-pink/20"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">
              Nuova password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] outline-none placeholder:text-ink-400 focus:border-pink focus:ring-2 focus:ring-pink/20"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">
              Conferma password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] outline-none placeholder:text-ink-400 focus:border-pink focus:ring-2 focus:ring-pink/20"
              placeholder="••••••••"
            />
          </div>

          {message && (
            <div
              className="rounded-[10px] px-3 py-2 text-[12.5px] font-medium"
              style={{
                backgroundColor: message.type === "success" ? "#ECFDF5" : "#FEF2F2",
                color: message.type === "success" ? "#10B981" : "#EF4444",
              }}
            >
              {message.text}
            </div>
          )}

          <button
            onClick={handleChangePassword}
            disabled={isPending}
            className="mt-2 rounded-[999px] bg-pink px-5 py-2 text-[13px] font-semibold text-white hover:bg-pink/90 disabled:opacity-50"
          >
            {isPending ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>
    </div>
  )
}
