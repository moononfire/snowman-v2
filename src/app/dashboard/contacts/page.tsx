'use client'

import { useState } from 'react'
import { UserPlus, Upload, ListPlus, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ContactForm } from '@/components/contact-form'
import { ImportModal } from '@/components/import-modal'
import { ContactsBrowser, Contact } from '@/components/contacts-browser'
import { BlockedCompanies } from '@/components/blocked-companies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import NewGoogleScrapeButton from '@/app/dashboard/runs/NewGoogleScrapeButton'
import { useT } from '@/lib/i18n/context'

export default function ContactsPage() {
  const router = useRouter()
  const t = useT()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [scrapingEmails, setScrapingEmails] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const [showCreateList, setShowCreateList] = useState(false)
  const [listName, setListName] = useState('')
  const [listDesc, setListDesc] = useState('')
  const [creatingList, setCreatingList] = useState(false)

  async function deleteContact(id: string) {
    if (!confirm(t('contactsConfirmDelete'))) return
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setRefreshKey((k) => k + 1)
  }

  async function scrapeEmailsForSelected() {
    if (selected.size === 0) return
    setScrapingEmails(true)
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: 'scrape_contact_emails',
          params: { contact_ids: [...selected].join(',') },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? t('scrapeServerError'))
        return
      }
      router.push(`/dashboard/runs/${data.runId}`)
    } finally {
      setScrapingEmails(false)
    }
  }

  async function createListFromSelected() {
    if (!listName || selected.size === 0) return
    setCreatingList(true)
    const res = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: listName, description: listDesc || undefined }),
    })
    const list = await res.json()
    await fetch(`/api/lists/${list.id}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactIds: [...selected] }),
    })
    setCreatingList(false)
    router.push(`/dashboard/lists/${list.id}`)
  }

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('contactsTitle')}</h1>
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
          <BlockedCompanies onChanged={() => setRefreshKey((k) => k + 1)} />
          <NewGoogleScrapeButton />
          <Button variant="outline" className="w-full md:w-auto" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-2" />
            {t('contactsImportCSV')}
          </Button>
          <Button className="w-full md:w-auto" onClick={() => { setEditing(null); setShowForm(true) }}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t('contactsAdd')}
          </Button>
        </div>
      </div>

      <ContactsBrowser
        selectable
        selected={selected}
        onSelectionChange={setSelected}
        refreshKey={refreshKey}
        onEdit={(c) => { setEditing(c); setShowForm(true) }}
        onDelete={deleteContact}
      />

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border shadow-lg rounded-full px-6 py-3 flex items-center gap-4 z-40">
          <span className="text-sm font-medium text-foreground">
            {selected.size} {t('contactsSelected')}
          </span>
          <Button size="sm" variant="outline" onClick={scrapeEmailsForSelected} disabled={scrapingEmails}>
            <Mail className="h-3.5 w-3.5 mr-1.5" />
            {scrapingEmails ? t('scrapeEmailsRunning') : t('scrapeEmailsButton')}
          </Button>
          <Button size="sm" onClick={() => setShowCreateList(true)}>
            <ListPlus className="h-3.5 w-3.5 mr-1.5" />
            {t('contactsCreateList')}
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t('contactsClear')}
          </button>
        </div>
      )}

      {showForm && (
        <ContactForm
          contact={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); setRefreshKey((k) => k + 1) }}
        />
      )}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); setRefreshKey((k) => k + 1) }}
        />
      )}

      {showCreateList && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md border border-border p-6">
            <h2 className="font-semibold text-foreground mb-1">{t('contactsCreateListTitle')}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {selected.size} {t('contactsCreateListDescription')}
            </p>
            <div className="space-y-3">
              <div>
                <Label>{t('contactsNameRequired')}</Label>
                <Input
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  className="mt-1"
                  placeholder={t('contactsPlaceholderName')}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && createListFromSelected()}
                />
              </div>
              <div>
                <Label>{t('contactsDescriptionOptional')}</Label>
                <Input
                  value={listDesc}
                  onChange={(e) => setListDesc(e.target.value)}
                  className="mt-1"
                  placeholder={t('contactsPlaceholderDesc')}
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Button
                  variant="outline"
                  onClick={() => { setShowCreateList(false); setListName(''); setListDesc('') }}
                >
                  {t('cancel')}
                </Button>
                <Button onClick={createListFromSelected} disabled={!listName || creatingList}>
                  {creatingList ? t('creating') : t('contactsCreateAndGo')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
