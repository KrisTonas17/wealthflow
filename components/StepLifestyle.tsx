'use client'

import { useState, useMemo } from 'react'
import { calculateFullTaxes, calculateBonusTax } from '@/lib/taxes'
import { formatCurrency } from '@/lib/investments'
import type { IncomeData, AllocationData } from '@/types/app'

interface Props {
  incomeData: IncomeData
  allocationData: AllocationData
  onBack: () => void
  onRestart: () => void
}

export interface LifestyleItem {
  id: string
  category: string
  name: string
  emoji: string
  amount: number
  month: number // 0 = every month, 1-12 = specific month
  enabled: boolean
  custom?: boolean
}

const MONTHS = ['Every Month', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_SHORT = ['–', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const SUGGESTIONS: Omit<LifestyleItem, 'id' | 'enabled'>[] = [
  // Travel
  { category: 'Travel', name: 'Weekend Getaway', emoji: '🚗', amount: 600, month: 0 },
  { category: 'Travel', name: 'Domestic Flight Trip', emoji: '✈️', amount: 1800, month: 6 },
  { category: 'Travel', name: 'International Vacation', emoji: '🌍', amount: 5000, month: 7 },
  { category: 'Travel', name: 'Road Trip', emoji: '🛣️', amount: 800, month: 5 },
  { category: 'Travel', name: 'Long Weekend Hotel', emoji: '🏨', amount: 500, month: 0 },
  // Dining & Social
  { category: 'Dining & Social', name: 'Nice Dinner Out', emoji: '🍽️', amount: 200, month: 0 },
  { category: 'Dining & Social', name: 'Bar / Night Out', emoji: '🍸', amount: 150, month: 0 },
  { category: 'Dining & Social', name: 'Date Night', emoji: '💑', amount: 180, month: 0 },
  { category: 'Dining & Social', name: 'Group Dinner / Birthday', emoji: '🎂', amount: 300, month: 0 },
  { category: 'Dining & Social', name: 'Sports Bar / Events', emoji: '🏈', amount: 120, month: 0 },
  // Fitness & Health
  { category: 'Fitness & Wellness', name: 'Gym Membership', emoji: '💪', amount: 80, month: 0 },
  { category: 'Fitness & Wellness', name: 'Personal Trainer (4x/mo)', emoji: '🏋️', amount: 320, month: 0 },
  { category: 'Fitness & Wellness', name: 'Massage / Spa', emoji: '💆', amount: 150, month: 0 },
  { category: 'Fitness & Wellness', name: 'Golf Round', emoji: '⛳', amount: 200, month: 0 },
  { category: 'Fitness & Wellness', name: 'Tennis / Pickleball Club', emoji: '🎾', amount: 100, month: 0 },
  // Entertainment
  { category: 'Entertainment', name: 'Concerts / Shows', emoji: '🎵', amount: 250, month: 0 },
  { category: 'Entertainment', name: 'Sporting Event Tickets', emoji: '🏟️', amount: 300, month: 0 },
  { category: 'Entertainment', name: 'Movies / Streaming', emoji: '🎬', amount: 60, month: 0 },
  { category: 'Entertainment', name: 'Video Games / Hobbies', emoji: '🎮', amount: 80, month: 0 },
  { category: 'Entertainment', name: 'Book Club / Classes', emoji: '📚', amount: 50, month: 0 },
  // Shopping
  { category: 'Shopping', name: 'Clothing / Fashion', emoji: '👗', amount: 300, month: 0 },
  { category: 'Shopping', name: 'Home Goods / Decor', emoji: '🛋️', amount: 200, month: 0 },
  { category: 'Shopping', name: 'Gadgets / Tech', emoji: '📱', amount: 150, month: 0 },
  { category: 'Shopping', name: 'Holiday Shopping', emoji: '🎁', amount: 1200, month: 12 },
  // Seasonal / Special
  { category: 'Seasonal', name: 'Holiday Travel', emoji: '🎄', amount: 2000, month: 12 },
  { category: 'Seasonal', name: 'Summer Activities', emoji: '☀️', amount: 500, month: 7 },
  { category: 'Seasonal', name: 'Tax Prep / Accountant', emoji: '🧾', amount: 400, month: 4 },
  { category: 'Seasonal', name: 'Car Maintenance', emoji: '🚘', amount: 500, month: 0 },
  { category: 'Seasonal', name: 'Birthday Celebration', emoji: '🎉', amount: 500, month: 0 },
  // Giving
  { category: 'Giving', name: 'Charitable Donations', emoji: '❤️', amount: 200, month: 0 },
  { category: 'Giving', name: 'Gifts for Family/Friends', emoji: '🎀', amount: 150, month: 0 },
]

const CATEGORIES = [...new Set(SUGGESTIONS.map(s => s.category))]

function getMonthlyNet(incomeData: IncomeData): number {
  const { person1Income, person2Income, person1Bonus, person2Bonus,
    person1AdditionalCash, person2AdditionalCash, mode, filingStatus, state } = incomeData
  const t1 = person1Income > 0 ? calculateFullTaxes(person1Income, mode === 'family' ? 'married' : filingStatus, state) : null
  const t2 = person2Income > 0 ? calculateFullTaxes(person2Income, 'married', state) : null
  const b1 = person1Bonus > 0 ? calculateBonusTax(person1Bonus, person1Income, filingStatus, state) : null
  const b2 = person2Bonus > 0 ? calculateBonusTax(person2Bonus, person2Income, 'married', state) : null
  return (t1?.netMonthly || 0) + (t2?.netMonthly || 0) +
    ((b1?.netBonus || 0) + (b2?.netBonus || 0)) / 12 +
    (person1AdditionalCash + person2AdditionalCash) / 12
}

function getMonthlyBudget(allocationData: AllocationData, monthlyNet: number): number {
  return monthlyNet * (allocationData.funSpending / 100)
}

export default function StepLifestyle({ incomeData, allocationData, onBack, onRestart }: Props) {
  const monthlyNet = getMonthlyNet(incomeData)
  const monthlyBudget = getMonthlyBudget(allocationData, monthlyNet)
  const annualBudget = monthlyBudget * 12

  const [items, setItems] = useState<LifestyleItem[]>([])
  const [filterCat, setFilterCat] = useState<string>('All')
  const [viewMonth, setViewMonth] = useState<number>(0) // 0 = annual view
  const [customName, setCustomName] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [customMonth, setCustomMonth] = useState(0)
  const [customEmoji, setCustomEmoji] = useState('✨')
  const [showCustom, setShowCustom] = useState(false)

  const annualCost = useMemo(() => {
    return items.filter(i => i.enabled).reduce((sum, item) => {
      return sum + (item.month === 0 ? item.amount * 12 : item.amount)
    }, 0)
  }, [items])

  const monthlyCostByMonth = useMemo(() => {
    const costs: Record<number, number> = {}
    for (let m = 1; m <= 12; m++) {
      costs[m] = items.filter(i => i.enabled).reduce((sum, item) => {
        if (item.month === 0) return sum + item.amount
        if (item.month === m) return sum + item.amount
        return sum
      }, 0)
    }
    return costs
  }, [items])

  const remainingAnnual = annualBudget - annualCost
  const isOverBudget = annualCost > annualBudget

  const toggleItem = (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    // If enabling, check if it would exceed budget
    if (!item.enabled) {
      const newCost = item.month === 0 ? item.amount * 12 : item.amount
      if (annualCost + newCost > annualBudget) return // blocked
    }
    setItems(prev => prev.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i))
  }

  const updateAmount = (id: string, amount: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, amount } : i))
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const addSuggestion = (suggestion: Omit<LifestyleItem, 'id' | 'enabled'>) => {
    const exists = items.find(i => i.name === suggestion.name && !i.custom)
    if (exists) return
    const newCost = suggestion.month === 0 ? suggestion.amount * 12 : suggestion.amount
    const enabled = annualCost + newCost <= annualBudget
    setItems(prev => [...prev, { ...suggestion, id: `item-${Date.now()}-${Math.random()}`, enabled }])
  }

  const addCustom = () => {
    if (!customName || !customAmount) return
    const amount = parseFloat(customAmount) || 0
    const newCost = customMonth === 0 ? amount * 12 : amount
    const enabled = annualCost + newCost <= annualBudget
    setItems(prev => [...prev, {
      id: `custom-${Date.now()}`,
      category: 'Custom',
      name: customName,
      emoji: customEmoji,
      amount,
      month: customMonth,
      enabled,
      custom: true,
    }])
    setCustomName('')
    setCustomAmount('')
    setCustomMonth(0)
    setShowCustom(false)
  }

  const filteredSuggestions = SUGGESTIONS.filter(s =>
    (filterCat === 'All' || s.category === filterCat) &&
    !items.find(i => i.name === s.name && !i.custom)
  )

  const usedPercent = Math.min(100, (annualCost / annualBudget) * 100)

  const monthBarMax = Math.max(...Object.values(monthlyCostByMonth), monthlyBudget, 1)

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div className="section-tag" style={{ justifyContent: 'center', marginBottom: 12 }}>Step 6 of 6</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>
          Plan Your<br /><span className="gradient-text">Fun Spending</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
          You set aside {formatCurrency(monthlyBudget)}/mo for lifestyle. Now make it intentional — plan it by activity and see exactly what you can afford.
        </p>
      </div>

      {/* Budget summary bar */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Fun Budget</div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'baseline' }}>
              <div>
                <span className="mono" style={{ fontSize: 28, fontWeight: 800, color: 'var(--pink)' }}>{formatCurrency(monthlyBudget)}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>/mo</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>·</div>
              <div>
                <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-muted)' }}>{formatCurrency(annualBudget)}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>/yr</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {isOverBudget ? 'Over Budget' : 'Remaining'}
            </div>
            <div className="mono" style={{
              fontSize: 22, fontWeight: 700,
              color: isOverBudget ? 'var(--red)' : remainingAnnual < annualBudget * 0.15 ? 'var(--amber)' : 'var(--green)',
            }}>
              {isOverBudget ? '-' : ''}{formatCurrency(Math.abs(remainingAnnual))}/yr
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{
            height: '100%',
            width: `${usedPercent}%`,
            background: isOverBudget ? 'var(--red)' : usedPercent > 85 ? 'var(--amber)' : 'linear-gradient(90deg, var(--pink), var(--accent))',
            borderRadius: 4,
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-faint)' }}>
          <span>{formatCurrency(annualCost)} planned</span>
          <span>{usedPercent.toFixed(0)}% of annual budget used</span>
        </div>
      </div>

      {/* Month-by-month bar chart */}
      {items.some(i => i.enabled) && (
        <div className="card" style={{ marginBottom: 24 }} >
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            Monthly Spend Heatmap
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
              const cost = monthlyCostByMonth[m] || 0
              const heightPct = Math.max(4, (cost / monthBarMax) * 100)
              const over = cost > monthlyBudget
              return (
                <div key={m} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-faint)', marginBottom: 4 }}>{MONTH_SHORT[m]}</div>
                  <div style={{ height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{
                      width: '80%',
                      height: `${heightPct}%`,
                      borderRadius: 3,
                      background: over ? 'var(--red)' : cost > monthlyBudget * 0.85 ? 'var(--amber)' : 'var(--pink)',
                      transition: 'height 0.3s',
                      position: 'relative',
                    }}>
                      {over && (
                        <div style={{
                          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                          fontSize: 8, color: 'var(--red)', whiteSpace: 'nowrap',
                        }}>!</div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: cost > 0 ? 'var(--text-muted)' : 'var(--text-faint)', marginTop: 3 }}>
                    {cost > 0 ? formatCurrency(cost, true) : '—'}
                  </div>
                </div>
              )
            })}
          </div>
          {/* Budget reference */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 20, height: 2, background: 'rgba(255,106,193,0.4)', borderRadius: 1 }} />
            Monthly budget ceiling: {formatCurrency(monthlyBudget)}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Left: Suggestion picker */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Pick Activities
          </div>

          {/* Category filter */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {['All', ...CATEGORIES].map(cat => (
              <button key={cat} onClick={() => setFilterCat(cat)}
                style={{
                  padding: '4px 10px', borderRadius: 20, border: '1px solid',
                  borderColor: filterCat === cat ? 'var(--pink)' : 'var(--border)',
                  background: filterCat === cat ? 'rgba(255,106,193,0.12)' : 'transparent',
                  color: filterCat === cat ? 'var(--pink)' : 'var(--text-muted)',
                  fontFamily: 'inherit', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Suggestions list */}
          <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
            {filteredSuggestions.map(s => {
              const annualCostOfThis = s.month === 0 ? s.amount * 12 : s.amount
              const wouldExceed = annualCost + annualCostOfThis > annualBudget
              return (
                <button key={s.name} onClick={() => addSuggestion(s)}
                  disabled={wouldExceed}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--surface2)', cursor: wouldExceed ? 'not-allowed' : 'pointer',
                    opacity: wouldExceed ? 0.4 : 1,
                    transition: 'all 0.15s', textAlign: 'left', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { if (!wouldExceed) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--pink)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{s.emoji}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {s.month === 0 ? 'Monthly' : MONTHS[s.month]}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: wouldExceed ? 'var(--text-faint)' : 'var(--pink)' }}>
                      {formatCurrency(s.amount)}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>
                      +{formatCurrency(annualCostOfThis, true)}/yr
                    </div>
                  </div>
                </button>
              )
            })}

            {filteredSuggestions.length === 0 && (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
                All {filterCat} activities added ✓
              </div>
            )}
          </div>

          {/* Custom item */}
          <div style={{ marginTop: 12 }}>
            {!showCustom ? (
              <button onClick={() => setShowCustom(true)}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8,
                  border: '1px dashed var(--border)', background: 'transparent',
                  color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                ＋ Add Custom Activity
              </button>
            ) : (
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="text" placeholder="Emoji" value={customEmoji}
                    onChange={e => setCustomEmoji(e.target.value)}
                    style={{ width: 52, textAlign: 'center', fontSize: 18, padding: '8px 6px' }}
                  />
                  <input type="text" placeholder="Activity name" value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>$</span>
                    <input type="number" placeholder="Amount" value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      style={{ paddingLeft: 22 }}
                    />
                  </div>
                  <select value={customMonth} onChange={e => setCustomMonth(parseInt(e.target.value))}
                    style={{ flex: 1 }}>
                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={addCustom}
                    disabled={!customName || !customAmount}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 7, border: 'none',
                      background: 'var(--pink)', color: 'white', fontFamily: 'inherit',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: !customName || !customAmount ? 0.4 : 1,
                    }}>Add</button>
                  <button onClick={() => setShowCustom(false)}
                    style={{
                      padding: '8px 14px', borderRadius: 7, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--text-muted)',
                      fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
                    }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Added items */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Your Plan ({items.filter(i => i.enabled).length} active)
          </div>

          {items.length === 0 ? (
            <div style={{
              border: '2px dashed var(--border)', borderRadius: 12, padding: '40px 20px',
              textAlign: 'center', color: 'var(--text-faint)',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
              <div style={{ fontSize: 13 }}>Add activities from the left</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Your plan will show here</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
              {items.map(item => {
                const annualCostOfThis = item.month === 0 ? item.amount * 12 : item.amount
                const wouldExceedIfEnabled = !item.enabled && (annualCost + annualCostOfThis > annualBudget)
                return (
                  <div key={item.id} style={{
                    background: 'var(--surface2)',
                    border: `1px solid ${item.enabled ? 'rgba(255,106,193,0.25)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '10px 12px',
                    opacity: item.enabled ? 1 : 0.5,
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      {/* Toggle */}
                      <div
                        className={`toggle ${item.enabled ? 'on' : ''}`}
                        style={{
                          background: item.enabled ? 'var(--pink)' : undefined,
                          cursor: wouldExceedIfEnabled ? 'not-allowed' : 'pointer',
                        }}
                        onClick={() => !wouldExceedIfEnabled && toggleItem(item.id)}
                      />
                      <span style={{ fontSize: 15 }}>{item.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {item.month === 0 ? 'Every month' : MONTHS[item.month]}
                          {item.enabled && <span style={{ marginLeft: 6, color: 'var(--pink)' }}>· {formatCurrency(annualCostOfThis, true)}/yr</span>}
                        </div>
                      </div>
                      <button onClick={() => removeItem(item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 14, padding: 2 }}>
                        ×
                      </button>
                    </div>

                    {/* Amount editor */}
                    {item.enabled && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>$</span>
                        <input type="number" value={item.amount}
                          onChange={e => updateAmount(item.id, parseFloat(e.target.value) || 0)}
                          style={{ fontSize: 13, padding: '4px 8px', height: 30 }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {item.month === 0 ? '/mo' : `in ${MONTH_SHORT[item.month]}`}
                        </span>
                      </div>
                    )}

                    {wouldExceedIfEnabled && (
                      <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>
                        ⚠ Would exceed budget — free up {formatCurrency(annualCostOfThis - remainingAnnual, true)}/yr first
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Annual summary by category */}
      {items.filter(i => i.enabled).length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            Annual Breakdown by Category
          </div>
          {(() => {
            const byCategory: Record<string, number> = {}
            items.filter(i => i.enabled).forEach(item => {
              const cost = item.month === 0 ? item.amount * 12 : item.amount
              byCategory[item.category] = (byCategory[item.category] || 0) + cost
            })
            return Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, cost]) => {
              const pct = annualBudget > 0 ? cost / annualBudget : 0
              return (
                <div key={cat} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{cat}</span>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--pink)' }}>{formatCurrency(cost)}/yr</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct * 100}%`, height: '100%', background: 'var(--pink)', borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })
          })()}
          <div style={{
            marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Total Planned</span>
            <div style={{ textAlign: 'right' }}>
              <span className="mono" style={{ fontSize: 18, fontWeight: 800, color: isOverBudget ? 'var(--red)' : 'var(--pink)' }}>
                {formatCurrency(annualCost)}/yr
              </span>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatCurrency(annualCost / 12)}/mo avg</div>
            </div>
          </div>
        </div>
      )}

      {/* Soft insight callout */}
      {items.filter(i => i.enabled).length > 0 && !isOverBudget && (
        <div style={{
          background: 'rgba(255,106,193,0.06)', border: '1px solid rgba(255,106,193,0.2)',
          borderRadius: 12, padding: '14px 18px', marginBottom: 24,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 20 }}>🎉</span>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            You have a <strong style={{ color: 'var(--text)' }}>{formatCurrency(monthlyBudget)}/mo</strong> lifestyle budget and you&apos;ve planned <strong style={{ color: 'var(--pink)' }}>{formatCurrency(annualCost / 12)}/mo</strong> on average.
            {remainingAnnual > 0 && <> That leaves <strong style={{ color: 'var(--green)' }}>{formatCurrency(remainingAnnual)}</strong> unplanned annually — treat it as a flex buffer or reallocate it to investing.</>}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <button className="btn-ghost" onClick={onBack}>← Back to Goals</button>
        <button
          onClick={onRestart}
          style={{
            padding: '12px 24px', borderRadius: 10, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-muted)',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
          ↺ Start Over
        </button>
      </div>
    </div>
  )
}
