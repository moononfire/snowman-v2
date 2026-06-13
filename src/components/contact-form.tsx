'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Contact = {
  id?: string
  firstName: string
  lastName: string | null
  phone: string
  company: string | null
  position: string | null
  email: string | null
  preCallNote: string | null
  postCallNote: string | null
  tags: string | null
}

export function ContactForm({
  contact,
  onClose,
  onSaved,
}: {
  contact: Contact | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    firstName: contact?.firstName ?? '',
    lastName: contact?.lastName ?? '',
    phone: contact?.phone ?? '',
    company: contact?.company ?? '',
    position: contact?.position ?? '',
    email: contact?.email ?? '',
    preCallNote: contact?.preCallNote ?? '',
    postCallNote: contact?.postCallNote ?? '',
    tags: contact?.tags ?? '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  async function save() {
    if (!form.firstName || !form.phone) return
    setSaving(true)
    const url = contact?.id ? `/api/contacts/${contact.id}` : '/api/contacts'
    const method = contact?.id ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-lg border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">
            {contact?.id ? 'Edytuj kontakt' : 'Nowy kontakt'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Imię *</Label>
              <Input value={form.firstName} onChange={set('firstName')} className="mt-1" />
            </div>
            <div>
              <Label>Nazwisko</Label>
              <Input value={form.lastName} onChange={set('lastName')} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Telefon *</Label>
            <Input value={form.phone} onChange={set('phone')} className="mt-1" placeholder="+48 000 000 000" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Firma</Label>
              <Input value={form.company} onChange={set('company')} className="mt-1" />
            </div>
            <div>
              <Label>Stanowisko</Label>
              <Input value={form.position} onChange={set('position')} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input value={form.email} onChange={set('email')} className="mt-1" type="email" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Notatka przed rozmową</Label>
              <Textarea
                value={form.preCallNote}
                onChange={set('preCallNote')}
                className="mt-1"
                rows={2}
                placeholder="Kontekst, co wiemy o osobie..."
              />
            </div>
            <div>
              <Label>Notatka po rozmowie</Label>
              <Textarea
                value={form.postCallNote}
                onChange={set('postCallNote')}
                className="mt-1"
                rows={2}
                placeholder="Co ustalono, co warto zapamiętać..."
              />
            </div>
          </div>
          <div>
            <Label>Tagi (oddziel przecinkiem)</Label>
            <Input value={form.tags} onChange={set('tags')} className="mt-1" placeholder="B2B, warm, CEO..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button onClick={save} disabled={saving || !form.firstName || !form.phone}>
            {saving ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </div>
      </div>
    </div>
  )
}
