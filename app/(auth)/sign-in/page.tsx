"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const urlError = searchParams.get("error")

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

  function handleGoogleSignIn() {
    signIn("google", { callbackUrl: "/" })
  }

  return (
    <div className="rounded-[20px] border border-border-1 bg-surface p-7 shadow-[var(--shadow)]">
      <h1 className="mb-1 text-[18px] font-semibold text-ink-900">Accedi</h1>
      <p className="mb-6 text-[13px] text-ink-500">Inserisci le tue credenziali per continuare</p>

      {(error || urlError) && (
        <p className="mb-4 rounded-[10px] bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-600">
          {error || "Account Google non autorizzato. Contatta l'admin."}
        </p>
      )}

      {/* Google SSO */}
      <button
        onClick={handleGoogleSignIn}
        className="flex h-[38px] w-full items-center justify-center gap-2.5 rounded-[999px] border border-border-1 bg-white text-[13px] font-semibold text-ink-700 transition-colors hover:bg-surface-2"
      >
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Accedi con Google
      </button>

      {/* Separator */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border-1" />
        <span className="text-[11.5px] font-medium text-ink-400">oppure</span>
        <div className="h-px flex-1 bg-border-1" />
      </div>

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

        <button
          type="submit"
          disabled={loading}
          className="mt-1 h-[38px] rounded-[999px] bg-pink text-[13px] font-semibold text-white transition-colors hover:bg-pink/90 disabled:opacity-50"
        >
          {loading ? "Accesso in corso…" : "Accedi"}
        </button>
      </form>
    </div>
  )
}

export default function SignInPage() {
  return (
    <div className="w-full max-w-[400px] px-6">
      <div className="mb-8 text-center">
        <div className="mb-2 flex items-center justify-center gap-1">
          <img src="/reglo-logo.png" alt="Reglo" className="h-9 w-9 rounded-[10px]" />
          <span className="text-[22px] font-bold tracking-tight text-ink-900">
            reglo<span className="text-pink">.</span>
          </span>
        </div>
        <p className="text-[13px] font-medium text-ink-500">CRM Sales</p>
      </div>

      <Suspense>
        <SignInForm />
      </Suspense>

      <p className="mt-6 text-center text-[11.5px] text-ink-400">
        © 2026 Reglo · Tutti i diritti riservati
      </p>
    </div>
  )
}
