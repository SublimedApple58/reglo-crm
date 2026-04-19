"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Credenziali non valide")
      setLoading(false)
    } else {
      router.push("/")
      router.refresh()
    }
  }

  return (
    <div className="w-full max-w-[400px] px-6">
      <div className="mb-8 text-center">
        <div className="mb-2 flex items-center justify-center gap-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ink-900 text-[15px] font-bold text-white">
            R
          </div>
          <span className="text-[22px] font-bold tracking-tight text-ink-900">
            reglo<span className="text-pink">.</span>
          </span>
        </div>
        <p className="text-[13px] font-medium text-ink-500">CRM Sales</p>
      </div>

      <div className="rounded-[20px] border border-border-1 bg-surface p-7 shadow-[var(--shadow)]">
        <h1 className="mb-1 text-[18px] font-semibold text-ink-900">Accedi</h1>
        <p className="mb-6 text-[13px] text-ink-500">Inserisci le tue credenziali per continuare</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@reglo.it"
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-pink focus:ring-2 focus:ring-pink/20"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-[38px] w-full rounded-[10px] border border-border-1 bg-surface px-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-pink focus:ring-2 focus:ring-pink/20"
              required
            />
          </div>

          {error && (
            <p className="text-[12.5px] font-medium text-red">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 h-[38px] rounded-[999px] bg-pink text-[13px] font-semibold text-white transition-colors hover:bg-pink/90 disabled:opacity-50"
          >
            {loading ? "Accesso in corso…" : "Accedi"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-[11.5px] text-ink-400">
        © 2026 Reglo · Tutti i diritti riservati
      </p>
    </div>
  )
}
