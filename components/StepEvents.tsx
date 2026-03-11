'use client'

import { useState, useMemo } from 'react'
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import { calculateFullTaxes, calculateBonusTax } from '@/lib/taxes'
import { formatCurrency } from '@/lib/investments'
import type { IncomeData, BudgetData, AllocationData, LifeEvent, LifeEventType } from '@/types/app'

interface Props {
  incomeData: IncomeData
  budgetData: BudgetData
  allocationData: AllocationData
  lifeEvents: LifeEvent[]
  onChange: (events: LifeEvent[]) => void
  onNext: () => void
  onBack: () => void
}

interface EventTemplate {
  type: LifeEventType
  emoji: string
  label: string
  color: string
  category: string
  tagline: string
  defaults: Partial<Pick<LifeEvent, 'incomeChange' | 'expenseChange' | 'oneTimeCash' | 'investingChange'>>
  fields: ('incomeChange' | 'expenseChange' | 'oneTimeCash' | 'investingChange')[]
}

const TEMPLATES: EventTemplate[] = [
  { type: 'raise', emoji: '📈', label: 'Raise / Promotion', color: '#22d17a', category: 'Career',
    tagline: 'Salary bump at your current employer',
    defaults: { incomeChange: 1000, investingChange: 200 }, fields: ['incomeChange', 'investingChange'] },
  { type: 'new_job', emoji: '💼', label: 'New Job', color: '#4da6ff', category: 'Career',
    tagline: 'New employer — income change + transition costs',
    defaults: { incomeChange: 2000, oneTimeCash: -3000 }, fields: ['incomeChange', 'oneTimeCash', 'investingChange'] },
  { type: 'job_loss', emoji: '⚠️', label: 'Job Loss / Gap', color: '#ff5757', category: 'Career',
    tagline: 'Income stops or drops during a gap period',
    defaults: { incomeChange: -5000, investingChange: -500 }, fields: ['incomeChange', 'expenseChange', 'investingChange'] },
  { type: 'side_income', emoji: '💡', label: 'Side Income', color: '#20e2d7', category: 'Career',
    tagline: 'Freelance, consulting, rental, or business',
    defaults: { incomeChange: 1500, investingChange: 300 }, fields: ['incomeChange', 'investingChange'] },
  { type: 'retire', emoji: '🌴', label: 'Retirement', color: '#9f7fff', category: 'Career',
    tagline: 'Income stops — living off portfolio',
    defaults: { incomeChange: -8000, expenseChange: -1000 }, fields: ['incomeChange', 'expenseChange'] },
  { type: 'baby', emoji: '👶', label: 'New Baby / Child', color: '#ff6ac1', category: 'Family',
    tagline: 'One-time costs + ongoing childcare/expenses',
    defaults: { expenseChange: 1500, oneTimeCash: -5000 }, fields: ['expenseChange', 'oneTimeCash', 'investingChange'] },
  { type: 'marriage', emoji: '💍', label: 'Marriage', color: '#f5a623', category: 'Family',
    tagline: 'Wedding costs + shared household economics',
    defaults: { oneTimeCash: -25000, expenseChange: -400 }, fields: ['oneTimeCash', 'incomeChange', 'expenseChange'] },
  { type: 'divorce', emoji: '📋', label: 'Divorce', color: '#ff5757', category: 'Family',
    tagline: 'Legal costs + restructured income/expenses',
    defaults: { oneTimeCash: -15000, expenseChange: 1200, incomeChange: -2000 }, fields: ['oneTimeCash', 'incomeChange', 'expenseChange'] },
  { type: 'home_buy', emoji: '🏠', label: 'Buy a Home', color: '#f5a623', category: 'Housing',
    tagline: 'Down payment + closing + new monthly payment',
    defaults: { oneTimeCash: -60000, expenseChange: 500 }, fields: ['oneTimeCash', 'expenseChange'] },
  { type: 'home_sell', emoji: '🏡', label: 'Sell a Home', color: '#22d17a', category: 'Housing',
    tagline: 'Net proceeds after mortgage payoff',
    defaults: { oneTimeCash: 150000, expenseChange: -200 }, fields: ['oneTimeCash', 'expenseChange'] },
  { type: 'inheritance', emoji: '🏦', label: 'Inheritance / Windfall', color: '#9f7fff', category: 'Windfall',
    tagline: 'One-time cash infusion',
    defaults: { oneTimeCash: 100000, investingChange: 500 }, fields: ['oneTimeCash', 'investingChange'] },
  { type: 'large_expense', emoji: '💸', label: 'Large One-Time Expense', color: '#ff5757', category: 'Windfall',
    tagline: 'Car, reno, medical, tuition, travel',
    defaults: { oneTimeCash: -20000 }, fields: ['oneTimeCash', 'expenseChange'] },
  { type: 'debt_payoff', emoji: '✂️', label: 'Pay Off a Debt', color: '#22d17a', category: 'Windfall',
    tagline: 'Kills a monthly payment and frees cash flow',
    defaults: { expenseChange: -500, oneTimeCash: -10000, investingChange: 300 }, fields: ['oneTimeCash', 'expenseChange', 'investingChange'] },
  { type: 'expense_drop', emoji: '📉', label: 'Major Expense Drops', color: '#20e2d7', category: 'Windfall',
    tagline: 'Kids leave, car paid off, lease ends',
    defaults: { expenseChange: -800, investingChange: 400 }, fields: ['expenseChange', 'investingChange'] },
]

const CATEGORIES = ['Career', 'Family', 'Housing', 'Windfall']

const FIELD_META = {
  incomeChange: { label: 'Monthly Income Change', hint: '+/− after-tax monthly delta', placeholder: 'e.g. 2000 or -5000' },
  expenseChange: { label: 'Monthly Expense Change', hint: 'Positive = more spending', placeholder: 'e.g. 1500 or -800' },
  oneTimeCash: { label: 'One-Time Cash Impact', hint: '− you spend it, + you receive it', placeholder: 'e.g. -60000 or 100000' },
  investingChange: { label: 'Monthly Investing Change', hint: 'More/less invested monthly after event', placeholder: 'e.g. 300 or -500' },
}

function getBase(incomeData: IncomeData, budgetData: BudgetData, allocationData: AllocationData) {
  const { person1Income, person2Income, person1Bonus, person2Bonus,
    person1AdditionalCash, person2AdditionalCash, mode, filingStatus, state } = incomeData
  const t1 = person1Income > 0 ? calculateFullTaxes(person1Income, mode === 'family' ? 'married' : filingStatus, state) : null
  const t2 = person2Income > 0 ? calculateFullTaxes(person2Income, 'married', state) : null
  const b1 = person1Bonus > 0 ? calculateBonusTax(person1Bonus, person1Income, filingStatus, state) : null
  const b2 = person2Bonus > 0 ? calculateBonusTax(person2Bonus, person2Income, 'married', state) : null
  const monthlyNet = (t1?.netMonthly || 0) + (t2?.netMonthly || 0) +
    ((b1?.netBonus || 0) + (b2?.netBonus || 0)) / 12 +
    (person1AdditionalCash + person2AdditionalCash) / 12
  const cleared = monthlyNet - budgetData.monthlyExpenses
  const investing = cleared * (allocationData.investing / 100)
  const savings = cleared * (allocationData.savings / 100)
  return { monthlyNet, cleared, investing, savings, totalDeployed: investing + savings }
}

interface ProjPoint { month: number; label: string; baseline: number; withEvents: number }

function project(base: ReturnType<typeof getBase>, events: LifeEvent[], months: number, rate: number): ProjPoint[] {
  const sorted = [...events].sort((a, b) => a.monthOffset - b.monthOffset)
  const r = rate / 100 / 12
  let baseInv = 0, evInv = 0
  let incDelta = 0, expDelta = 0, invDelta = 0
  const points: ProjPoint[] = []

  for (let m = 0; m <= months; m++) {
    sorted.filter(e => e.monthOffset === m).forEach(e => {
      incDelta += e.incomeChange
      expDelta += e.expenseChange
      invDelta += e.investingChange
      evInv += e.oneTimeCash
    })
    if (m > 0) {
      baseInv = baseInv * (1 + r) + base.totalDeployed
      const adjDeploy = Math.max(0, base.totalDeployed + invDelta + Math.max(-base.cleared, incDelta - expDelta) * 0.4)
      evInv = evInv * (1 + r) + adjDeploy
    }
    if (m % 12 === 0 || m === months) {
      points.push({ month: m, label: m === 0 ? 'Now' : `Yr ${Math.floor(m / 12)}`, baseline: Math.max(0, baseInv), withEvents: Math.max(0, evInv) })
    }
  }
  return points
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: Array<{name: string; value: number; color: string; fill: string}>; label?: string }) {
  if (!active || !payload?.length) return null
  const b = payload.find(p => p.name === 'Baseline')?.value || 0
  const e = payload.find(p => p.name === 'With events')?.value || 0
  return (
    <div style={{ background: '#1a1a26', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: '12px 16px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: '#8888a8' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
          <span style={{ color: p.color || p.fill }}>● {p.name}</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{formatCurrency(p.value, true)}</span>
        </div>
      ))}
      {payload.length === 2 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8888a8' }}>Impact</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: e - b >= 0 ? '#22d17a' : '#ff5757' }}>
            {e - b >= 0 ? '+' : ''}{formatCurrency(e - b, true)}
          </span>
        </div>
      )}
    </div>
  )
}

export default function StepEvents({ incomeData, budgetData, allocationData, lifeEvents, onChange, onNext, onBack }: Props) {
  const base = useMemo(() => getBase(incomeData, budgetData, allocationData), [incomeData, budgetData, allocationData])
  const [view, setView] = useState<'add' | 'timeline'>('add')
  const [filterCat, setFilterCat] = useState('All')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [horizon, setHorizon] = useState(120)
  const investReturn = 9.5

  const addEvent = (tmpl: EventTemplate) => {
    const ev: LifeEvent = {
      id: `evt-${Date.now()}`,
      type: tmpl.type, label: tmpl.label, emoji: tmpl.emoji, color: tmpl.color,
      monthOffset: 12, note: '',
      incomeChange: tmpl.defaults.incomeChange ?? 0,
      expenseChange: tmpl.defaults.expenseChange ?? 0,
      oneTimeCash: tmpl.defaults.oneTimeCash ?? 0,
      investingChange: tmpl.defaults.investingChange ?? 0,
    }
    onChange([...lifeEvents, ev])
    setEditingId(ev.id)
    setView('timeline')
  }

  const updateEvent = (id: string, patch: Partial<LifeEvent>) =>
    onChange(lifeEvents.map(e => e.id === id ? { ...e, ...patch } : e))

  const removeEvent = (id: string) => {
    onChange(lifeEvents.filter(e => e.id !== id))
    if (editingId === id) setEditingId(null)
  }

  const projData = useMemo(() => project(base, lifeEvents, horizon, investReturn), [base, lifeEvents, horizon, investReturn])
  const finalBase = projData[projData.length - 1]?.baseline || 0
  const finalEv = projData[projData.length - 1]?.withEvents || 0
  const totalImpact = finalEv - finalBase
  const hasEvents = lifeEvents.length > 0
  const sortedEvents = [...lifeEvents].sort((a, b) => a.monthOffset - b.monthOffset)
  const availableTemplates = TEMPLATES.filter(t =>
    (filterCat === 'All' || t.category === filterCat) && !lifeEvents.find(e => e.type === t.type))

  const timeLabel = (months: number) => {
    if (months === 0) return 'Now'
    const y = Math.floor(months / 12), m = months % 12
    if (y > 0 && m === 0) return `${y} yr`
    if (y > 0) return `${y} yr ${m} mo`
    return `${m} mo`
  }

  return (
    <div className="fade-up">
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div className="section-tag" style={{ justifyContent: 'center', marginBottom: 12 }}>Step 5 of 7</div>
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>
          Life Doesn&apos;t Stay Flat.<br /><span className="gradient-text">Plan for What&apos;s Coming.</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 520, margin: '0 auto' }}>
          Add the events you know are coming. Every change reshapes your projection in real time — so you can see what&apos;s actually ahead, not just what&apos;s true today.
        </p>
      </div>

      {/* Baseline strip */}
      <div style={{
        background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '11px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)', marginRight: 10 }}>Baseline today</span>
        {[
          { label: 'Take-home', value: formatCurrency(base.monthlyNet) + '/mo', color: 'var(--accent-bright)' },
          { label: 'Expenses', value: formatCurrency(budgetData.monthlyExpenses) + '/mo', color: 'var(--red)' },
          { label: 'Deploying', value: formatCurrency(base.totalDeployed) + '/mo', color: 'var(--green)' },
        ].map((item, i) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {i > 0 && <span style={{ color: 'var(--border-bright)', margin: '0 8px' }}>·</span>}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: item.color }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, marginBottom: 20 }}>

        {/* LEFT panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Tab switcher */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[{ id: 'add' as const, label: '＋ Add Event' }, { id: 'timeline' as const, label: `🗓 Timeline${lifeEvents.length > 0 ? ` (${lifeEvents.length})` : ''}` }].map(tab => (
              <button key={tab.id} onClick={() => setView(tab.id)} style={{
                padding: '8px', borderRadius: 8, border: '1px solid',
                borderColor: view === tab.id ? 'var(--accent)' : 'var(--border)',
                background: view === tab.id ? 'var(--accent-dim)' : 'transparent',
                color: view === tab.id ? 'var(--accent-bright)' : 'var(--text-muted)',
                fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>{tab.label}</button>
            ))}
          </div>

          {view === 'add' ? (
            <>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['All', ...CATEGORIES].map(cat => (
                  <button key={cat} onClick={() => setFilterCat(cat)} style={{
                    padding: '3px 9px', borderRadius: 20, border: '1px solid',
                    borderColor: filterCat === cat ? 'var(--accent)' : 'var(--border)',
                    background: filterCat === cat ? 'var(--accent-dim)' : 'transparent',
                    color: filterCat === cat ? 'var(--accent-bright)' : 'var(--text-faint)',
                    fontFamily: 'inherit', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  }}>{cat}</button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 440, overflowY: 'auto', paddingRight: 2 }}>
                {availableTemplates.length === 0 ? (
                  <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>All {filterCat !== 'All' ? filterCat + ' ' : ''}events added ✓</div>
                ) : availableTemplates.map(tmpl => (
                  <button key={tmpl.type} onClick={() => addEvent(tmpl)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px',
                    borderRadius: 9, border: `1px solid ${tmpl.color}20`, background: `${tmpl.color}07`,
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = `${tmpl.color}50`; el.style.background = `${tmpl.color}12` }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = `${tmpl.color}20`; el.style.background = `${tmpl.color}07` }}
                  >
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{tmpl.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{tmpl.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tmpl.tagline}</div>
                    </div>
                    <div style={{ fontSize: 9, color: tmpl.color, fontWeight: 700, background: `${tmpl.color}18`, padding: '2px 6px', borderRadius: 8, flexShrink: 0 }}>{tmpl.category}</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div style={{ flex: 1 }}>
              {lifeEvents.length === 0 ? (
                <div style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '40px 16px', textAlign: 'center', color: 'var(--text-faint)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🗓️</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>No events yet</div>
                  <div style={{ fontSize: 11 }}>Switch to Add Event to get started</div>
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  <div style={{ position: 'absolute', left: 6, top: 16, bottom: 16, width: 2, background: 'linear-gradient(to bottom, var(--accent), var(--teal))', borderRadius: 1, opacity: 0.4 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sortedEvents.map(ev => {
                      const tmpl = TEMPLATES.find(t => t.type === ev.type)!
                      const isOpen = editingId === ev.id
                      const impacts: string[] = []
                      if (ev.incomeChange !== 0) impacts.push(`${ev.incomeChange > 0 ? '+' : ''}${formatCurrency(ev.incomeChange)}/mo`)
                      if (ev.oneTimeCash !== 0) impacts.push(`${ev.oneTimeCash > 0 ? '+' : ''}${formatCurrency(ev.oneTimeCash, true)} cash`)

                      return (
                        <div key={ev.id} style={{ position: 'relative' }}>
                          <div style={{ position: 'absolute', left: -17, top: 14, width: 10, height: 10, borderRadius: '50%', background: ev.color, border: '2px solid var(--bg)', boxShadow: `0 0 8px ${ev.color}80` }} />
                          <div style={{ background: isOpen ? 'var(--surface2)' : 'var(--surface)', border: `1px solid ${isOpen ? ev.color + '40' : 'var(--border)'}`, borderRadius: 10, overflow: 'hidden', transition: 'all 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer' }} onClick={() => setEditingId(isOpen ? null : ev.id)}>
                              <span style={{ fontSize: 15 }}>{ev.emoji}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 700 }}>{ev.label}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1 }}>
                                  <span style={{ color: ev.color, fontWeight: 600 }}>{timeLabel(ev.monthOffset)}</span>
                                  {impacts.length > 0 && <span style={{ marginLeft: 5 }}>{impacts[0]}</span>}
                                </div>
                              </div>
                              <button onClick={e => { e.stopPropagation(); removeEvent(ev.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 18, padding: '0 2px', lineHeight: 1 }}>×</button>
                              <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>{isOpen ? '▲' : '▼'}</span>
                            </div>

                            {isOpen && (
                              <div style={{ padding: '0 12px 14px', borderTop: '1px solid var(--border)' }}>
                                <div style={{ marginTop: 14, marginBottom: 14 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <label className="label" style={{ marginBottom: 0 }}>When does this happen?</label>
                                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color: ev.color }}>{timeLabel(ev.monthOffset)}</span>
                                  </div>
                                  <input type="range" min={0} max={360} step={1} value={ev.monthOffset}
                                    onChange={e => updateEvent(ev.id, { monthOffset: parseInt(e.target.value) })} style={{ width: '100%' }} />
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-faint)', marginTop: 2 }}>
                                    {['Now', '5yr', '10yr', '15yr', '20yr', '25yr', '30yr'].map(l => <span key={l}>{l}</span>)}
                                  </div>
                                </div>
                                {(tmpl?.fields || []).map(field => (
                                  <div key={field} style={{ marginBottom: 10 }}>
                                    <label className="label">{FIELD_META[field].label}</label>
                                    <input type="number" value={ev[field] || ''} placeholder={FIELD_META[field].placeholder}
                                      onChange={e => updateEvent(ev.id, { [field]: parseFloat(e.target.value) || 0 })} style={{ fontSize: 13 }} />
                                    <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3 }}>{FIELD_META[field].hint}</div>
                                  </div>
                                ))}
                                <div>
                                  <label className="label">Note</label>
                                  <input type="text" value={ev.note} placeholder="Optional context..." onChange={e => updateEvent(ev.id, { note: e.target.value })} style={{ fontSize: 12 }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {[{ l: '5yr', m: 60 }, { l: '10yr', m: 120 }, { l: '20yr', m: 240 }, { l: '30yr', m: 360 }].map(h => (
                <button key={h.m} onClick={() => setHorizon(h.m)} style={{
                  padding: '5px 12px', borderRadius: 7, border: '1px solid',
                  borderColor: horizon === h.m ? 'var(--accent)' : 'var(--border)',
                  background: horizon === h.m ? 'var(--accent-dim)' : 'transparent',
                  color: horizon === h.m ? 'var(--accent-bright)' : 'var(--text-muted)',
                  fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>{h.l}</button>
              ))}
            </div>
            {hasEvents && (
              <div style={{ padding: '5px 14px', borderRadius: 8, background: totalImpact >= 0 ? 'rgba(34,209,122,0.1)' : 'rgba(255,87,87,0.1)', border: `1px solid ${totalImpact >= 0 ? 'rgba(34,209,122,0.25)' : 'rgba(255,87,87,0.25)'}` }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Net impact: </span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color: totalImpact >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {totalImpact >= 0 ? '+' : ''}{formatCurrency(totalImpact, true)}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'No events', value: finalBase, color: 'var(--text-muted)', active: false },
              { label: 'With your events', value: finalEv, color: hasEvents ? (totalImpact >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)', active: hasEvents },
            ].map(tile => (
              <div key={tile.label} style={{
                background: tile.active ? (totalImpact >= 0 ? 'rgba(34,209,122,0.07)' : 'rgba(255,87,87,0.07)') : 'var(--surface2)',
                border: `1px solid ${tile.active ? (totalImpact >= 0 ? 'rgba(34,209,122,0.28)' : 'rgba(255,87,87,0.28)') : 'var(--border)'}`,
                borderRadius: 10, padding: '12px 16px',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{tile.label}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 700, color: tile.color }}>{formatCurrency(tile.value, true)}</div>
                <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>in {horizon / 12} years</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '14px 6px 6px', flex: 1 }}>
            {!hasEvents && <div style={{ textAlign: 'center', paddingTop: 12, paddingBottom: 4, color: 'var(--text-faint)', fontSize: 12 }}>Add events to see how your trajectory changes</div>}
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={projData} margin={{ top: 5, right: 12, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="evGB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8888a8" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#8888a8" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="evGE" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c5cfc" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#20e2d7" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fill: '#8888a8', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => formatCurrency(v, true)} tick={{ fill: '#8888a8', fontSize: 9 }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<ChartTip />} />
                {hasEvents && <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />}
                <Area type="monotone" dataKey="baseline" name="Baseline" stroke="#8888a8" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#evGB)" dot={false} />
                {hasEvents && <Area type="monotone" dataKey="withEvents" name="With events" stroke="#7c5cfc" strokeWidth={2.5} fill="url(#evGE)" dot={false} />}
                {sortedEvents.map(ev => {
                  const nearest = projData.reduce((p, c) => Math.abs(c.month - ev.monthOffset) < Math.abs(p.month - ev.monthOffset) ? c : p)
                  return <ReferenceLine key={ev.id} x={nearest.label} stroke={ev.color} strokeWidth={1} strokeDasharray="3 2" opacity={0.7} label={{ value: ev.emoji, position: 'insideTopLeft', fontSize: 11 }} />
                })}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {hasEvents && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {sortedEvents.map(ev => {
                const all: string[] = []
                if (ev.incomeChange !== 0) all.push(`${ev.incomeChange > 0 ? '+' : ''}${formatCurrency(ev.incomeChange)}/mo income`)
                if (ev.expenseChange !== 0) all.push(`${ev.expenseChange > 0 ? '+' : ''}${formatCurrency(ev.expenseChange)}/mo expenses`)
                if (ev.oneTimeCash !== 0) all.push(`${ev.oneTimeCash > 0 ? 'receive' : 'spend'} ${formatCurrency(Math.abs(ev.oneTimeCash), true)}`)
                if (ev.investingChange !== 0) all.push(`${ev.investingChange > 0 ? '+' : ''}${formatCurrency(ev.investingChange)}/mo investing`)
                return (
                  <div key={ev.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 10px', background: 'var(--surface2)', borderRadius: 7, border: `1px solid ${ev.color}18` }}>
                    <span>{ev.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, flex: '0 0 auto' }}>{ev.label}</span>
                    <span style={{ fontSize: 10, color: ev.color, fontWeight: 600, flex: '0 0 auto' }}>{timeLabel(ev.monthOffset)}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{all.slice(0, 2).join(' · ')}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {!hasEvents && (
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nothing to plan yet? Skip this step and continue.</span>
          <button onClick={onNext} className="btn-ghost" style={{ padding: '7px 16px', fontSize: 12 }}>Skip →</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn-primary" onClick={onNext}>{hasEvents ? 'See Goal Impact →' : 'Continue →'}</button>
      </div>
    </div>
  )
}
