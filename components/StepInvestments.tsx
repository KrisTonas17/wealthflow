'use client'

import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { calculateFullTaxes, calculateBonusTax } from '@/lib/taxes'
import { projectInvestments, formatCurrency, calculateMortgagePayment, type InvestmentAccount } from '@/lib/investments'
import type { IncomeData, BudgetData, AllocationData } from '@/types/app'

interface Props {
  incomeData: IncomeData
  budgetData: BudgetData
  allocationData: AllocationData
  onNext: () => void
  onBack: () => void
}

function getMonthlyAllocated(incomeData: IncomeData, budgetData: BudgetData, allocationData: AllocationData): {
  savings: number
  investing: number
  total: number
} {
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
  const savings = cleared * (allocationData.savings / 100)
  const investing = cleared * (allocationData.investing / 100)
  return { savings, investing, total: savings + investing }
}

const ACCOUNT_TEMPLATES: Omit<InvestmentAccount, 'id'>[] = [
  {
    type: 'investment',
    name: 'Index Funds / Brokerage',
    startingBalance: 10000,
    monthlyContribution: 500,
    annualReturn: 9.5,
    color: '#22d17a',
    enabled: true,
  },
  {
    type: 'savings',
    name: 'High-Yield Savings',
    startingBalance: 15000,
    monthlyContribution: 200,
    annualReturn: 4.5,
    color: '#4da6ff',
    enabled: true,
  },
  {
    type: 'home',
    name: 'Home Equity',
    startingBalance: 80000,
    monthlyContribution: 0,
    annualReturn: 4.0,
    homeValue: 450000,
    loanAmount: 370000,
    mortgageRate: 6.8,
    loanTermYears: 30,
    yearsPaid: 2,
    color: '#f5a623',
    enabled: false,
  },
  {
    type: 'crypto',
    name: 'Crypto',
    startingBalance: 5000,
    monthlyContribution: 100,
    annualReturn: 15,
    color: '#ff6ac1',
    enabled: false,
  },
  {
    type: 'cash',
    name: 'Cash On Hand',
    startingBalance: 5000,
    monthlyContribution: 0,
    annualReturn: 0,
    color: '#8888a8',
    enabled: false,
  },
  {
    type: 'other',
    name: 'Other Assets',
    startingBalance: 0,
    monthlyContribution: 0,
    annualReturn: 6,
    color: '#20e2d7',
    enabled: false,
  },
]

const HORIZON_OPTIONS = [
  { label: '5 yr', months: 60 },
  { label: '10 yr', months: 120 },
  { label: '20 yr', months: 240 },
  { label: '30 yr', months: 360 },
]

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; fill: string }>; label?: string }) => {
  if (!active || !payload?.length) return null
  const total = payload.reduce((sum, p) => sum + (p.value || 0), 0)
  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border-bright)',
      borderRadius: 10, padding: '12px 16px', fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 3 }}>
          <span style={{ color: p.color || p.fill }}>● {p.name}</span>
          <span className="mono" style={{ fontWeight: 600 }}>{formatCurrency(p.value, true)}</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--text-muted)' }}>Total</span>
        <span className="mono" style={{ fontWeight: 700, color: 'var(--accent-bright)' }}>{formatCurrency(total, true)}</span>
      </div>
    </div>
  )
}

export default function StepInvestments({ incomeData, budgetData, allocationData, onNext, onBack }: Props) {
  const { savings: monthlySavings, investing: monthlyInvesting, total: suggestedTotal } = getMonthlyAllocated(incomeData, budgetData, allocationData)

  const [accounts, setAccounts] = useState<InvestmentAccount[]>(
    ACCOUNT_TEMPLATES.map((t, i) => ({
      ...t,
      id: `acc-${i}`,
      monthlyContribution: i === 0 ? Math.round(monthlyInvesting) : i === 1 ? Math.round(monthlySavings) : t.monthlyContribution,
    }))
  )

  const [horizon, setHorizon] = useState(120) // 10 years default
  const [editingId, setEditingId] = useState<string | null>(null)

  const updateAccount = (id: string, patch: Partial<InvestmentAccount>) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
  }

  const projectionData = useMemo(() => {
    const points = projectInvestments(accounts, horizon)
    // Reduce to ~30 points for chart performance
    const step = Math.max(1, Math.floor(points.length / 30))
    return points.filter((_, i) => i % step === 0 || i === points.length - 1)
  }, [accounts, horizon])

  const finalValue = projectionData[projectionData.length - 1]?.total || 0
  const startValue = projectionData[0]?.total || 0
  const gain = finalValue - startValue
  const enabledAccounts = accounts.filter(a => a.enabled)

  return (
    <div className="fade-up">
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div className="section-tag" style={{ justifyContent: 'center', marginBottom: 12 }}>Step 4 of 5</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>
          Build Your<br /><span className="gradient-text">Asset Portfolio</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 460, margin: '0 auto' }}>
          Toggle assets, set starting balances + contributions, and watch compound growth project forward.
        </p>
      </div>

      {/* Suggested contribution callout */}
      <div style={{
        background: 'var(--surface2)', border: '1px solid rgba(34,209,122,0.25)', borderRadius: 12,
        padding: '14px 18px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 20 }}>💡</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Your allocations from Step 3 produce a combined{' '}
            <strong style={{ color: 'var(--green)' }}>{formatCurrency(suggestedTotal)}/mo</strong>{' '}
            for savings + investing — pre-loaded below.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              🏦 Emergency / Savings ({allocationData.savings}%)
            </div>
            <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: '#4da6ff' }}>
              {formatCurrency(monthlySavings)}/mo
            </div>
          </div>
          <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              📈 Investing ({allocationData.investing}%)
            </div>
            <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: '#22d17a' }}>
              {formatCurrency(monthlyInvesting)}/mo
            </div>
          </div>
          <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              Total to Deploy
            </div>
            <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-bright)' }}>
              {formatCurrency(suggestedTotal)}/mo
            </div>
          </div>
        </div>
      </div>

      {/* Account cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {accounts.map(acc => (
          <div key={acc.id} style={{
            background: 'var(--surface)',
            border: `1px solid ${acc.enabled ? `${acc.color}35` : 'var(--border)'}`,
            borderRadius: 12, overflow: 'hidden',
            transition: 'border-color 0.2s',
          }}>
            {/* Header row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
              cursor: 'pointer',
            }} onClick={() => setEditingId(editingId === acc.id ? null : acc.id)}>
              {/* Toggle */}
              <div className={`toggle ${acc.enabled ? 'on' : ''}`}
                style={{ background: acc.enabled ? acc.color : undefined }}
                onClick={(e) => { e.stopPropagation(); updateAccount(acc.id, { enabled: !acc.enabled }) }}
              />

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{acc.name}</div>
                {acc.enabled && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatCurrency(acc.startingBalance)} start · {formatCurrency(acc.monthlyContribution)}/mo ·{' '}
                    {acc.type !== 'cash' && acc.type !== 'home' ? `${acc.annualReturn}% annual` : acc.type === 'home' ? `${acc.mortgageRate}% mortgage` : 'No growth'}
                  </div>
                )}
              </div>

              {acc.enabled && (
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: acc.color }}>
                    {formatCurrency(projectionData[projectionData.length - 1]?.byAccount[acc.id] || acc.startingBalance, true)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>projected</div>
                </div>
              )}

              <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>
                {editingId === acc.id ? '▲' : '▼'}
              </div>
            </div>

            {/* Expanded edit */}
            {editingId === acc.id && acc.enabled && (
              <div style={{
                padding: '0 18px 18px', borderTop: '1px solid var(--border)',
                background: 'var(--surface2)',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 14 }}>
                  <div>
                    <label className="label">Starting Balance</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'DM Mono, monospace' }}>$</span>
                      <input type="number" value={acc.startingBalance || ''}
                        onChange={e => updateAccount(acc.id, { startingBalance: parseFloat(e.target.value) || 0 })}
                        style={{ paddingLeft: 22 }} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Monthly Addition</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'DM Mono, monospace' }}>$</span>
                      <input type="number" value={acc.monthlyContribution || ''}
                        onChange={e => updateAccount(acc.id, { monthlyContribution: parseFloat(e.target.value) || 0 })}
                        style={{ paddingLeft: 22 }} />
                    </div>
                  </div>

                  {acc.type !== 'cash' && acc.type !== 'home' && (
                    <div>
                      <label className="label">Annual Return %</label>
                      <input type="number" step={0.1} value={acc.annualReturn}
                        onChange={e => updateAccount(acc.id, { annualReturn: parseFloat(e.target.value) || 0 })} />
                    </div>
                  )}
                </div>

                {/* Home-specific fields */}
                {acc.type === 'home' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
                    <div>
                      <label className="label">Home Value</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'DM Mono, monospace' }}>$</span>
                        <input type="number" value={acc.homeValue || ''}
                          onChange={e => updateAccount(acc.id, { homeValue: parseFloat(e.target.value) || 0 })}
                          style={{ paddingLeft: 22 }} />
                      </div>
                    </div>
                    <div>
                      <label className="label">Loan Amount</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'DM Mono, monospace' }}>$</span>
                        <input type="number" value={acc.loanAmount || ''}
                          onChange={e => updateAccount(acc.id, { loanAmount: parseFloat(e.target.value) || 0 })}
                          style={{ paddingLeft: 22 }} />
                      </div>
                    </div>
                    <div>
                      <label className="label">Mortgage Rate %</label>
                      <input type="number" step={0.1} value={acc.mortgageRate || ''}
                        onChange={e => updateAccount(acc.id, { mortgageRate: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="label">Loan Term (years)</label>
                      <input type="number" value={acc.loanTermYears || ''}
                        onChange={e => updateAccount(acc.id, { loanTermYears: parseFloat(e.target.value) || 30 })} />
                    </div>
                    <div>
                      <label className="label">Years Already Paid</label>
                      <input type="number" value={acc.yearsPaid || ''}
                        onChange={e => updateAccount(acc.id, { yearsPaid: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="label">Appreciation Rate %</label>
                      <input type="number" step={0.1} value={acc.annualReturn}
                        onChange={e => updateAccount(acc.id, { annualReturn: parseFloat(e.target.value) || 4 })} />
                    </div>
                  </div>
                )}

                {acc.type === 'home' && acc.homeValue && acc.loanAmount && acc.mortgageRate && acc.loanTermYears && (
                  <>
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Monthly P&I Payment</div>
                        <div className="mono" style={{ fontSize: 14, color: acc.color }}>
                          {formatCurrency(calculateMortgagePayment(acc.loanAmount, acc.mortgageRate, acc.loanTermYears))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Current Equity</div>
                        <div className="mono" style={{ fontSize: 14, color: acc.color }}>
                          {formatCurrency((acc.homeValue || 0) - (acc.loanAmount || 0))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Appreciation Rate</div>
                        <div className="mono" style={{ fontSize: 14, color: acc.color }}>{acc.annualReturn}% / yr</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(245,166,35,0.06)', borderRadius: 8, border: '1px solid rgba(245,166,35,0.18)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      📐 <strong style={{ color: 'var(--amber)' }}>How equity is projected:</strong> Each month, your mortgage payment is split into interest and principal using your exact rate and term. The principal portion reduces your loan balance. Simultaneously, home value grows at your appreciation rate compounded monthly. Projected equity = future home value − remaining loan balance.
                    </div>
                  </>
                )}

                {acc.type === 'crypto' && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,106,193,0.06)', borderRadius: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                    ⚠️ Crypto returns are highly speculative. Historical 4-yr cycles average ~15–20% annualized but with extreme volatility.
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Horizon selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>Projection horizon:</span>
        {HORIZON_OPTIONS.map(h => (
          <button key={h.months} onClick={() => setHorizon(h.months)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid',
              borderColor: horizon === h.months ? 'var(--accent)' : 'var(--border)',
              background: horizon === h.months ? 'var(--accent-dim)' : 'transparent',
              color: horizon === h.months ? 'var(--accent-bright)' : 'var(--text-muted)',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>{h.label}</button>
        ))}
      </div>

      {/* Projection chart */}
      {enabledAccounts.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Projected Total Wealth</div>
              <div className="mono glow-accent" style={{ fontSize: 32, fontWeight: 700 }}>{formatCurrency(finalValue)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Gain</div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>+{formatCurrency(gain, true)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>over {horizon / 12} years</div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={projectionData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                {enabledAccounts.map(acc => (
                  <linearGradient key={acc.id} id={`grad-${acc.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={acc.color} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={acc.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={{ fill: '#8888a8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fill: '#8888a8', fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              {enabledAccounts.map(acc => (
                <Area
                  key={acc.id}
                  type="monotone"
                  dataKey={(d) => d.byAccount[acc.id] || 0}
                  name={acc.name}
                  stroke={acc.color}
                  fill={`url(#grad-${acc.id})`}
                  strokeWidth={2}
                  stackId="1"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {enabledAccounts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          Enable at least one asset above to see projections
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn-primary" onClick={onNext}>Set Goals & See the Path →</button>
      </div>
    </div>
  )
}
