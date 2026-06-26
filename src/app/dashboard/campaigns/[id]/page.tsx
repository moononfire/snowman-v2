'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft, Mail, Clock, Phone, ChevronUp, ChevronDown, X, Plus, Save, Loader2,
} from 'lucide-react'
import { useT } from '@/lib/i18n/context'

// ── Types ──────────────────────────────────────────────────────────────────

type EmailStep = {
  id: string
  type: 'send_email'
  subject: string
  body: string
  skipIfReplied: boolean
}
type WaitStep = { id: string; type: 'wait'; days: number }
type CallStep = { id: string; type: 'call' }
type Step = EmailStep | WaitStep | CallStep

type Campaign = {
  id: string
  name: string
  status: string
  listId: string | null
  config: { steps?: Step[] }
}

type ListOption = {
  id: string
  name: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function makeId() {
  return crypto.randomUUID()
}

const STEP_ICONS: Record<Step['type'], React.ReactNode> = {
  send_email: <Mail className="h-4 w-4 text-blue-500" />,
  wait: <Clock className="h-4 w-4 text-amber-500" />,
  call: <Phone className="h-4 w-4 text-green-500" />,
}

const PLACEHOLDERS = ['{imie}', '{firma}', '{www}', '{telefon}']

// ── Step card ──────────────────────────────────────────────────────────────

function StepCard({
  step,
  isFirst,
  isLast,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  step: Step
  isFirst: boolean
  isLast: boolean
  onChange: (updated: Step) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
}) {
  const t = useT()

  const stepLabels: Record<Step['type'], string> = {
    send_email: t('campaignStepEmail'),
    wait: t('campaignStepWait'),
    call: t('campaignStepCall'),
  }

  function insertPlaceholder(field: 'subject' | 'body', placeholder: string) {
    if (step.type !== 'send_email') return
    onChange({ ...step, [field]: (step[field] ?? '') + placeholder } as EmailStep)
  }

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b border-border">
        {STEP_ICONS[step.type]}
        <span className="text-sm font-medium text-foreground flex-1">{stepLabels[step.type]}</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 rounded hover:bg-border disabled:opacity-30 transition-colors"
            title={t('campaignStepMoveUp')}
          >
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 rounded hover:bg-border disabled:opacity-30 transition-colors"
            title={t('campaignStepMoveDown')}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-500/10 hover:text-red-500 transition-colors text-muted-foreground ml-1"
            title={t('campaignStepDelete')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {step.type === 'send_email' && (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('campaignEmailSubject')}</label>
              <div className="flex gap-2">
                <Input
                  value={step.subject}
                  onChange={(e) => onChange({ ...step, subject: e.target.value } as EmailStep)}
                  placeholder={t('campaignEmailSubjectPlaceholder')}
                  className="flex-1"
                />
              </div>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p}
                    onClick={() => insertPlaceholder('subject', p)}
                    className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-border border border-border text-muted-foreground transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('campaignEmailBody')}</label>
              <Textarea
                value={step.body}
                onChange={(e) => onChange({ ...step, body: e.target.value } as EmailStep)}
                placeholder={t('campaignEmailBodyPlaceholder')}
                rows={5}
              />
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p}
                    onClick={() => insertPlaceholder('body', p)}
                    className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-border border border-border text-muted-foreground transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={step.skipIfReplied}
                onChange={(e) => onChange({ ...step, skipIfReplied: e.target.checked } as EmailStep)}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-sm text-foreground">{t('campaignEmailSkipIfReplied')}</span>
            </label>
          </>
        )}

        {step.type === 'wait' && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-foreground whitespace-nowrap">{t('campaignWaitLabel')}</label>
            <Input
              type="number"
              min={1}
              value={step.days}
              onChange={(e) => onChange({ ...step, days: Math.max(1, parseInt(e.target.value) || 1) } as WaitStep)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">
              {step.days === 1 ? t('campaignWaitDay') : t('campaignWaitDays')}
            </span>
          </div>
        )}

        {step.type === 'call' && (
          <p className="text-sm text-muted-foreground">
            {t('campaignCallDescription')}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [name, setName] = useState('')
  const [listId, setListId] = useState('')
  const [lists, setLists] = useState<ListOption[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${id}`)
    if (!res.ok) { router.push('/dashboard/campaigns'); return }
    const data: Campaign = await res.json()
    setCampaign(data)
    setName(data.name)
    setListId(data.listId ?? '')
    setSteps(data.config?.steps ?? [])
    setLoading(false)
  }, [id, router])

  useEffect(() => {
    load()
    fetch('/api/lists').then((r) => r.json()).then((data) => {
      setLists(data.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })))
    })
  }, [load])

  function updateStep(index: number, updated: Step) {
    setSteps((prev) => prev.map((s, i) => (i === index ? updated : s)))
  }

  function deleteStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  function moveStep(index: number, dir: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev]
      const swap = index + dir
      if (swap < 0 || swap >= next.length) return prev
      ;[next[index], next[swap]] = [next[swap], next[index]]
      return next
    })
  }

  function addStep(type: Step['type']) {
    const base = { id: makeId() }
    let step: Step
    if (type === 'send_email') step = { ...base, type, subject: '', body: '', skipIfReplied: false }
    else if (type === 'wait') step = { ...base, type, days: 3 }
    else step = { ...base, type }
    setSteps((prev) => [...prev, step])
  }

  async function save() {
    setSaving(true)
    await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, listId: listId || null, config: { ...(campaign?.config ?? {}), steps } }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> {t('loading')}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Nav */}
      <button
        onClick={() => router.push('/dashboard/campaigns')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('campaignBack')}
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-8">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('campaignNameLabel')}</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-lg font-semibold"
          />
        </div>
        <div className="pt-6">
          <Button onClick={save} disabled={saving}>
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />{t('saving')}</>
              : saved
              ? `✓ ${t('saved')}`
              : <><Save className="h-4 w-4 mr-1.5" />{t('save')}</>
            }
          </Button>
        </div>
      </div>

      {/* List selector */}
      <div className="mb-8">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('campaignListLabel')}</label>
        <select
          value={listId}
          onChange={(e) => setListId(e.target.value)}
          className="w-full border border-border rounded-md px-3 py-2 text-sm bg-card text-foreground"
        >
          <option value="">{t('campaignNoList')}</option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-6">
        {steps.length === 0 && (
          <div className="border border-dashed border-border rounded-lg py-12 text-center text-muted-foreground text-sm">
            {t('campaignNoSteps')}
          </div>
        )}
        {steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            isFirst={i === 0}
            isLast={i === steps.length - 1}
            onChange={(updated) => updateStep(i, updated)}
            onMoveUp={() => moveStep(i, -1)}
            onMoveDown={() => moveStep(i, 1)}
            onDelete={() => deleteStep(i)}
          />
        ))}
      </div>

      {/* Add step buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium mr-1">{t('campaignAddStep')}</span>
        <button
          onClick={() => addStep('send_email')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-sm transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <Mail className="h-3.5 w-3.5 text-blue-500" />
          Email
        </button>
        <button
          onClick={() => addStep('wait')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-sm transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          {t('campaignStepWait')}
        </button>
        <button
          onClick={() => addStep('call')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-sm transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <Phone className="h-3.5 w-3.5 text-green-500" />
          {t('campaignStepCall')}
        </button>
      </div>
    </div>
  )
}
