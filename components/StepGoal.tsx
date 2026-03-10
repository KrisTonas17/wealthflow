'use client'

import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { calculateFullTaxes, calculateBonusTax } from '@/lib/taxes'
import { formatCurrency } from '@/lib/investments'
import type { IncomeData, BudgetData, AllocationData } from '@/types/app'

interface Props {
  incomeData: IncomeData
  budgetData: BudgetData
  allocationData: AllocationData
  onNext: () => void
  onBack: () => void
  onRestart: () => void
}

function getTaxResults(incomeData: IncomeData) {
  const { person1Income, person2Income, person1Bonus, person2Bonus,
    person1AdditionalCash, person2AdditionalCash, mode, filingStatus, state } = incomeData
  const t1 = person1Income > 0 ? calculateFullTaxes(person1Income, mode === 'family' ? 'married' : filingStatus, state) : null
  const t2 = person2Income > 0 ? calculateFullTaxes(person2Income, 'married', state) : null
  const b1 = person1Bonus > 0 ? calculateBonusTax(person1Bonus, person1Income, filingStatus, state) : null
  const b2 = person2Bonus > 0 ? calculateBonusTax(person2Bonus, person2Income, 'married', state) : null
  const monthlyNet = (t1?.netMonthly || 0) + (t2?.netMonthly || 0) +
    ((b1?.netBonus || 0) + (b2?.netBonus || 0)) / 12 +
    (person1AdditionalCash + person2AdditionalCash) / 12
  return { monthlyNet, t1, t2 }
}

function buildSimpleProjection(
  startingNet: number,
  monthlySavings: number,
  monthlyInvesting: number,
  monthlyFun: number,
  goalAmount: number,
  months: number,
  investReturn: number
) {
  const data = []
  let savings = startingNet
  let investments = startingNet

  for (let m = 0; m <= months; m++) {
    if (m > 0) {
      savings += monthlySavings
      investments = investments * (1 + investReturn / 100 / 12) + monthlyInvesting
    }
    const year = m / 12
    const label = m % 12 === 0 ? `Yr ${Math.floor(year)}` : ''
    if (label || m === 0 || m === months) {
      data.push({ month: m, label: m === 0 ? 'Now' : `Yr ${Math.floor(year)}`, savings, investments, goal: goalAmount })
    }
  }
  return data
}

const GOAL_PRESETS = [
  { label: 'Emergency Fund', multiplier: 6, ofWhat: 'monthly expenses', icon: '🛡️' },
  { label: 'Down Payment', amount: 100000, icon: '🏠' },
  { label: '$1M Net Worth', amount: 1000000, icon: '💎' },
  { label: 'FIRE (25x)', multiplier: 300, ofWhat: 'monthly expenses', icon: '🔥' },
]

export default function StepGoal({ incomeData, budgetData, allocationData, onNext, onBack, onRestart }: Props) {
  const { monthlyNet } = getTaxResults(incomeData)
  const cleared = monthlyNet - budgetData.monthlyExpenses
  const monthlySavings = cleared * (allocationData.savings / 100)
  const monthlyInvesting = cleared * (allocationData.investing / 100)
  const monthlyFun = cleared * (allocationData.funSpending / 100)
  const monthlyExtraTax = cleared * (allocationData.extraTax / 100)

  const [goalAmount, setGoalAmount] = useState(500000)
  const [investReturn, setInvestReturn] = useState(9.5)
  const [horizon, setHorizon] = useState(120)

  const projectionData = useMemo(() => {
    return buildSimpleProjection(0, monthlySavings, monthlyInvesting, monthlyFun, goalAmount, horizon, investReturn)
  }, [monthlySavings, monthlyInvesting, monthlyFun, goalAmount, horizon, investReturn])

  const finalInvestments = projectionData[projectionData.length - 1]?.investments || 0
  const finalSavings = projectionData[projectionData.length - 1]?.savings || 0
  const goalHit = finalInvestments >= goalAmount

  const monthsToGoal = useMemo(() => {
    let inv = 0
    for (let m = 1; m <= 600; m++) {
      inv = inv * (1 + investReturn / 100 / 12) + monthlyInvesting
      if (inv >= goalAmount) return m
    }
    return null
  }, [monthlyInvesting, investReturn, goalAmount])

  const getGoalGap = () => {
    if (goalHit) return null
    const shortfall = goalAmount - finalInvestments
    const additionalMonthly = shortfall / (horizon * 12) / ((Math.pow(1 + investReturn / 100 / 12, horizon * 12) - 1) / (investReturn / 100 / 12))
    return { shortfall, additionalMonthly }
  }

  const gap = getGoalGap()

  return (
    <div className="fade-up">
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div className="section-tag" style={{ justifyContent: 'center', marginBottom: 12 }}>Step 5 of 5</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>
          Your Financial<br /><span className="gradient-text">Full Picture</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 460, margin: '0 auto' }}>
          Set a goal. See if your plan gets you there. Get specific suggestions if it doesn&apos;t.
        </p>
      </div>

      {/* Full summary dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Take-Home', value: formatCurrency(monthlyNet), sub: '/month', color: 'var(--accent-bright)', icon: '💰' },
          { label: 'Expenses', value: formatCurrency(budgetData.monthlyExpenses), sub: '/month', color: 'var(--red)', icon: '🏠' },
          { label: 'Cleared', value: formatCurrency(cleared), sub: '/month', color: 'var(--green)', icon: '✓' },
          { label: 'Investing', value: formatCurrency(monthlyInvesting), sub: '/month', color: 'var(--teal)', icon: '📈' },
        ].map(item => (
          <div key={item.label} className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{item.icon}</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{item.sub}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Allocation breakdown */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
          Monthly Cleared Cash Breakdown
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {[
            { label: '🏦 Savings', value: monthlySavings, pct: allocationData.savings, color: '#4da6ff' },
            { label: '📈 Investing', value: monthlyInvesting, pct: allocationData.investing, color: '#22d17a' },
            { label: '🧾 Tax Reserve', value: monthlyExtraTax, pct: allocationData.extraTax, color: '#f5a623' },
            { label: '🎉 Fun Money', value: monthlyFun, pct: allocationData.funSpending, color: '#ff6ac1' },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.pct}% of cleared</div>
              </div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{formatCurrency(item.value)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Goal setter */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
          🎯 Set Your Goal
        </div>

        {/* Presets */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {GOAL_PRESETS.map(preset => {
            const amount = preset.amount || (preset.multiplier ? preset.multiplier * budgetData.monthlyExpenses : goalAmount)
            return (
              <button key={preset.label} onClick={() => setGoalAmount(amount)}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: '1px solid',
                  borderColor: goalAmount === amount ? 'var(--accent)' : 'var(--border)',
                  background: goalAmount === amount ? 'var(--accent-dim)' : 'transparent',
                  color: goalAmount === amount ? 'var(--accent-bright)' : 'var(--text-muted)',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                {preset.icon} {preset.label}
                {preset.multiplier && <span style={{ fontSize: 10, marginLeft: 4 }}>({formatCurrency(amount, true)})</span>}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label className="label">Target Amount</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>$</span>
              <input type="number" value={goalAmount || ''}
                onChange={e => setGoalAmount(parseFloat(e.target.value) || 0)}
                style={{ paddingLeft: 22 }} />
            </div>
          </div>
          <div>
            <label className="label">Expected Annual Return %</label>
            <input type="number" step={0.1} value={investReturn}
              onChange={e => setInvestReturn(parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Time Horizon</label>
            <select value={horizon} onChange={e => setHorizon(parseInt(e.target.value))}>
              <option value={60}>5 years</option>
              <option value={120}>10 years</option>
              <option value={180}>15 years</option>
              <option value={240}>20 years</option>
              <option value={360}>30 years</option>
            </select>
          </div>
        </div>
      </div>

      {/* Goal status */}
      <div style={{
        borderRadius: 16, padding: 24, marginBottom: 24, textAlign: 'center',
        background: goalHit
          ? 'linear-gradient(135deg, rgba(34,209,122,0.12), rgba(32,226,215,0.08))'
          : 'linear-gradient(135deg, rgba(245,166,35,0.1), rgba(255,87,87,0.08))',
        border: `1px solid ${goalHit ? 'rgba(34,209,122,0.3)' : 'rgba(245,166,35,0.3)'}`,
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>{goalHit ? '🎉' : '📍'}</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
          {goalHit ? 'You hit your goal!' : 'Projected in'} {horizon / 12} years
        </div>
        <div className="mono" style={{
          fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em',
          color: goalHit ? 'var(--green)' : 'var(--amber)',
        }}>
          {formatCurrency(finalInvestments)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
          Goal: {formatCurrency(goalAmount)} · {goalHit ? `${formatCurrency(finalInvestments - goalAmount)} above target` : `${formatCurrency(goalAmount - finalInvestments)} short`}
        </div>

        {monthsToGoal && (
          <div style={{ marginTop: 12 }}>
            <span className="pill" style={{
              background: goalHit ? 'rgba(34,209,122,0.15)' : 'rgba(245,166,35,0.15)',
              color: goalHit ? 'var(--green)' : 'var(--amber)',
            }}>
              ⏱ Goal reached in {monthsToGoal < 12 ? `${monthsToGoal} months` : `${(monthsToGoal / 12).toFixed(1)} years`}
            </span>
          </div>
        )}
      </div>

      {/* Projection chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16, fontSize: 13, fontWeight: 600 }}>Investment Growth vs. Goal</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={projectionData} margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{ fill: '#8888a8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fill: '#8888a8', fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
            <Tooltip
              formatter={(value, name) => [formatCurrency(Number(value) || 0), name as string]}
              contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border-bright)', borderRadius: 10, fontSize: 12 }}
            />
            <ReferenceLine y={goalAmount} stroke="rgba(245,166,35,0.6)" strokeDasharray="6 3" label={{ value: 'GOAL', fill: '#f5a623', fontSize: 10, position: 'insideTopRight' }} />
            <Line type="monotone" dataKey="investments" name="Investment Portfolio" stroke="#22d17a" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="savings" name="Savings" stroke="#4da6ff" strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gap analysis + recommendations */}
      {gap && (
        <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(245,166,35,0.25)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: 'var(--amber)' }}>
            📊 How to Close the Gap
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Current monthly investing</div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{formatCurrency(monthlyInvesting)}</div>
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Additional needed to hit goal</div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--amber)' }}>+{formatCurrency(gap.additionalMonthly)}/mo</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              `Increase your investing allocation from ${allocationData.investing}% to ${Math.ceil(allocationData.investing + (gap.additionalMonthly / cleared * 100))}% of cleared income`,
              `Look for an additional ${formatCurrency(gap.additionalMonthly * 12)}/year in income (raise, side income, bonus)`,
              `Reduce monthly expenses by ${formatCurrency(gap.additionalMonthly)} to redirect into investments`,
              investReturn < 9.5 ? `Optimize your investment strategy — historical S&P 500 avg is ~9.5%. Your ${investReturn}% target may be conservative.` : null,
              `Consider maxing tax-advantaged accounts: 401k ($23,500 in 2026), IRA ($7,000 in 2026)`,
            ].filter(Boolean).map((suggestion, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8,
              }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>→</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {goalHit && (
        <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(34,209,122,0.3)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: 'var(--green)' }}>
            🚀 You&apos;re on track — level up
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              `Max your 401k ($23,500 in 2026) and IRA ($7,000) before taxable brokerage`,
              `With ${formatCurrency(monthlyFun)}/mo in fun money, you're living well — consider if 10% could go to investing for compounding`,
              `${formatCurrency(finalInvestments - goalAmount, true)} surplus above goal — consider a stretch goal or earlier retirement`,
              `At ${investReturn}% return, your money doubles roughly every ${(72 / investReturn).toFixed(1)} years (Rule of 72)`,
            ].map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8 }}>
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Annual summary table */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Annual Snapshot</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Annual Gross Income', value: formatCurrency(incomeData.person1Income + incomeData.person2Income + incomeData.person1Bonus + incomeData.person2Bonus + incomeData.person1AdditionalCash + incomeData.person2AdditionalCash) },
            { label: 'Annual Take-Home', value: formatCurrency(monthlyNet * 12) },
            { label: 'Annual Expenses', value: formatCurrency(budgetData.monthlyExpenses * 12) },
            { label: 'Annual Cleared', value: formatCurrency(cleared * 12) },
            { label: 'Annual Savings', value: formatCurrency(monthlySavings * 12) },
            { label: 'Annual Investing', value: formatCurrency(monthlyInvesting * 12) },
            { label: 'Annual Fun Spend', value: formatCurrency(monthlyFun * 12) },
            { label: 'Annual Tax Reserve', value: formatCurrency(monthlyExtraTax * 12) },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.label}</span>
              <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <button className="btn-ghost" onClick={onBack}>← Adjust Portfolio</button>
        <button className="btn-primary" onClick={onNext}>
          Plan My Lifestyle →
        </button>
      </div>
    </div>
  )
}
