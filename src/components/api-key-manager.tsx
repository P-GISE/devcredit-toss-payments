"use client"

import { Copy, KeyRound, Plus, RotateCcw, Trash2 } from "lucide-react"
import { useEffect, useState, useTransition } from "react"
import { z } from "zod"

const ApiKeySchema = z.object({
  id: z.string(),
  keyPrefix: z.string(),
  name: z.string().nullable(),
  status: z.enum(["ACTIVE", "REVOKED"]),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
  revokedAt: z.string().nullable()
})

const ListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ apiKeys: z.array(ApiKeySchema) })
})

const CreateResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    apiKey: ApiKeySchema,
    plaintext: z.string()
  })
})

type ApiKeyRecord = z.infer<typeof ApiKeySchema>

async function loadApiKeys(): Promise<readonly ApiKeyRecord[]> {
  const response = await fetch("/api/api-keys", { cache: "no-store" })
  const payload: unknown = await response.json()
  if (!response.ok) {
    return []
  }
  return ListResponseSchema.parse(payload).data.apiKeys
}

export function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<readonly ApiKeyRecord[]>([])
  const [newKey, setNewKey] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    void loadApiKeys().then(setApiKeys)
  }, [])

  function refreshKeys(): void {
    startTransition(async () => {
      setApiKeys(await loadApiKeys())
    })
  }

  function createKey(): void {
    startTransition(async () => {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "test", name: "Default key" })
      })
      const payload: unknown = await response.json()
      if (!response.ok) {
        return
      }
      const parsed = CreateResponseSchema.parse(payload)
      setNewKey(parsed.data.plaintext)
      setApiKeys((current) => [parsed.data.apiKey, ...current])
    })
  }

  function revokeKey(id: string): void {
    startTransition(async () => {
      await fetch(`/api/api-keys/${id}`, { method: "DELETE" })
      setApiKeys(await loadApiKeys())
    })
  }

  return (
    <section className="rounded-lg border border-[var(--panel-border)] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">API Key</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">원문 키는 발급 직후 한 번만 표시됩니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--panel-border)] bg-white px-3 text-sm font-semibold transition hover:border-[var(--accent)]"
            disabled={isPending}
            onClick={refreshKeys}
            type="button"
          >
            <RotateCcw size={16} aria-hidden="true" />
            새로고침
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--primary)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-strong)] disabled:opacity-60"
            disabled={isPending}
            onClick={createKey}
            type="button"
          >
            <Plus size={16} aria-hidden="true" />
            발급
          </button>
        </div>
      </div>
      {newKey !== null ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-[var(--success)]">새 API Key</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="mono break-all rounded-md bg-white px-3 py-2 text-sm">{newKey}</code>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-300 bg-white px-3 text-sm font-semibold"
              onClick={() => void navigator.clipboard.writeText(newKey)}
              type="button"
            >
              <Copy size={15} aria-hidden="true" />
              복사
            </button>
          </div>
        </div>
      ) : null}
      <div className="mt-5 space-y-3">
        {apiKeys.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--panel-border)] bg-slate-50 px-4 py-6 text-sm text-[var(--muted)]">
            아직 발급된 API Key가 없습니다.
          </div>
        ) : (
          apiKeys.map((apiKey) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--panel-border)] px-4 py-3"
              key={apiKey.id}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-[var(--primary)]">
                  <KeyRound size={16} aria-hidden="true" />
                </span>
                <div>
                  <p className="mono text-sm font-semibold">{apiKey.keyPrefix}...</p>
                  <p className="text-xs text-[var(--muted)]">{apiKey.status}</p>
                </div>
              </div>
              {apiKey.status === "ACTIVE" ? (
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-[var(--danger)] transition hover:bg-red-50"
                  disabled={isPending}
                  onClick={() => revokeKey(apiKey.id)}
                  type="button"
                >
                  <Trash2 size={15} aria-hidden="true" />
                  폐기
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
