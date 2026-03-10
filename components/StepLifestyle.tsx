'use client'

import { useState, useMemo } from 'react'
import { calculateFullTaxes, calculateBonusTax } from '@/lib/taxes'
import { formatCurrency } from '@/lib/investments'
import type { IncomeData, BudgetData, AllocationData } from '@/types/app'

interface Props {
  incomeData: IncomeData
  budgetData: BudgetData
  allocationData: AllocationData
  onBack: () => void
  onRestart: () => void
}

interface LifestyleItem {
  id: string
  category: string
  name: string
  emoji: string
  // amounts keyed by month 1-12; month 0 = "every month" template amount
  amounts: Record<number, number>
  months: number[] // which months this is active in
  enabled: boolean
  custom?: boolean
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Suggestions: defaultMonths = [] means every month, otherwise specific months
interface Suggestion {
  category: string
  name: string
  emoji: string
  defaultAmount: number
  defaultMonths: number[] // empty = every month
}

const SUGGESTIONS: Suggestion[] = [
  // Travel
  { category: 'Travel', name: 'Weekend Getaway', emoji: '🚗', defaultAmount: 600, defaultMonths: [3, 9] },
  { category: 'Travel', name: 'Domestic Flight Trip', emoji: '✈️', defaultAmount: 1800, defaultMonths: [6] },
  { category: 'Travel', name: 'International Vacation', emoji: '🌍', defaultAmount: 5000, defaultMonths: [7] },
  { category: 'Travel', name: 'Road Trip', emoji: '🛣️', defaultAmount: 800, defaultMonths: [5] },
  { category: 'Travel', name: 'Long Weekend Hotel', emoji: '🏨', defaultAmount: 500, defaultMonths: [4, 10] },
  // Dining & Social
  { category: 'Dining & Social', name: 'Nice Dinner Out', emoji: '🍽️', defaultAmount: 200, defaultMonths: [] },
  { category: 'Dining & Social', name: 'Bar / Night Out', emoji: '🍸', defaultAmount: 150, defaultMonths: [] },
  { category: 'Dining & Social', name: 'Date Night', emoji: '💑', defaultAmount: 180, defaultMonths: [] },
  { category: 'Dining & Social', name: 'Group Dinner / Birthday', emoji: '🎂', defaultAmount: 300, defaultMonths: [] },
  { category: 'Dining & Social', name: 'Sports Bar / Events', emoji: '🏈', defaultAmount: 120, defaultMonths: [] },
  // Fitness & Wellness
  { category: 'Fitness & Wellness', name: 'Gym Membership', emoji: '💪', defaultAmount: 80, defaultMonths: [] },
  { category: 'Fitness & Wellness', name: 'Personal Trainer (4x/mo)', emoji: '🏋️', defaultAmount: 320, defaultMonths: [] },
  { category: 'Fitness & Wellness', name: 'Massage / Spa', emoji: '💆', defaultAmount: 150, defaultMonths: [] },
  { category: 'Fitness & Wellness', name: 'Golf Round', emoji: '⛳', defaultAmount: 200, defaultMonths: [] },
  { category: 'Fitness & Wellness', name: 'Tennis / Pickleball Club', emoji: '🎾', defaultAmount: 100, defaultMonths: [] },
  // Entertainment
  { category: 'Entertainment', name: 'Concerts / Shows', emoji: '🎵', defaultAmount: 250, defaultMonths: [] },
  { category: 'Entertainment', name: 'Sporting Event Tickets', emoji: '🏟️', defaultAmount: 300, defaultMonths: [] },
  { category: 'Entertainment', name: 'Movies / Streaming', emoji: '🎬', defaultAmount: 60, defaultMonths: [] },
  { category: 'Entertainment', name: 'Video Games / Hobbies', emoji: '🎮', defaultAmount: 80, defaultMonths: [] },
  { category: 'Entertainment', name: 'Classes / Learning', emoji: '📚', defaultAmount: 80, defaultMonths: [] },
  // Shopping
  { category: 'Shopping', name: 'Clothing / Fashion', emoji: '👗', defaultAmount: 300, defaultMonths: [] },
  { category: 'Shopping', name: 'Home Goods / Decor', emoji: '🛋️', defaultAmount: 200, defaultMonths: [] },
  { category: 'Shopping', name: 'Gadgets / Tech', emoji: '📱', defaultAmount: 150, defaultMonths: [] },
  { category: 'Shopping', name: 'Holiday Shopping', emoji: '🎁', defaultAmount: 1200, defaultMonths: [12] },
  // Seasonal
  { category: 'Seasonal', name: 'Holiday Travel', emoji: '🎄', defaultAmount: 2000, defaultMonths: [12] },
  { category: 'Seasonal', name: 'Summer Activities', emoji: '☀️', defaultAmount: 500, defaultMonths: [6, 7, 8] },
  { category: 'Seasonal', name: 'Tax Prep / Accountant', emoji: '🧾', defaultAmount: 400, defaultMonths: [4] },
  { category: 'Seasonal', name: 'Car Maintenance', emoji: '🚘', defaultAmount: 500, defaultMonths: [3, 9] },
  { category: 'Seasonal', name: 'Birthday Celebration', emoji: '🎉', defaultAmount: 500, defaultMonths: [] },
  // Giving
  { category: 'Giving', name: 'Charitable Donations', emoji: '❤️', defaultAmount: 200, defaultMonths: [] },
  { category: 'Giving', name: 'Gifts for Family/Friends', emoji: '🎀', defaultAmount: 150, defaultMonths: [] },
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

// Build amounts map: every-month items get the default amount for all 12 months
function buildAmounts(defaultAmount: number, defaultMonths: number[]): { amounts: Record<number, number>; months: number[] } {
  const activeMonths = defaultMonths.length === 0 ? [1,2,3,4,5,6,7,8,9,10,11,12] : defaultMonths
  const amounts: Record<number, number> = {}
  activeMonths.forEach(m => { amounts[m] = defaultAmount })
  return { amounts, months: activeMonths }
}

export default function StepLifestyle({ incomeData, budgetData, allocationData, onBack, onRestart }: Props) {
  const monthlyNet = getMonthlyNet(incomeData)
  // FIX: fun budget = cleared cash × funSpending%, not gross take-home × %
  const cleared = monthlyNet - budgetData.monthlyExpenses
  const monthlyBudget = cleared * (allocationData.funSpending / 100)
  const annualBudget = monthlyBudget * 12

  const [items, setItems] = useState<LifestyleItem[]>([])
  const [filterCat, setFilterCat] = useState<string>('All')
  const [activeMonth, setActiveMonth] = useState<number>(1) // 1-12, which month we're viewing
  const [viewMode, setViewMode] = useState<'month' | 'annual'>('month')
  const [customName, setCustomName] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [customEmoji, setCustomEmoji] = useState('✨')
  const [showCustom, setShowCustom] = useState(false)

  // Total spend per month
  const monthlyCosts = useMemo(() => {
    const costs: Record<number, number> = {}
    for (let m = 1; m <= 12; m++) {
      costs[m] = items.filter(i => i.enabled && i.months.includes(m))
        .reduce((sum, item) => sum + (item.amounts[m] || 0), 0)
    }
    return costs
  }, [items])

  const annualCost = useMemo(() => {
    return Object.values(monthlyCosts).reduce((a, b) => a + b, 0)
  }, [monthlyCosts])

  const currentMonthCost = monthlyCosts[activeMonth] || 0
  const currentMonthRemaining = monthlyBudget - currentMonthCost
  const annualRemaining = annualBudget - annualCost
  const isOverAnnual = annualCost > annualBudget
  const isOverMonth = currentMonthCost > monthlyBudget

  // Items active in the currently viewed month
  const activeMonthItems = items.filter(i => i.enabled && i.months.includes(activeMonth))

  const addSuggestion = (s: Suggestion) => {
    if (items.find(i => i.name === s.name && !i.custom)) return
    const { amounts, months } = buildAmounts(s.defaultAmount, s.defaultMonths)
    setItems(prev => [...prev, {
      id: `item-${Date.now()}-${Math.random()}`,
      category: s.category,
      name: s.name,
      emoji: s.emoji,
      amounts,
      months,
      enabled: true,
    }])
  }

  const addCustom = () => {
    if (!customName || !customAmount) return
    const amount = parseFloat(customAmount) || 0
    // Custom defaults to every month
    const { amounts, months } = buildAmounts(amount, [])
    setItems(prev => [...prev, {
      id: `custom-${Date.now()}`,
      category: 'Custom',
      name: customName,
      emoji: customEmoji,
      amounts,
      months,
      enabled: true,
      custom: true,
    }])
    setCustomName('')
    setCustomAmount('')
    setCustomEmoji('✨')
    setShowCustom(false)
  }

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id))

  // Update amount for a specific item in a specific month
  const updateMonthAmount = (id: string, month: number, amount: number) => {
    setItems(prev => prev.map(i => i.id === id ? {
      ...i,
      amounts: { ...i.amounts, [month]: amount }
    } : i))
  }

  // Toggle whether an item appears in a specific month
  const toggleItemMonth = (id: string, month: number) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i
      const inMonth = i.months.includes(month)
      const newMonths = inMonth ? i.months.filter(m => m !== month) : [...i.months, month].sort((a,b)=>a-b)
      const newAmounts = { ...i.amounts }
      if (!inMonth && !newAmounts[month]) newAmounts[month] = i.amounts[i.months[0]] || 0
      return { ...i, months: newMonths, amounts: newAmounts }
    }))
  }

  const filteredSuggestions = SUGGESTIONS.filter(s =>
    (filterCat === 'All' || s.category === filterCat) &&
    !items.find(i => i.name === s.name && !i.custom)
  )

  const usedAnnualPct = Math.min(100, annualBudget > 0 ? (annualCost / annualBudget) * 100 : 0)
  const usedMonthPct = Math.min(100, monthlyBudget > 0 ? (currentMonthCost / monthlyBudget) * 100 : 0)

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div className="section-tag" style={{ justifyContent: 'center', marginBottom: 12 }}>Step 6 of 6</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>
          Plan Your<br /><span className="gradient-text">Fun Spending</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
          You&apos;ve set aside <strong style={{ color: 'var(--pink)' }}>{formatCurrency(monthlyBudget)}/mo</strong> for lifestyle — that&apos;s <strong>{formatCurrency(annualBudget)}/yr</strong>. Plan it month by month so it actually goes where you want.
        </p>
      </div>

      {/* Budget bar — always visible */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Fun Budget</div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
              <span className="mono" style={{ fontSize: 26, fontWeight: 800, color: 'var(--pink)' }}>{formatCurrency(monthlyBudget)}<span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>/mo</span></span>
              <span className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)' }}>{formatCurrency(annualBudget)}<span style={{ fontSize: 11, fontWeight: 400 }}>/yr</span></span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Planned / Remaining</div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
              <span style={{ color: isOverAnnual ? 'var(--red)' : 'var(--pink)' }}>{formatCurrency(annualCost)}</span>
              <span style={{ color: 'var(--text-faint)', margin: '0 4px' }}>/</span>
              <span style={{ color: isOverAnnual ? 'var(--red)' : 'var(--green)' }}>{formatCurrency(Math.abs(annualRemaining))}</span>
            </div>
          </div>
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${usedAnnualPct}%`,
            background: isOverAnnual ? 'var(--red)' : usedAnnualPct > 85 ? 'var(--amber)' : 'linear-gradient(90deg, var(--pink), var(--accent))',
            borderRadius: 3, transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>
          {usedAnnualPct.toFixed(0)}% of annual budget planned across all months
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center' }}>
        <button onClick={() => setViewMode('month')}
          style={{
            padding: '7px 18px', borderRadius: 8, border: '1px solid',
            borderColor: viewMode === 'month' ? 'var(--pink)' : 'var(--border)',
            background: viewMode === 'month' ? 'rgba(255,106,193,0.1)' : 'transparent',
            color: viewMode === 'month' ? 'var(--pink)' : 'var(--text-muted)',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>📅 Plan by Month</button>
        <button onClick={() => setViewMode('annual')}
          style={{
            padding: '7px 18px', borderRadius: 8, border: '1px solid',
            borderColor: viewMode === 'annual' ? 'var(--pink)' : 'var(--border)',
            background: viewMode === 'annual' ? 'rgba(255,106,193,0.1)' : 'transparent',
            color: viewMode === 'annual' ? 'var(--pink)' : 'var(--text-muted)',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>📊 Annual Overview</button>
      </div>

      {/* ── MONTH VIEW ── */}
      {viewMode === 'month' && (
        <>
          {/* Month selector tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
            {MONTH_NAMES.map((name, i) => {
              const m = i + 1
              const cost = monthlyCosts[m] || 0
              const over = cost > monthlyBudget
              const hasItems = items.some(item => item.enabled && item.months.includes(m))
              return (
                <button key={m} onClick={() => setActiveMonth(m)}
                  style={{
                    flexShrink: 0, minWidth: 56, padding: '8px 6px', borderRadius: 8, border: '1px solid',
                    borderColor: activeMonth === m ? 'var(--pink)' : over ? 'rgba(255,87,87,0.4)' : hasItems ? 'rgba(255,106,193,0.25)' : 'var(--border)',
                    background: activeMonth === m ? 'rgba(255,106,193,0.12)' : 'var(--surface2)',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: activeMonth === m ? 'var(--pink)' : 'var(--text-muted)' }}>{name}</div>
                  <div className="mono" style={{ fontSize: 10, marginTop: 2, color: over ? 'var(--red)' : cost > 0 ? 'var(--text)' : 'var(--text-faint)' }}>
                    {cost > 0 ? formatCurrency(cost, true) : '—'}
                  </div>
                  {over && <div style={{ fontSize: 8, color: 'var(--red)' }}>!</div>}
                </button>
              )
            })}
          </div>

          {/* Active month header */}
          <div style={{
            background: isOverMonth ? 'rgba(255,87,87,0.07)' : 'rgba(255,106,193,0.06)',
            border: `1px solid ${isOverMonth ? 'rgba(255,87,87,0.3)' : 'rgba(255,106,193,0.2)'}`,
            borderRadius: 12, padding: '14px 18px', marginBottom: 18,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{MONTH_FULL[activeMonth - 1]}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {activeMonthItems.length} {activeMonthItems.length === 1 ? 'activity' : 'activities'} planned
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: isOverMonth ? 'var(--red)' : 'var(--pink)' }}>
                {formatCurrency(currentMonthCost)}
              </div>
              <div style={{ fontSize: 11, color: isOverMonth ? 'var(--red)' : 'var(--green)' }}>
                {isOverMonth ? `${formatCurrency(Math.abs(currentMonthRemaining))} over` : `${formatCurrency(currentMonthRemaining)} remaining`}
              </div>
            </div>
          </div>

          {/* Month progress bar */}
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{
              height: '100%', width: `${usedMonthPct}%`,
              background: isOverMonth ? 'var(--red)' : usedMonthPct > 85 ? 'var(--amber)' : 'var(--pink)',
              borderRadius: 2, transition: 'width 0.3s',
            }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Left: suggestions */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Add to {MONTH_NAMES[activeMonth - 1]}
              </div>

              {/* Category filter */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                {['All', ...CATEGORIES].map(cat => (
                  <button key={cat} onClick={() => setFilterCat(cat)}
                    style={{
                      padding: '3px 9px', borderRadius: 20, border: '1px solid',
                      borderColor: filterCat === cat ? 'var(--pink)' : 'var(--border)',
                      background: filterCat === cat ? 'rgba(255,106,193,0.1)' : 'transparent',
                      color: filterCat === cat ? 'var(--pink)' : 'var(--text-muted)',
                      fontFamily: 'inherit', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    }}>{cat}</button>
                ))}
              </div>

              <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5, paddingRight: 2 }}>
                {filteredSuggestions.map(s => {
                  const alreadyAdded = !!items.find(i => i.name === s.name && !i.custom)
                  const existingItem = items.find(i => i.name === s.name)
                  const inThisMonth = existingItem?.months.includes(activeMonth)
                  const projectedMonthCost = currentMonthCost + (inThisMonth ? 0 : s.defaultAmount)
                  const wouldOverMonth = projectedMonthCost > monthlyBudget

                  return (
                    <button key={s.name}
                      onClick={() => {
                        if (alreadyAdded && existingItem) {
                          // Already in plan — toggle for this month
                          toggleItemMonth(existingItem.id, activeMonth)
                        } else {
                          // Add fresh with only this month active
                          const amounts: Record<number, number> = { [activeMonth]: s.defaultAmount }
                          setItems(prev => [...prev, {
                            id: `item-${Date.now()}-${Math.random()}`,
                            category: s.category,
                            name: s.name,
                            emoji: s.emoji,
                            amounts,
                            months: [activeMonth],
                            enabled: true,
                          }])
                        }
                      }}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '9px 11px', borderRadius: 8,
                        border: `1px solid ${inThisMonth ? 'rgba(255,106,193,0.4)' : 'var(--border)'}`,
                        background: inThisMonth ? 'rgba(255,106,193,0.07)' : 'var(--surface2)',
                        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                        opacity: wouldOverMonth && !inThisMonth ? 0.45 : 1,
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 15 }}>{s.emoji}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.category}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                        <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: inThisMonth ? 'var(--pink)' : 'var(--text-muted)' }}>
                          {formatCurrency(s.defaultAmount)}
                        </div>
                        <div style={{ fontSize: 9, color: inThisMonth ? 'var(--pink)' : 'var(--text-faint)' }}>
                          {inThisMonth ? '✓ added' : wouldOverMonth ? '⚠ over' : '+ add'}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Custom */}
              <div style={{ marginTop: 10 }}>
                {!showCustom ? (
                  <button onClick={() => setShowCustom(true)}
                    style={{
                      width: '100%', padding: '9px', borderRadius: 8,
                      border: '1px dashed var(--border)', background: 'transparent',
                      color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>＋ Custom Activity</button>
                ) : (
                  <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 7, marginBottom: 7 }}>
                      <input type="text" placeholder="😎" value={customEmoji}
                        onChange={e => setCustomEmoji(e.target.value)}
                        style={{ width: 46, textAlign: 'center', fontSize: 17, padding: '7px 5px' }} />
                      <input type="text" placeholder="Activity name" value={customName}
                        onChange={e => setCustomName(e.target.value)} style={{ flex: 1 }} />
                    </div>
                    <div style={{ position: 'relative', marginBottom: 8 }}>
                      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>$</span>
                      <input type="number" placeholder="Amount" value={customAmount}
                        onChange={e => setCustomAmount(e.target.value)}
                        style={{ paddingLeft: 22 }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
                      Will be added to {MONTH_NAMES[activeMonth - 1]} — you can expand to other months after.
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => {
                        if (!customName || !customAmount) return
                        const amount = parseFloat(customAmount) || 0
                        setItems(prev => [...prev, {
                          id: `custom-${Date.now()}`,
                          category: 'Custom',
                          name: customName,
                          emoji: customEmoji,
                          amounts: { [activeMonth]: amount },
                          months: [activeMonth],
                          enabled: true,
                          custom: true,
                        }])
                        setCustomName('')
                        setCustomAmount('')
                        setCustomEmoji('✨')
                        setShowCustom(false)
                      }}
                        disabled={!customName || !customAmount}
                        style={{
                          flex: 1, padding: '7px', borderRadius: 7, border: 'none',
                          background: 'var(--pink)', color: 'white', fontFamily: 'inherit',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          opacity: !customName || !customAmount ? 0.4 : 1,
                        }}>Add to {MONTH_NAMES[activeMonth - 1]}</button>
                      <button onClick={() => setShowCustom(false)}
                        style={{
                          padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--text-muted)',
                          fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
                        }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: this month's plan with editable amounts */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                {MONTH_FULL[activeMonth - 1]} Plan
              </div>

              {activeMonthItems.length === 0 ? (
                <div style={{
                  border: '2px dashed var(--border)', borderRadius: 12, padding: '36px 16px',
                  textAlign: 'center', color: 'var(--text-faint)',
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🗓️</div>
                  <div style={{ fontSize: 13 }}>Nothing planned yet</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>Add activities from the left</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {activeMonthItems.map(item => {
                    const monthAmount = item.amounts[activeMonth] || 0
                    return (
                      <div key={item.id} style={{
                        background: 'var(--surface2)',
                        border: '1px solid rgba(255,106,193,0.22)',
                        borderRadius: 10, padding: '10px 12px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 16 }}>{item.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{item.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              Active: {item.months.map(m => MONTH_NAMES[m-1]).join(', ')}
                            </div>
                          </div>
                          <button onClick={() => toggleItemMonth(item.id, activeMonth)}
                            style={{
                              padding: '3px 8px', borderRadius: 5,
                              border: '1px solid rgba(255,87,87,0.3)',
                              background: 'rgba(255,87,87,0.08)',
                              color: 'var(--red)', fontFamily: 'inherit',
                              fontSize: 10, fontWeight: 600, cursor: 'pointer',
                            }}>Remove</button>
                        </div>

                        {/* Amount for this month — editable */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>$</span>
                            <input type="number" value={monthAmount}
                              onChange={e => updateMonthAmount(item.id, activeMonth, parseFloat(e.target.value) || 0)}
                              style={{ paddingLeft: 20, fontSize: 14, fontWeight: 700, height: 34, color: 'var(--pink)' }}
                            />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>in {MONTH_NAMES[activeMonth-1]}</span>
                        </div>

                        {/* Quick copy to other months */}
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 9, color: 'var(--text-faint)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Also active in:</div>
                          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            {MONTH_NAMES.map((mn, i) => {
                              const m = i + 1
                              if (m === activeMonth) return null
                              const inMonth = item.months.includes(m)
                              return (
                                <button key={m} onClick={() => toggleItemMonth(item.id, m)}
                                  style={{
                                    padding: '2px 6px', borderRadius: 4, border: '1px solid',
                                    borderColor: inMonth ? 'rgba(255,106,193,0.4)' : 'var(--border)',
                                    background: inMonth ? 'rgba(255,106,193,0.1)' : 'transparent',
                                    color: inMonth ? 'var(--pink)' : 'var(--text-faint)',
                                    fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                  }}>{mn}</button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Month total */}
              {activeMonthItems.length > 0 && (
                <div style={{
                  marginTop: 12, padding: '10px 14px',
                  background: isOverMonth ? 'rgba(255,87,87,0.07)' : 'rgba(255,106,193,0.06)',
                  border: `1px solid ${isOverMonth ? 'rgba(255,87,87,0.25)' : 'rgba(255,106,193,0.18)'}`,
                  borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {MONTH_NAMES[activeMonth-1]} total
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: isOverMonth ? 'var(--red)' : 'var(--pink)' }}>
                      {formatCurrency(currentMonthCost)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                      of {formatCurrency(monthlyBudget)} budget
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── ANNUAL VIEW ── */}
      {viewMode === 'annual' && (
        <>
          {/* Month heatmap */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              Month-by-Month Spend
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 5 }}>
              {MONTH_NAMES.map((name, i) => {
                const m = i + 1
                const cost = monthlyCosts[m] || 0
                const heightPct = Math.max(4, monthlyBudget > 0 ? Math.min(100, (cost / (monthlyBudget * 1.2)) * 100) : 4)
                const over = cost > monthlyBudget
                return (
                  <button key={m} onClick={() => { setViewMode('month'); setActiveMonth(m) }}
                    style={{ textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-faint)', marginBottom: 4 }}>{name}</div>
                    <div style={{ height: 56, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{
                        width: '85%', height: `${heightPct}%`,
                        borderRadius: 3,
                        background: over ? 'var(--red)' : cost > monthlyBudget * 0.85 ? 'var(--amber)' : 'var(--pink)',
                        transition: 'height 0.3s',
                      }} />
                    </div>
                    <div style={{ fontSize: 9, color: cost > 0 ? 'var(--text-muted)' : 'var(--text-faint)', marginTop: 3 }}>
                      {cost > 0 ? formatCurrency(cost, true) : '—'}
                    </div>
                  </button>
                )
              })}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-faint)' }}>
              Click any month to edit it · Budget ceiling: {formatCurrency(monthlyBudget)}/mo
            </div>
          </div>

          {/* All items with month coverage */}
          {items.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                All Planned Activities
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.filter(i => i.enabled).map(item => {
                  const annualItemCost = item.months.reduce((sum, m) => sum + (item.amounts[m] || 0), 0)
                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', background: 'var(--surface2)', borderRadius: 9,
                      border: '1px solid rgba(255,106,193,0.15)',
                    }}>
                      <span style={{ fontSize: 16 }}>{item.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                          {MONTH_NAMES.map((mn, i) => {
                            const m = i + 1
                            const inM = item.months.includes(m)
                            return (
                              <span key={m} style={{
                                padding: '1px 5px', borderRadius: 3, fontSize: 9, fontWeight: 600,
                                background: inM ? 'rgba(255,106,193,0.15)' : 'transparent',
                                color: inM ? 'var(--pink)' : 'var(--text-faint)',
                                border: `1px solid ${inM ? 'rgba(255,106,193,0.3)' : 'transparent'}`,
                              }}>{mn}</span>
                            )
                          })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--pink)' }}>{formatCurrency(annualItemCost)}/yr</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{item.months.length} months</div>
                      </div>
                      <button onClick={() => removeItem(item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 16, padding: '0 2px' }}>×</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Category breakdown */}
          {items.filter(i => i.enabled).length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                By Category
              </div>
              {(() => {
                const byCategory: Record<string, number> = {}
                items.filter(i => i.enabled).forEach(item => {
                  const cost = item.months.reduce((sum, m) => sum + (item.amounts[m] || 0), 0)
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
                        <div style={{ width: `${Math.min(100, pct * 100)}%`, height: '100%', background: 'var(--pink)', borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )
                })
              })()}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Total Planned</span>
                <div style={{ textAlign: 'right' }}>
                  <span className="mono" style={{ fontSize: 18, fontWeight: 800, color: isOverAnnual ? 'var(--red)' : 'var(--pink)' }}>
                    {formatCurrency(annualCost)}/yr
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatCurrency(annualCost / 12)}/mo avg</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Insight callout */}
      {items.filter(i => i.enabled).length > 0 && !isOverAnnual && (
        <div style={{
          background: 'rgba(255,106,193,0.05)', border: '1px solid rgba(255,106,193,0.18)',
          borderRadius: 12, padding: '14px 18px', marginBottom: 24,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 20 }}>🎉</span>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            You&apos;ve planned <strong style={{ color: 'var(--pink)' }}>{formatCurrency(annualCost)}/yr</strong> in lifestyle spending.
            {annualRemaining > 0 && <> <strong style={{ color: 'var(--green)' }}>{formatCurrency(annualRemaining)}</strong> unplanned — flex buffer or redirect to investing.</>}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <button className="btn-ghost" onClick={onBack}>← Back to Goals</button>
        <button onClick={onRestart}
          style={{
            padding: '12px 24px', borderRadius: 10, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-muted)',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>↺ Start Over</button>
      </div>
    </div>
  )
}
