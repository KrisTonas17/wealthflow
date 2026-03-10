'use client'

import { useState } from 'react'
import { calculateFullTaxes, calculateBonusTax } from '@/lib/taxes'
import { formatCurrency } from '@/lib/investments'
import type { IncomeData, BudgetData, AllocationData } from '@/types/app'

interface Props {
  incomeData: IncomeData
  budgetData: BudgetData
  data: AllocationData
  onChange: (d: AllocationData) => void
  onNext: () => void
  onBack: () => void
}

function getCleared(incomeData: IncomeData, budgetData: BudgetData): number {
  const { person1Income, person2Income, person1Bonus, person2Bonus,
    person1AdditionalCash, person2AdditionalCash, mode, filingStatus, state } = incomeData
  const t1 = person1Income > 0 ? calculateFullTaxes(person1Income, mode === 'family' ? 'married' : filingStatus, state) : null
  const t2 = person2Income > 0 ? calculateFullTaxes(person2Income, 'married', state) : null
  const b1 = person1Bonus > 0 ? calculateBonusTax(person1Bonus, person1Income, filingStatus, state) : null
  const b2 = person2Bonus > 0 ? calculateBonusTax(person2Bonus, person2Income, 'married', state) : null
  const monthlyNet = (t1?.netMonthly || 0) + (t2?.netMonthly || 0) +
    ((b1?.netBonus || 0) + (b2?.netBonus || 0)) / 12 +
    (person1AdditionalCash + person2AdditionalCash) / 12
  return monthlyNet - budgetData.monthlyExpenses
}

const ALLOCATION_CONFIG = [
  {
    key: 'savings' as const,
    label: 'Emergency Fund / Cash Savings',
    icon: '🏦',
    color: '#4da6ff',
    description: '3–6 months of expenses. HYSA. Liquid. Never invest money you might need.',
    tipRange: '5–15%',
  },
  {
    key: 'investing' as const,
    label: 'Investing',
    icon: '📈',
    color: '#22d17a',
    description: 'Index funds, 401k, IRA, brokerage. This is the engine of wealth.',
    tipRange: '15–25%',
  },
  {
    key: 'extraTax' as const,
    label: 'Extra Tax Reserve',
    icon: '🧾',
    color: '#f5a623',
    description: 'For 1099, bonus true-up, or quarterly estimated taxes. Set aside proactively.',
    tipRange: '5–10%',
  },
  {
    key: 'funSpending' as const,
    label: 'Fun Money / Lifestyle',
    icon: '🎉',
    color: '#ff6ac1',
    description: 'Travel, dining, hobbies. Guilt-free spending because it\'s planned.',
    tipRange: '10–20%',
  },
]

export default function StepAllocation({ incomeData, budgetData, data, onChange, onNext, onBack }: Props) {
  const cleared = getCleared(incomeData, budgetData)
  const totalPct = data.savings + data.investing + data.extraTax + data.funSpending
  const remaining = 100 - totalPct
  const remainingDollars = cleared * (remaining / 100)
  const overAllocated = totalPct > 100

  const update = (key: keyof AllocationData, val: number) => {
    onChange({ ...data, [key]: Math.max(0, Math.min(100, val)) })
  }

  return (
    <div className="fade-up">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div className="section-tag" style={{ justifyContent: 'center', marginBottom: 12 }}>Step 3 of 5</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>
          Allocate Your<br /><span className="gradient-text">Cleared Cash</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 460, margin: '0 auto' }}>
          You cleared {formatCurrency(cleared)}/mo after expenses. Tell it where to go — or it disappears.
        </p>
      </div>

      {/* Cleared amount */}
      <div style={{
        background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '16px 20px', marginBottom: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>CLEARED MONTHLY CASH</span>
        <div style={{ textAlign: 'right' }}>
          <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>{formatCurrency(cleared)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>/month to allocate</span>
        </div>
      </div>

      {/* Allocation sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
        {ALLOCATION_CONFIG.map(cfg => {
          const pct = data[cfg.key]
          const dollars = cleared * (pct / 100)
          return (
            <div key={cfg.key} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{cfg.label}</span>
                    <span style={{ fontSize: 10, color: cfg.color, background: `${cfg.color}20`, padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>tip: {cfg.tipRange}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 26 }}>{cfg.description}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                  <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: cfg.color }}>{formatCurrency(dollars)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/month</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="range" min={0} max={80} step={1} value={pct}
                  onChange={e => update(cfg.key, parseFloat(e.target.value))}
                  style={{ flex: 1, background: `linear-gradient(to right, ${cfg.color} ${pct * 1.25}%, var(--border-bright) ${pct * 1.25}%)` }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <input type="number" min={0} max={100} value={pct}
                    onChange={e => update(cfg.key, parseFloat(e.target.value) || 0)}
                    style={{ width: 60, textAlign: 'center', padding: '6px 8px', fontSize: 14, fontWeight: 700, color: cfg.color }}
                  />
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Allocation summary */}
      <div style={{
        borderRadius: 16, padding: 24, marginBottom: 24,
        background: overAllocated
          ? 'linear-gradient(135deg, rgba(255,87,87,0.1), rgba(255,87,87,0.05))'
          : 'var(--surface)',
        border: `1px solid ${overAllocated ? 'rgba(255,87,87,0.3)' : 'var(--border)'}`,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
          {ALLOCATION_CONFIG.map(cfg => (
            <div key={cfg.key} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{cfg.icon}</div>
              <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: cfg.color }}>{data[cfg.key]}%</div>
              <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{formatCurrency(cleared * data[cfg.key] / 100)}</div>
            </div>
          ))}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>↩️</div>
            <div className="mono" style={{
              fontSize: 15, fontWeight: 700,
              color: overAllocated ? 'var(--red)' : remaining === 0 ? 'var(--green)' : 'var(--amber)',
            }}>{remaining}%</div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Unallocated</div>
          </div>
        </div>

        {/* Pie chart bar */}
        <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', gap: 1, background: 'var(--bg)' }}>
          {ALLOCATION_CONFIG.map(cfg => (
            <div key={cfg.key} style={{
              width: `${data[cfg.key]}%`, background: cfg.color,
              transition: 'width 0.3s',
            }} />
          ))}
          {remaining > 0 && <div style={{ width: `${remaining}%`, background: 'var(--border-bright)', transition: 'width 0.3s' }} />}
        </div>

        <div style={{ marginTop: 14, textAlign: 'center' }}>
          {overAllocated && <span className="pill pill-red">Over-allocated by {Math.abs(remaining)}% — reduce sliders</span>}
          {!overAllocated && remaining === 0 && <span className="pill pill-green">✓ Fully allocated — perfect</span>}
          {!overAllocated && remaining > 0 && (
            <span className="pill pill-amber">{remaining}% unallocated → {formatCurrency(remainingDollars)}/mo sitting idle</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn-primary" onClick={onNext} disabled={overAllocated} style={{ opacity: overAllocated ? 0.4 : 1 }}>
          Build Investment Portfolio →
        </button>
      </div>
    </div>
  )
}
