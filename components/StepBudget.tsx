'use client'

import { calculateFullTaxes, calculateBonusTax } from '@/lib/taxes'
import { formatCurrency } from '@/lib/investments'
import type { IncomeData, BudgetData } from '@/types/app'

interface Props {
  incomeData: IncomeData
  data: BudgetData
  onChange: (d: BudgetData) => void
  onNext: () => void
  onBack: () => void
}

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

const EXPENSE_SUGGESTIONS = [
  { label: 'Tight Budget', amount: 2500, desc: 'Minimal lifestyle' },
  { label: 'Moderate', amount: 4500, desc: 'Comfortable' },
  { label: 'Generous', amount: 7500, desc: 'Full lifestyle' },
  { label: 'High COL', amount: 12000, desc: 'HCOL city' },
]

export default function StepBudget({ incomeData, data, onChange, onNext, onBack }: Props) {
  const monthlyNet = getMonthlyNet(incomeData)
  const cleared = monthlyNet - data.monthlyExpenses
  const expenseRatio = monthlyNet > 0 ? data.monthlyExpenses / monthlyNet : 0
  const isSustainable = cleared >= 0
  const expenseSliderMax = Math.max(monthlyNet * 1.5, 20000)

  const getRatioColor = () => {
    if (expenseRatio > 0.9) return 'var(--red)'
    if (expenseRatio > 0.7) return 'var(--amber)'
    return 'var(--green)'
  }

  return (
    <div className="fade-up">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div className="section-tag" style={{ justifyContent: 'center', marginBottom: 12 }}>Step 2 of 5</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>
          What Do You<br /><span className="gradient-text">Actually Spend?</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 460, margin: '0 auto' }}>
          One number: your total fixed + variable monthly spend. Rent, groceries, subscriptions, insurance — everything.
        </p>
      </div>

      {/* Income reminder */}
      <div style={{
        background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '14px 20px', marginBottom: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>YOUR MONTHLY TAKE-HOME</span>
        <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-bright)' }}>{formatCurrency(monthlyNet)}</span>
      </div>

      {/* Quick select */}
      <div style={{ marginBottom: 24 }}>
        <label className="label">Quick Estimates</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {EXPENSE_SUGGESTIONS.map(s => (
            <button key={s.label}
              onClick={() => onChange({ ...data, monthlyExpenses: s.amount })}
              style={{
                padding: '10px 8px', borderRadius: 8, border: '1px solid',
                borderColor: data.monthlyExpenses === s.amount ? 'var(--accent)' : 'var(--border)',
                background: data.monthlyExpenses === s.amount ? 'var(--accent-dim)' : 'var(--surface2)',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
              }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{formatCurrency(s.amount)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ marginBottom: 24 }} className="card">
        <label className="label">Monthly Expenses (total)</label>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: 18 }}>$</span>
          <input type="number" placeholder="5,000"
            value={data.monthlyExpenses || ''}
            onChange={e => onChange({ ...data, monthlyExpenses: parseFloat(e.target.value) || 0 })}
            style={{ fontSize: 24, paddingLeft: 28, fontFamily: 'DM Mono, monospace', height: 56 }}
          />
        </div>

        <input type="range" min={0} max={expenseSliderMax} step={100}
          value={data.monthlyExpenses}
          onChange={e => onChange({ ...data, monthlyExpenses: parseFloat(e.target.value) })}
          style={{
            background: `linear-gradient(to right, ${getRatioColor()} ${expenseRatio * 100}%, var(--border-bright) ${expenseRatio * 100}%)`,
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>$0</span>
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{formatCurrency(expenseSliderMax)}</span>
        </div>
      </div>

      {/* Cleared number — the big reveal */}
      {data.monthlyExpenses > 0 && (
        <div className="fade-up" style={{
          borderRadius: 16, padding: 28, marginBottom: 24, textAlign: 'center',
          background: isSustainable
            ? 'linear-gradient(135deg, rgba(34,209,122,0.1), rgba(34,209,122,0.05))'
            : 'linear-gradient(135deg, rgba(255,87,87,0.12), rgba(255,87,87,0.05))',
          border: `1px solid ${isSustainable ? 'rgba(34,209,122,0.3)' : 'rgba(255,87,87,0.3)'}`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Cleared After Expenses
          </div>
          <div className="mono" style={{
            fontSize: 48, fontWeight: 700, letterSpacing: '-0.02em',
            color: isSustainable ? 'var(--green)' : 'var(--red)',
            textShadow: isSustainable ? '0 0 30px rgba(34,209,122,0.3)' : '0 0 30px rgba(255,87,87,0.3)',
          }}>
            {formatCurrency(cleared)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
            {isSustainable
              ? `${(expenseRatio * 100).toFixed(0)}% of take-home → expenses · ${((1 - expenseRatio) * 100).toFixed(0)}% → free to allocate`
              : `You're ${formatCurrency(Math.abs(cleared))}/mo over your take-home. Review expenses.`}
          </div>

          {isSustainable && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
              {expenseRatio < 0.5 && <span className="pill pill-green">💪 Strong Position</span>}
              {expenseRatio >= 0.5 && expenseRatio < 0.7 && <span className="pill pill-amber">📊 Manageable</span>}
              {expenseRatio >= 0.7 && expenseRatio < 0.9 && <span className="pill pill-amber">⚠️ Tight Margins</span>}
              {expenseRatio >= 0.9 && <span className="pill pill-red">🚨 Very Tight</span>}
              <span className="pill pill-accent">{formatCurrency(cleared * 12)} / year to work with</span>
            </div>
          )}
        </div>
      )}

      {/* Rule of thumb callout */}
      <div style={{
        background: 'var(--surface2)', borderRadius: 12, padding: '14px 18px',
        border: '1px solid var(--border)', marginBottom: 28,
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 20 }}>💡</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>50/30/20 Benchmark</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Needs (50%): {formatCurrency(monthlyNet * 0.5)} · Wants (30%): {formatCurrency(monthlyNet * 0.3)} · Savings/Invest (20%): {formatCurrency(monthlyNet * 0.2)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn-primary" onClick={onNext}
          disabled={data.monthlyExpenses === 0 || !isSustainable}
          style={{ opacity: data.monthlyExpenses === 0 || !isSustainable ? 0.4 : 1 }}>
          Allocate the Rest →
        </button>
      </div>
    </div>
  )
}
