'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Search, Check, Lock, Pencil, Trash2, X, Globe, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { CONTACT_SOURCE_LABELS, CONTACT_SOURCE_COLORS, CALL_STATUS_LABELS, CALL_STATUS_COLORS, type CallStatus } from '@/lib/callTypes'

type ContactSource = 'MANUAL' | 'CSV_IMPORT' | 'GOOGLE_SCRAPE'

export type Contact = {
  id: string
  firstName: string
  lastName: string | null
  phone: string
  company: string | null
  position: string | null
  email: string | null
  website: string | null
  city: string | null
  preCallNote: string | null
  postCallNote: string | null
  tags: string | null
  source: ContactSource
  createdAt: string
  listContacts: { status: CallStatus; notes: string | null; calledAt: string | null }[]
  _count?: { listContacts: number }
}

type SortField = 'name' | 'phone' | 'company' | 'city' | 'email' | 'website' | 'source' | 'status' | 'note' | 'createdAt'
type SortDir = 'asc' | 'desc'

interface ContactsBrowserProps {
  selectable?: boolean
  excludeIds?: string[]
  selected: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onEdit?: (contact: Contact) => void
  onDelete?: (id: string) => void
  refreshKey?: number
  /** @deprecated use onEdit/onDelete */
  rowActions?: (contact: Contact) => React.ReactNode
}

type SourceFilter = '' | 'MANUAL' | 'CSV_IMPORT' | 'GOOGLE_SCRAPE'
type BoolFilter = '' | 'yes' | 'no'

const WEBSITE_OPTIONS: { value: BoolFilter; label: string }[] = [
  { value: '', label: 'Wszystkie' },
  { value: 'yes', label: 'Z WWW' },
  { value: 'no', label: 'Bez WWW' },
]

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: '', label: 'Wszystkie' },
  { value: 'MANUAL', label: 'Ręczne' },
  { value: 'CSV_IMPORT', label: 'CSV' },
  { value: 'GOOGLE_SCRAPE', label: 'Google' },
]

const CALLED_OPTIONS: { value: BoolFilter; label: string }[] = [
  { value: '', label: 'Wszyscy' },
  { value: 'yes', label: 'Obdzwonieni' },
  { value: 'no', label: 'Nieobdzwonieni' },
]

const COMPANY_OPTIONS: { value: BoolFilter; label: string }[] = [
  { value: '', label: 'Wszystkie' },
  { value: 'yes', label: 'Z firmą' },
  { value: 'no', label: 'Bez' },
]

const EMAIL_OPTIONS: { value: BoolFilter; label: string }[] = [
  { value: '', label: 'Wszystkie' },
  { value: 'yes', label: 'Z emailem' },
  { value: 'no', label: 'Bez' },
]


export function ContactsBrowser({
  selectable = false,
  excludeIds = [],
  selected,
  onSelectionChange,
  onEdit,
  onDelete,
  rowActions,
  refreshKey = 0,
}: ContactsBrowserProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('')
  const [tagsFilter, setTagsFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState<BoolFilter>('')
  const [emailFilter, setEmailFilter] = useState<BoolFilter>('')
  const [websiteFilter, setWebsiteFilter] = useState<BoolFilter>('')
  const [calledFilter, setCalledFilter] = useState<BoolFilter>('')
  const [cityFilter, setCityFilter] = useState('')
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false)
  const [citySearch, setCitySearch] = useState('')
  const cityDropdownRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const excludeIdsKey = excludeIds.join(',')

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (sourceFilter) params.set('source', sourceFilter)
    if (tagsFilter) params.set('tags', tagsFilter)
    if (companyFilter) params.set('hasCompany', companyFilter)
    if (emailFilter) params.set('hasEmail', emailFilter)
    if (websiteFilter) params.set('hasWebsite', websiteFilter)
    if (calledFilter) params.set('called', calledFilter)
    if (cityFilter) params.set('city', cityFilter)
    const res = await fetch(`/api/contacts?${params}`)
    if (res.ok) {
      const all: Contact[] = await res.json()
      const excludeSet = new Set(excludeIdsKey ? excludeIdsKey.split(',') : [])
      setContacts(excludeSet.size ? all.filter((c) => !excludeSet.has(c.id)) : all)
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sourceFilter, tagsFilter, companyFilter, emailFilter, websiteFilter, calledFilter, cityFilter, excludeIdsKey, refreshKey])

  useEffect(() => {
    const t = setTimeout(fetchContacts, 200)
    return () => clearTimeout(t)
  }, [fetchContacts])

  useEffect(() => {
    fetch('/api/contacts/cities')
      .then((r) => (r.ok ? r.json() : []))
      .then(setAvailableCities)
  }, [refreshKey])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setCityDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredCities = useMemo(() => {
    if (!citySearch) return availableCities
    const q = citySearch.toLowerCase()
    return availableCities.filter((c) => c.toLowerCase().includes(q))
  }, [availableCities, citySearch])

  function isOccupied(c: Contact) {
    return selectable && (c._count?.listContacts ?? 0) > 0
  }

  function toggleContact(c: Contact) {
    if (isOccupied(c)) return
    const next = new Set(selected)
    next.has(c.id) ? next.delete(c.id) : next.add(c.id)
    onSelectionChange(next)
  }

  function toggleAll() {
    const availableIds = contacts.filter((c) => !isOccupied(c)).map((c) => c.id)
    const allSelected = availableIds.every((id) => selected.has(id))
    const next = new Set(selected)
    if (allSelected) {
      availableIds.forEach((id) => next.delete(id))
    } else {
      availableIds.forEach((id) => next.add(id))
    }
    onSelectionChange(next)
  }

  const hasActiveFilters = sourceFilter || tagsFilter || companyFilter || emailFilter || websiteFilter || calledFilter || cityFilter

  function clearFilters() {
    setSourceFilter('')
    setTagsFilter('')
    setCompanyFilter('')
    setEmailFilter('')
    setWebsiteFilter('')
    setCalledFilter('')
    setCityFilter('')
    setCitySearch('')
  }

  const availableContacts = contacts.filter((c) => !isOccupied(c))
  const allSelected = availableContacts.length > 0 && availableContacts.every((c) => selected.has(c.id))
  const someSelected = !allSelected && availableContacts.some((c) => selected.has(c.id))
  const hasFilters = search || hasActiveFilters
  const showActions = !!(onEdit || onDelete || rowActions)
  const colCount = 10 + (selectable ? 1 : 0) + (showActions ? 1 : 0)

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

  function getContactSortValue(c: Contact, field: SortField): string {
    switch (field) {
      case 'name': return `${c.firstName} ${c.lastName ?? ''}`.toLowerCase()
      case 'phone': return c.phone
      case 'company': return (c.company ?? '').toLowerCase()
      case 'city': return (c.city ?? '').toLowerCase()
      case 'email': return (c.email ?? '').toLowerCase()
      case 'website': return (c.website ?? '').toLowerCase()
      case 'source': return c.source
      case 'status': return c.listContacts[0]?.status ?? ''
      case 'note': return (c.listContacts[0]?.notes ?? c.postCallNote ?? c.preCallNote ?? '').toLowerCase()
      case 'createdAt': return c.createdAt ?? ''
    }
  }

  const sortedContacts = useMemo(() => {
    const sorted = [...contacts].sort((a, b) => {
      const va = getContactSortValue(a, sortField)
      const vb = getContactSortValue(b, sortField)
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, sortField, sortDir])

  return (
    <div>
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Szukaj po nazwie, telefonie, firmie, tagach..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter bar */}
      <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 mb-4">
        <div className="grid grid-cols-[auto_1fr] gap-y-2.5 items-center text-xs">
          <span className="text-muted-foreground font-medium w-24">Źródło</span>
          <div className="flex flex-wrap gap-1">
            {SOURCE_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setSourceFilter(o.value)}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors ${sourceFilter === o.value ? 'bg-foreground text-background' : 'bg-background border border-border text-muted-foreground hover:text-foreground'}`}>
                {o.label}
              </button>
            ))}
          </div>

          <span className="text-muted-foreground font-medium w-24">Firma</span>
          <div className="flex flex-wrap gap-1">
            {COMPANY_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setCompanyFilter(o.value)}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors ${companyFilter === o.value ? 'bg-foreground text-background' : 'bg-background border border-border text-muted-foreground hover:text-foreground'}`}>
                {o.label}
              </button>
            ))}
          </div>

          <span className="text-muted-foreground font-medium w-24">Email</span>
          <div className="flex flex-wrap gap-1">
            {EMAIL_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setEmailFilter(o.value)}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors ${emailFilter === o.value ? 'bg-foreground text-background' : 'bg-background border border-border text-muted-foreground hover:text-foreground'}`}>
                {o.label}
              </button>
            ))}
          </div>

          <span className="text-muted-foreground font-medium w-24">Strona www</span>
          <div className="flex flex-wrap gap-1">
            {WEBSITE_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setWebsiteFilter(o.value)}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors ${websiteFilter === o.value ? 'bg-foreground text-background' : 'bg-background border border-border text-muted-foreground hover:text-foreground'}`}>
                {o.label}
              </button>
            ))}
          </div>

          <span className="text-muted-foreground font-medium w-24">Rozmowy</span>
          <div className="flex flex-wrap gap-1">
            {CALLED_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setCalledFilter(o.value)}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors ${calledFilter === o.value ? 'bg-foreground text-background' : 'bg-background border border-border text-muted-foreground hover:text-foreground'}`}>
                {o.label}
              </button>
            ))}
          </div>

          <span className="text-muted-foreground font-medium w-24">Miejscowość</span>
          <div className="flex items-center gap-2">
            <div className="relative" ref={cityDropdownRef}>
              <button
                onClick={() => { setCityDropdownOpen((o) => !o); setCitySearch('') }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium text-xs transition-colors ${
                  cityFilter
                    ? 'bg-foreground text-background'
                    : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <MapPin className="h-3 w-3" />
                {cityFilter || 'Wszystkie'}
                <ChevronDown className="h-3 w-3" />
              </button>
              {cityDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <Input
                      className="h-7 text-xs"
                      placeholder="Szukaj miasta..."
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <button
                      onClick={() => { setCityFilter(''); setCityDropdownOpen(false) }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors ${
                        !cityFilter ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      Wszystkie
                    </button>
                    {filteredCities.map((city) => (
                      <button
                        key={city}
                        onClick={() => { setCityFilter(city); setCityDropdownOpen(false) }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors ${
                          cityFilter === city ? 'font-semibold text-foreground bg-muted/50' : 'text-muted-foreground'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                    {filteredCities.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Brak wyników</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {cityFilter && (
              <button
                onClick={() => { setCityFilter(''); setCitySearch('') }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <span className="text-muted-foreground font-medium w-24">Tagi</span>
          <div className="flex items-center gap-2">
            <Input
              className="h-7 text-xs w-36"
              placeholder="np. VIP"
              value={tagsFilter}
              onChange={(e) => setTagsFilter(e.target.value)}
            />
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
                Wyczyść
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[1250px]">
          <thead className="bg-muted border-b border-border">
            <tr>
              {selectable && (
                <th className="px-4 py-3 w-10">
                  <button
                    onClick={toggleAll}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mx-auto ${
                      allSelected
                        ? 'bg-blue-600 border-blue-600'
                        : someSelected
                        ? 'bg-blue-400 border-blue-400'
                        : 'border-border hover:border-blue-400'
                    }`}
                  >
                    {(allSelected || someSelected) && <Check className="h-3 w-3 text-white" />}
                  </button>
                </th>
              )}
              {([
                ['name', 'Imię i nazwisko'],
                ['phone', 'Telefon'],
                ['company', 'Firma'],
                ['city', 'Miejscowość'],
                ['email', 'Email'],
                ['website', 'WWW'],
                ['source', 'Źródło'],
                ['status', 'Status'],
                ['note', 'Notatka'],
                ['createdAt', 'Dodano'],
              ] as [SortField, string][]).map(([field, label]) => (
                <th
                  key={field}
                  onClick={() => toggleSort(field)}
                  className={`text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors${field === 'note' ? ' max-w-[220px]' : ''}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <SortIcon field={field} />
                  </span>
                </th>
              ))}
              {showActions && <th className="px-4 py-3 w-20" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-muted-foreground">
                  Ładowanie...
                </td>
              </tr>
            )}
            {!loading && contacts.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-muted-foreground">
                  {hasFilters ? 'Brak wyników dla wybranych filtrów.' : 'Brak kontaktów.'}
                </td>
              </tr>
            )}
            {sortedContacts.map((c) => {
              const occupied = isOccupied(c)
              const lastNote = c.listContacts[0]?.notes ?? c.postCallNote ?? c.preCallNote
              return (
                <tr
                  key={c.id}
                  className={`${occupied ? 'cursor-not-allowed' : ''} ${
                    selectable && !occupied ? 'hover:bg-muted/50 cursor-pointer select-none' : ''
                  } ${selectable && selected.has(c.id) ? 'bg-blue-500/5' : ''}`}
                  onClick={selectable && !occupied ? () => toggleContact(c) : undefined}
                >
                  {selectable && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {occupied ? (
                        <div className="w-5 h-5 flex items-center justify-center mx-auto text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" />
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleContact(c)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mx-auto ${
                            selected.has(c.id) ? 'bg-blue-600 border-blue-600' : 'border-border'
                          }`}
                        >
                          {selected.has(c.id) && <Check className="h-3 w-3 text-white" />}
                        </button>
                      )}
                    </td>
                  )}

                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {c.firstName} {c.lastName}
                      {occupied && (
                        <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          zajęty
                        </span>
                      )}
                    </div>
                    {(c.position || c.tags) && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {c.position && (
                          <span className="text-xs text-muted-foreground">{c.position}</span>
                        )}
                        {c.tags && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {c.tags}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 font-mono text-sm text-foreground whitespace-nowrap">
                    {c.phone}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {c.company ?? <span className="text-border">—</span>}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground text-sm whitespace-nowrap">
                    {c.city ?? <span className="text-border">—</span>}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {c.email ?? <span className="text-border">—</span>}
                  </td>

                  <td className="px-4 py-3">
                    {c.website ? (
                      <a
                        href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        title={c.website}
                      >
                        <Globe className="h-3.5 w-3.5 shrink-0" />
                        <span className="max-w-[120px] truncate">{c.website.replace(/^https?:\/\//, '')}</span>
                      </a>
                    ) : (
                      <span className="text-border">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONTACT_SOURCE_COLORS[c.source]}`}>
                      {CONTACT_SOURCE_LABELS[c.source]}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {c.listContacts[0] ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CALL_STATUS_COLORS[c.listContacts[0].status]}`}>
                        {CALL_STATUS_LABELS[c.listContacts[0].status]}
                      </span>
                    ) : (
                      <span className="text-border text-xs">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[220px] truncate">
                    {lastNote ?? <span className="text-border">—</span>}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                  </td>

                  {showActions && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        {rowActions?.(c)}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(c)}
                            className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 rounded"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(c.id)}
                            className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
