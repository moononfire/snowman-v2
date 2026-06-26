'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Search, Check, Lock, Pencil, Trash2, X, Globe, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, MapPin, Tag, Columns3 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { CONTACT_SOURCE_LABEL_KEYS, CONTACT_SOURCE_COLORS, CALL_STATUS_LABEL_KEYS, CALL_STATUS_COLORS, type CallStatus } from '@/lib/callTypes'
import { useT, useDateLocale } from '@/lib/i18n/context'

type ContactSource = 'MANUAL' | 'CSV_IMPORT' | 'GOOGLE_SCRAPE'

export type ContactEmail = { id: string; email: string; isPrimary: boolean }

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
  googleMapsUrl: string | null
  googlePlaceId: string | null
  listContacts: { status: CallStatus; notes: string | null; calledAt: string | null }[]
  _count?: { listContacts: number }
  emails?: ContactEmail[]
}

type SortField = 'company' | 'phone' | 'category' | 'city' | 'email' | 'website' | 'source' | 'status' | 'note' | 'createdAt'
type SortDir = 'asc' | 'desc'

const ALL_SORT_FIELDS: SortField[] = ['company', 'phone', 'category', 'city', 'email', 'website', 'source', 'status', 'note', 'createdAt']

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
  const t = useT()
  const dateLocale = useDateLocale()

  const WEBSITE_OPTIONS: { value: BoolFilter; label: string }[] = [
    { value: '', label: t('browserAll') },
    { value: 'yes', label: t('browserWithWWW') },
    { value: 'no', label: t('browserWithoutWWW') },
  ]

  const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
    { value: '', label: t('browserAll') },
    { value: 'MANUAL', label: t('browserManual') },
    { value: 'CSV_IMPORT', label: t('browserCSV') },
    { value: 'GOOGLE_SCRAPE', label: t('browserGoogle') },
  ]

  const EMAIL_OPTIONS: { value: BoolFilter; label: string }[] = [
    { value: '', label: t('browserAll') },
    { value: 'yes', label: t('browserWithEmail') },
    { value: 'no', label: t('browserWithoutEmail') },
  ]

  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('')
  const [emailFilter, setEmailFilter] = useState<BoolFilter>('')
  const [websiteFilter, setWebsiteFilter] = useState<BoolFilter>('')
  const [statusFilter, setStatusFilter] = useState<CallStatus[]>([])
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const statusDropdownRef = useRef<HTMLDivElement>(null)
  const [cityFilter, setCityFilter] = useState<string[]>([])
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false)
  const [citySearch, setCitySearch] = useState('')
  const cityDropdownRef = useRef<HTMLDivElement>(null)
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [emailPickerContactId, setEmailPickerContactId] = useState<string | null>(null)
  const emailPickerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false)
  const columnsDropdownRef = useRef<HTMLDivElement>(null)
  const [visibleColumns, setVisibleColumns] = useState<Set<SortField>>(new Set(ALL_SORT_FIELDS))

  useEffect(() => {
    try {
      const stored = localStorage.getItem('contacts-visible-columns')
      if (stored) {
        const parsed: SortField[] = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) setVisibleColumns(new Set(parsed))
      }
    } catch {}
  }, [])

  const excludeIdsKey = excludeIds.join(',')

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (sourceFilter) params.set('source', sourceFilter)
    if (emailFilter) params.set('hasEmail', emailFilter)
    if (websiteFilter) params.set('hasWebsite', websiteFilter)
    if (cityFilter.length > 0) params.set('city', cityFilter.join(','))
    if (categoryFilter.length > 0) params.set('tags', categoryFilter.join(','))
    const res = await fetch(`/api/contacts?${params}`)
    if (res.ok) {
      const all: Contact[] = await res.json()
      const excludeSet = new Set(excludeIdsKey ? excludeIdsKey.split(',') : [])
      setContacts(excludeSet.size ? all.filter((c) => !excludeSet.has(c.id)) : all)
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sourceFilter, emailFilter, websiteFilter, cityFilter, categoryFilter, excludeIdsKey, refreshKey])

  useEffect(() => {
    const tm = setTimeout(fetchContacts, 200)
    return () => clearTimeout(tm)
  }, [fetchContacts])

  useEffect(() => {
    fetch('/api/contacts/cities')
      .then((r) => (r.ok ? r.json() : []))
      .then(setAvailableCities)
    fetch('/api/contacts/categories')
      .then((r) => (r.ok ? r.json() : []))
      .then(setAvailableCategories)
  }, [refreshKey])

  function toggleColumn(field: SortField) {
    setVisibleColumns((prev) => {
      const next = new Set(prev)
      if (next.has(field)) {
        if (next.size <= 1) return prev
        next.delete(field)
      } else {
        next.add(field)
      }
      try { localStorage.setItem('contacts-visible-columns', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setCityDropdownOpen(false)
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false)
      }
      if (columnsDropdownRef.current && !columnsDropdownRef.current.contains(e.target as Node)) {
        setColumnsDropdownOpen(false)
      }
      if (emailPickerRef.current && !emailPickerRef.current.contains(e.target as Node)) {
        setEmailPickerContactId(null)
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

  const filteredCategories = useMemo(() => {
    if (!categorySearch) return availableCategories
    const q = categorySearch.toLowerCase()
    return availableCategories.filter((c) => c.toLowerCase().includes(q))
  }, [availableCategories, categorySearch])

  const BLOCKED_STATUSES = new Set<CallStatus>(['INTERESTED', 'NOT_INTERESTED', 'NOT_RELEVANT', 'WRONG_NUMBER'])

  function isOccupied(c: Contact) {
    if (!selectable) return false
    if ((c._count?.listContacts ?? 0) > 0) return true
    const status = c.listContacts[0]?.status as CallStatus | undefined
    return status !== undefined && BLOCKED_STATUSES.has(status)
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

  const hasActiveFilters = sourceFilter || emailFilter || websiteFilter || cityFilter.length > 0 || categoryFilter.length > 0 || statusFilter.length > 0

  function clearFilters() {
    setSourceFilter('')
    setEmailFilter('')
    setWebsiteFilter('')
    setStatusFilter([])
    setCityFilter([])
    setCitySearch('')
    setCategoryFilter([])
    setCategorySearch('')
  }

  const availableContacts = contacts.filter((c) => !isOccupied(c))
  const allSelected = availableContacts.length > 0 && availableContacts.every((c) => selected.has(c.id))
  const someSelected = !allSelected && availableContacts.some((c) => selected.has(c.id))
  const hasFilters = search || hasActiveFilters
  const showActions = !!(onEdit || onDelete || rowActions)
  const colCount = visibleColumns.size + (selectable ? 1 : 0) + (showActions ? 1 : 0)

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
      case 'company': return (c.company ?? '').toLowerCase()
      case 'phone': return c.phone
      case 'category': return (c.tags ?? '').toLowerCase()
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
    let list = [...contacts]
    if (statusFilter.length > 0) {
      list = list.filter((c) => {
        const effectiveStatus: CallStatus = (c.listContacts[0]?.status as CallStatus) ?? 'NOT_CALLED'
        return statusFilter.includes(effectiveStatus)
      })
    }
    list.sort((a, b) => {
      const va = getContactSortValue(a, sortField)
      const vb = getContactSortValue(b, sortField)
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, sortField, sortDir, statusFilter])

  return (
    <div>
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t('browserSearchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter bar */}
      <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 mb-4">
        <div className="grid grid-cols-[auto_1fr] gap-y-2.5 items-center text-xs">
          <span className="text-muted-foreground font-medium w-24">{t('browserFilterSource')}</span>
          <div className="flex flex-wrap gap-1">
            {SOURCE_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setSourceFilter(o.value)}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors ${sourceFilter === o.value ? 'bg-foreground text-background' : 'bg-background border border-border text-muted-foreground hover:text-foreground'}`}>
                {o.label}
              </button>
            ))}
          </div>

<span className="text-muted-foreground font-medium w-24">{t('browserFilterEmail')}</span>
          <div className="flex flex-wrap gap-1">
            {EMAIL_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setEmailFilter(o.value)}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors ${emailFilter === o.value ? 'bg-foreground text-background' : 'bg-background border border-border text-muted-foreground hover:text-foreground'}`}>
                {o.label}
              </button>
            ))}
          </div>

          <span className="text-muted-foreground font-medium w-24">{t('browserFilterWebsite')}</span>
          <div className="flex flex-wrap gap-1">
            {WEBSITE_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setWebsiteFilter(o.value)}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors ${websiteFilter === o.value ? 'bg-foreground text-background' : 'bg-background border border-border text-muted-foreground hover:text-foreground'}`}>
                {o.label}
              </button>
            ))}
          </div>

          <span className="text-muted-foreground font-medium w-24">{t('browserFilterCalls')}</span>
          <div className="flex items-center gap-2">
            <div className="relative" ref={statusDropdownRef}>
              <button
                onClick={() => setStatusDropdownOpen((o) => !o)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium text-xs transition-colors ${
                  statusFilter.length > 0
                    ? 'bg-foreground text-background'
                    : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {statusFilter.length === 0 ? t('browserAllContacts') : statusFilter.length === 1 ? t(CALL_STATUS_LABEL_KEYS[statusFilter[0]]) : `${statusFilter.length} ${t('browserSelected')}`}
                <ChevronDown className="h-3 w-3" />
              </button>
              {statusDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="py-1">
                    {(Object.keys(CALL_STATUS_LABEL_KEYS) as CallStatus[]).map((status) => {
                      const isSelected = statusFilter.includes(status)
                      return (
                        <button
                          key={status}
                          onClick={() => setStatusFilter((prev) => isSelected ? prev.filter((s) => s !== status) : [...prev, status])}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-2 ${
                            isSelected ? 'font-semibold text-foreground bg-muted/50' : 'text-muted-foreground'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-border'
                          }`}>
                            {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${CALL_STATUS_COLORS[status]}`}>
                            {t(CALL_STATUS_LABEL_KEYS[status])}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            {statusFilter.length > 0 && (
              <button onClick={() => setStatusFilter([])} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <span className="text-muted-foreground font-medium w-24">{t('browserFilterCity')}</span>
          <div className="flex items-center gap-2">
            <div className="relative" ref={cityDropdownRef}>
              <button
                onClick={() => { setCityDropdownOpen((o) => !o); setCitySearch('') }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium text-xs transition-colors ${
                  cityFilter.length > 0
                    ? 'bg-foreground text-background'
                    : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <MapPin className="h-3 w-3" />
                {cityFilter.length === 0 ? t('browserAll') : cityFilter.length === 1 ? cityFilter[0] : `${cityFilter.length} ${t('browserSelected')}`}
                <ChevronDown className="h-3 w-3" />
              </button>
              {cityDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <Input
                      className="h-7 text-xs"
                      placeholder={t('browserSearchCity')}
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCities.map((city) => {
                      const isSelected = cityFilter.includes(city)
                      return (
                        <button
                          key={city}
                          onClick={() => {
                            setCityFilter((prev) =>
                              isSelected ? prev.filter((c) => c !== city) : [...prev, city]
                            )
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-2 ${
                            isSelected ? 'font-semibold text-foreground bg-muted/50' : 'text-muted-foreground'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-border'
                          }`}>
                            {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                          </span>
                          {city}
                        </button>
                      )
                    })}
                    {filteredCities.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">{t('noResults')}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {cityFilter.length > 0 && (
              <button
                onClick={() => { setCityFilter([]); setCitySearch('') }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <span className="text-muted-foreground font-medium w-24">{t('browserFilterCategory')}</span>
          <div className="flex items-center gap-2">
            <div className="relative" ref={categoryDropdownRef}>
              <button
                onClick={() => { setCategoryDropdownOpen((o) => !o); setCategorySearch('') }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium text-xs transition-colors ${
                  categoryFilter.length > 0
                    ? 'bg-foreground text-background'
                    : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Tag className="h-3 w-3" />
                {categoryFilter.length === 0 ? t('browserAll') : categoryFilter.length === 1 ? categoryFilter[0] : `${categoryFilter.length} ${t('browserSelected')}`}
                <ChevronDown className="h-3 w-3" />
              </button>
              {categoryDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <Input
                      className="h-7 text-xs"
                      placeholder={t('browserSearchCategory')}
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCategories.map((cat) => {
                      const isSelected = categoryFilter.includes(cat)
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            setCategoryFilter((prev) =>
                              isSelected ? prev.filter((c) => c !== cat) : [...prev, cat]
                            )
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-2 ${
                            isSelected ? 'font-semibold text-foreground bg-muted/50' : 'text-muted-foreground'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-border'
                          }`}>
                            {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                          </span>
                          {cat}
                        </button>
                      )
                    })}
                    {filteredCategories.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">{t('noResults')}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {categoryFilter.length > 0 && (
              <button
                onClick={() => { setCategoryFilter([]); setCategorySearch('') }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <>
              <span className="text-muted-foreground font-medium w-24" />
              <div>
                <button onClick={clearFilters} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs">
                  <X className="h-3 w-3" />
                  {t('browserClearFilters')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Count + column picker */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-muted-foreground">
          {loading ? '…' : `${sortedContacts.length} ${t('browserContactCount')}`}
        </span>
        <div className="relative" ref={columnsDropdownRef}>
          <button
            onClick={() => setColumnsDropdownOpen((o) => !o)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium text-xs transition-colors border ${
              visibleColumns.size < ALL_SORT_FIELDS.length
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Columns3 className="h-3.5 w-3.5" />
            {t('browserColumns')}
            {visibleColumns.size < ALL_SORT_FIELDS.length && (
              <span className="bg-background/20 rounded-full px-1">{visibleColumns.size}/{ALL_SORT_FIELDS.length}</span>
            )}
          </button>
          {columnsDropdownOpen && (
            <div className="absolute top-full right-0 mt-1 w-52 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="py-1">
                {(ALL_SORT_FIELDS.map((field) => {
                  const labels: Record<SortField, string> = {
                    company: t('browserColCompany'),
                    phone: t('browserColPhone'),
                    category: t('browserColCategory'),
                    city: t('browserColCity'),
                    email: t('browserColEmail'),
                    website: t('browserColWWW'),
                    source: t('browserColSource'),
                    status: t('browserColStatus'),
                    note: t('browserColNote'),
                    createdAt: t('browserColAdded'),
                  }
                  const isVisible = visibleColumns.has(field)
                  const isLast = visibleColumns.size === 1 && isVisible
                  return (
                    <button
                      key={field}
                      onClick={() => toggleColumn(field)}
                      disabled={isLast}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2 ${
                        isLast ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted'
                      } ${isVisible ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        isVisible ? 'bg-blue-600 border-blue-600' : 'border-border'
                      }`}>
                        {isVisible && <Check className="h-2.5 w-2.5 text-white" />}
                      </span>
                      {labels[field]}
                    </button>
                  )
                }))}
              </div>
              {visibleColumns.size < ALL_SORT_FIELDS.length && (
                <div className="border-t border-border px-3 py-1.5">
                  <button
                    onClick={() => {
                      setVisibleColumns(new Set(ALL_SORT_FIELDS))
                      try { localStorage.setItem('contacts-visible-columns', JSON.stringify(ALL_SORT_FIELDS)) } catch {}
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t('browserShowAllColumns')}
                  </button>
                </div>
              )}
            </div>
          )}
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
                ['company', t('browserColCompany')],
                ['phone', t('browserColPhone')],
                ['category', t('browserColCategory')],
                ['city', t('browserColCity')],
                ['email', t('browserColEmail')],
                ['website', t('browserColWWW')],
                ['source', t('browserColSource')],
                ['status', t('browserColStatus')],
                ['note', t('browserColNote')],
                ['createdAt', t('browserColAdded')],
              ] as [SortField, string][]).filter(([field]) => visibleColumns.has(field)).map(([field, label]) => (
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
                  {t('loading')}
                </td>
              </tr>
            )}
            {!loading && contacts.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-muted-foreground">
                  {hasFilters ? t('browserNoResults') : t('browserNoContacts')}
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

                  {visibleColumns.has('company') && (
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const name = c.company || `${c.firstName} ${c.lastName ?? ''}`.trim()
                            if (name) {
                              navigator.clipboard.writeText(name)
                              setCopiedId(`company-${c.id}`)
                              setTimeout(() => setCopiedId((v) => v === `company-${c.id}` ? null : v), 1500)
                            }
                          }}
                          className="hover:text-blue-600 transition-colors cursor-pointer text-left"
                          title={t('browserClickToCopy')}
                        >
                          {copiedId === `company-${c.id}` ? t('copied') : (c.company || `${c.firstName} ${c.lastName ?? ''}`.trim() || '—')}
                        </button>
                        {occupied && (
                          <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            {t('browserOccupied')}
                          </span>
                        )}
                      </div>
                      {(() => {
                        const fullName = `${c.firstName} ${c.lastName ?? ''}`.trim()
                        const isDifferent = c.company && fullName && fullName.toLowerCase() !== c.company.toLowerCase()
                        return (isDifferent || c.position) ? (
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {isDifferent && (
                              <span className="text-xs text-muted-foreground">{fullName}</span>
                            )}
                            {c.position && (
                              <span className="text-xs text-muted-foreground">{isDifferent ? '·' : ''} {c.position}</span>
                            )}
                          </div>
                        ) : null
                      })()}
                    </td>
                  )}

                  {visibleColumns.has('phone') && (
                    <td className="px-4 py-3 font-mono text-sm text-foreground whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(c.phone)
                          setCopiedId(`phone-${c.id}`)
                          setTimeout(() => setCopiedId((v) => v === `phone-${c.id}` ? null : v), 1500)
                        }}
                        className="hover:text-blue-600 transition-colors cursor-pointer"
                        title={t('browserClickToCopy')}
                      >
                        {copiedId === `phone-${c.id}` ? t('copied') : c.phone}
                      </button>
                    </td>
                  )}

                  {visibleColumns.has('category') && (
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {c.tags ? (
                        <span className="text-xs text-muted-foreground">{c.tags}</span>
                      ) : (
                        <span className="text-border">—</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.has('city') && (
                    <td className="px-4 py-3 text-muted-foreground text-sm whitespace-nowrap">
                      {c.city ?? <span className="text-border">—</span>}
                    </td>
                  )}

                  {visibleColumns.has('email') && (
                    <td className="px-4 py-3 text-muted-foreground text-sm" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const emailList = c.emails ?? []
                        const primaryEmail = emailList.find(e => e.isPrimary)?.email ?? c.email
                        if (emailList.length > 1) {
                          return (
                            <div className="relative" ref={emailPickerContactId === c.id ? emailPickerRef : undefined}>
                              <button
                                onClick={() => setEmailPickerContactId(emailPickerContactId === c.id ? null : c.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
                              >
                                {emailList.length} emaile
                              </button>
                              {emailPickerContactId === c.id && (
                                <div className="absolute top-full left-0 mt-1 w-72 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                                  <div className="p-2 border-b border-border">
                                    <p className="text-xs text-muted-foreground font-medium">Wybierz email główny</p>
                                  </div>
                                  <div className="py-1">
                                    {emailList.map((em) => (
                                      <div key={em.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted">
                                        <button
                                          onClick={async () => {
                                            await fetch(`/api/contacts/${c.id}/emails`, {
                                              method: 'PATCH',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ email: em.email }),
                                            })
                                            setEmailPickerContactId(null)
                                            fetchContacts()
                                          }}
                                          className={`flex-1 text-left text-xs font-mono truncate ${em.isPrimary ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                                          title={em.email}
                                        >
                                          {em.email}
                                        </button>
                                        {em.isPrimary && (
                                          <span className="text-xs text-green-600 dark:text-green-400 shrink-0">główny</span>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            navigator.clipboard.writeText(em.email)
                                            setCopiedId(`email-${c.id}-${em.id}`)
                                            setTimeout(() => setCopiedId(null), 1500)
                                          }}
                                          className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                                          title={t('browserClickToCopy')}
                                        >
                                          {copiedId === `email-${c.id}-${em.id}` ? t('copied') : 'kopiuj'}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        }
                        if (primaryEmail) {
                          return (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(primaryEmail)
                                setCopiedId(`email-${c.id}`)
                                setTimeout(() => setCopiedId((v) => v === `email-${c.id}` ? null : v), 1500)
                              }}
                              className="hover:text-blue-600 transition-colors cursor-pointer"
                              title={t('browserClickToCopy')}
                            >
                              {copiedId === `email-${c.id}` ? t('copied') : primaryEmail}
                            </button>
                          )
                        }
                        return <span className="text-border">—</span>
                      })()}
                    </td>
                  )}

                  {visibleColumns.has('website') && (
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
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
                        ) : null}
                        {(c.googleMapsUrl || c.googlePlaceId) ? (
                          <a
                            href={c.googleMapsUrl || `https://www.google.com/maps/place/?q=place_id:${c.googlePlaceId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-green-600 hover:underline"
                            title="Google Maps"
                          >
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span>Maps</span>
                          </a>
                        ) : null}
                        {!c.website && !c.googleMapsUrl && !c.googlePlaceId && (
                          <span className="text-border">—</span>
                        )}
                      </div>
                    </td>
                  )}

                  {visibleColumns.has('source') && (
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONTACT_SOURCE_COLORS[c.source]}`}>
                        {t(CONTACT_SOURCE_LABEL_KEYS[c.source])}
                      </span>
                    </td>
                  )}

                  {visibleColumns.has('status') && (
                    <td className="px-4 py-3">
                      {c.listContacts[0] ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CALL_STATUS_COLORS[c.listContacts[0].status]}`}>
                          {t(CALL_STATUS_LABEL_KEYS[c.listContacts[0].status])}
                        </span>
                      ) : (
                        <span className="text-border text-xs">—</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.has('note') && (
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[220px] truncate">
                      {lastNote ?? <span className="text-border">—</span>}
                    </td>
                  )}

                  {visibleColumns.has('createdAt') && (
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                    </td>
                  )}

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
