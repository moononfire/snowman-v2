'use client'

import { useState, useEffect, useRef } from 'react'
import { ShieldBan, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useT } from '@/lib/i18n/context'

interface BlockedCompaniesProps {
  onChanged?: () => void
}

export function BlockedCompanies({ onChanged }: BlockedCompaniesProps) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [companies, setCompanies] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastDeleted, setLastDeleted] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/contacts/blocked-companies')
      .then((r) => r.ok ? r.json() : { blockedCompanies: [] })
      .then((data) => setCompanies(data.blockedCompanies))
      .finally(() => setLoading(false))
  }, [open])

  async function save(newList: string[]) {
    setSaving(true)
    setLastDeleted(null)
    const res = await fetch('/api/contacts/blocked-companies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockedCompanies: newList }),
    })
    if (res.ok) {
      const data = await res.json()
      setCompanies(data.blockedCompanies)
      if (data.deleted > 0) {
        setLastDeleted(data.deleted)
      }
      onChanged?.()
    }
    setSaving(false)
  }

  function handleAdd() {
    const names = input
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (names.length === 0) return
    const merged = [...companies, ...names]
    setInput('')
    save(merged)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleRemove(name: string) {
    save(companies.filter((c) => c.toLowerCase() !== name.toLowerCase()))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <ShieldBan className="h-4 w-4" />
        {t('blockedCompanies')}
        {companies.length > 0 && (
          <span className="bg-red-500/10 text-red-600 text-xs font-semibold px-1.5 py-0.5 rounded-full ml-1">
            {companies.length}
          </span>
        )}
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <ShieldBan className="h-5 w-5 text-red-500" />
                  {t('blockedCompanies')}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('blockedCompaniesDescription')}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="flex gap-2 mb-4">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('blockedCompaniesPlaceholder')}
                  disabled={saving}
                  autoFocus
                />
                <Button onClick={handleAdd} disabled={!input.trim() || saving} size="sm" className="shrink-0">
                  <Plus className="h-4 w-4 mr-1" />
                  {t('add')}
                </Button>
              </div>

              {lastDeleted !== null && lastDeleted > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs rounded-lg px-3 py-2 mb-3">
                  Usunięto {lastDeleted} {lastDeleted === 1 ? t('blockedCompaniesContact') : lastDeleted < 5 ? t('blockedCompaniesContacts2_4') : t('blockedCompaniesContacts5plus')} z bazy danych.
                </div>
              )}

              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t('loading')}</p>
              ) : companies.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t('blockedCompaniesEmpty')}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {companies.map((name) => (
                    <div
                      key={name}
                      className="flex items-center justify-between bg-muted/50 border border-border rounded-lg px-3 py-2 group"
                    >
                      <span className="text-sm text-foreground">{name}</span>
                      <button
                        onClick={() => handleRemove(name)}
                        disabled={saving}
                        className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center p-5 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {companies.length} {companies.length === 1 ? t('blockedCompanyCount1') : companies.length < 5 ? t('blockedCompanyCount2_4') : t('blockedCompanyCount5plus')} {t('blockedCompaniesOnList')}
              </span>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t('close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
