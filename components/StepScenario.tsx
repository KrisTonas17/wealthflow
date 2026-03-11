'use client'

import { useState, useMemo } from 'react'
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import { calculateFullTaxes, calculateBonusTax } from '@/lib/taxes'
import { formatCurrency } from '@/lib/investments'
import type { IncomeData, BudgetData, AllocationData } from '@/types/app'

interface Props {
  incomeData: IncomeData
  budgetData: BudgetData
  allocationData: AllocationData
  onNext: () => void
  onBack: () => void
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScenarioInputs {
  label: string
  color: string
  incomeBoost: number         // monthly after-tax addition
  expenseReduction: number    // monthly expense decrease (positive = less spending)
  investingPct: number        // override investing % of cleared
  savingsPct: number
  extraMonthly: number        // additional monthly deployed (e.g. side income direct to investing)
  annualReturn: number
  oneTimeLumpSum: number      // e.g. inherit $50K, invest it
  startMonth: number          // delay before scenario takes effect
}

interface ProjPoint {
  month: number
  label: string
  a: number
  b: number
}

// ─── Projection ───────────────────────────────────────────────────────────────

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
  return { monthlyNet, cleared, investing, savings, expenses: budgetData.monthlyExpenses }
}

function projectScenario(
  base: ReturnType<typeof getBase>,
  s: ScenarioInputs,
  months: number
): number[] {
  const r = s.annualReturn / 100 / 12
  let bal = s.oneTimeLumpSum
  const result: number[] = []

  for (let m = 0; m <= months; m++) {
    if (m > 0) {
      const active = m >= s.startMonth
      const adjCleared = active
        ? Math.max(0, base.cleared + s.incomeBoost + s.expenseReduction)
        : base.cleared
      const adjInvesting = active
        ? adjCleared * (s.investingPct / 100) + s.extraMonthly
        : base.investing + base.savings
      const monthly = Math.max(0, adjInvesting)
      bal = bal * (1 + r) + monthly
    }
    result.push(Math.max(0, bal))
  }
  return result
}

function buildProjection(base: ReturnType<typeof getBase>, a: ScenarioInputs, b: ScenarioInputs, months: number): ProjPoint[] {
  const arrA = projectScenario(base, a, months)
  const arrB = projectScenario(base, b, months)
  const points: ProjPoint[] = []
  for (let m = 0; m <= months; m++) {
    if (m % 12 === 0 || m === months) {
      points.push({ month: m, label: m === 0 ? 'Now' : `Yr ${Math.floor(m / 12)}`, a: arrA[m], b: arrB[m] })
    }
  }
  return points
}

// ─── Scenario presets ─────────────────────────────────────────────────────────

const SCENARIO_PRESETS: { label: string; emoji: string; desc: string; patch: Partial<ScenarioInputs> }[] = [
  { label: 'Stay the course', emoji: '📊', desc: 'Current plan, no changes', patch: {} },
  { label: 'Aggressive saver', emoji: '🔒', desc: 'Cut expenses $800/mo, invest everything extra', patch: { expenseReduction: 800, investingPct: 35 } },
  { label: 'Income growth', emoji: '🚀', desc: '$3K/mo raise in year 1, redirect to investing', patch: { incomeBoost: 3000, startMonth: 12, investingPct: 30 } },
  { label: 'Early retirement', emoji: '🌴', desc: 'Maximize investing for 10 years, then coast', patch: { investingPct: 40, annualReturn: 8 } },
  { label: 'Side hustle', emoji: '💡', desc: '$2K/mo side income, all invested', patch: { extraMonthly: 2000 } },
  { label: 'Lifestyle upgrade', emoji: '✨', desc: 'Spend $1K more/mo, slightly less investing', patch: { expenseReduction: -1000, investingPct: 18 } },
  { label: 'Windfall invest', emoji: '🏦', desc: 'Invest a $100K lump sum today', patch: { oneTimeLumpSum: 100000 } },
  { label: 'Conservative', emoji: '🛡️', desc: 'Lower risk, lower return (6%)', patch: { annualReturn: 6, investingPct: 20 } },
]

// ─── Scenario editor ──────────────────────────────────────────────────────────

function ScenarioEditor({
  scenario, base, allocationData, onChange, color, label,
}: {
  scenario: ScenarioInputs
  base: ReturnType<typeof getBase>
  allocationData: AllocationData
  onChange: (patch: Partial<ScenarioInputs>) => void
  color: string
  label: string
}) {
  const activeCleared = Math.max(0, base.cleared + scenario.incomeBoost + scenario.expenseReduction)
  const activeInvesting = activeCleared * (scenario.investingPct / 100) + scenario.extraMonthly

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Label */}
      <div>
        <label className="label">Scenario Name</label>
        <input type="text" value={scenario.label} onChange={e => onChange({ label: e.target.value })}
          style={{ fontSize: 14, fontWeight: 700, color, borderColor: `${color}50` }} />
      </div>

      {/* Presets */}
      <div>
        <label className="label">Quick Presets</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SCENARIO_PRESETS.map(p => (
            <button key={p.label} title={p.desc}
              onClick={() => onChange({ ...p.patch, label: p.label })}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                borderRadius: 7, border: '1px solid var(--border)',
                background: 'var(--surface2)', color: 'var(--text-muted)',
                fontFamily: 'inherit', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.color = color }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
            >
              <span>{p.emoji}</span> {p.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)' }} />

      {/* Inputs grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="label">Monthly Income Boost</label>
          <input type="number" value={scenario.incomeBoost || ''} placeholder="0"
            onChange={e => onChange({ incomeBoost: parseFloat(e.target.value) || 0 })} />
          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3 }}>After-tax monthly addition</div>
        </div>
        <div>
          <label className="label">Monthly Expense Reduction</label>
          <input type="number" value={scenario.expenseReduction || ''} placeholder="0"
            onChange={e => onChange({ expenseReduction: parseFloat(e.target.value) || 0 })} />
          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3 }}>Positive = spend less (−= spend more)</div>
        </div>
        <div>
          <label className="label">Investing % of Cleared</label>
          <input type="number" step={1} min={0} max={100} value={scenario.investingPct}
            onChange={e => onChange({ investingPct: parseFloat(e.target.value) || 0 })} />
          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3 }}>Current: {allocationData.investing + allocationData.savings}%</div>
        </div>
        <div>
          <label className="label">Extra Monthly to Invest</label>
          <input type="number" value={scenario.extraMonthly || ''} placeholder="0"
            onChange={e => onChange({ extraMonthly: parseFloat(e.target.value) || 0 })} />
          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3 }}>Side income, windfall allocation, etc.</div>
        </div>
        <div>
          <label className="label">Annual Return %</label>
          <input type="number" step={0.5} value={scenario.annualReturn}
            onChange={e => onChange({ annualReturn: parseFloat(e.target.value) || 0 })} />
          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3 }}>e.g. 6 (conservative) to 10 (aggressive)</div>
        </div>
        <div>
          <label className="label">Lump Sum to Invest (Today)</label>
          <input type="number" value={scenario.oneTimeLumpSum || ''} placeholder="0"
            onChange={e => onChange({ oneTimeLumpSum: parseFloat(e.target.value) || 0 })} />
          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3 }}>Inheritance, home sale, bonus, etc.</div>
        </div>
        <div>
          <label className="label">Starts in Month</label>
          <input type="number" min={0} value={scenario.startMonth}
            onChange={e => onChange({ startMonth: parseInt(e.target.value) || 0 })} />
          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3 }}>0 = today, 12 = in 1 year</div>
        </div>
      </div>

      {/* Live output preview */}
      <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 14px', border: `1px solid ${color}30` }}>
        <div style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Effective Monthly in This Scenario</div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Cleared after expenses', value: formatCurrency(activeCleared), color: 'var(--green)' },
            { label: 'Monthly deployed', value: formatCurrency(activeInvesting), color },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{item.label}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function ChartTip({
  active, payload, label, nameA, nameB, colorA, colorB
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; fill: string }>
  label?: string
  nameA: string; nameB: string; colorA: string; colorB: string
}) {
  if (!active || !payload?.length) return null
  const a = payload.find(p => p.name === nameA)?.value || 0
  const b = payload.find(p => p.name === nameB)?.value || 0
  const winner = a > b ? nameA : b > a ? nameB : null
  return (
    <div style={{ background: '#1a1a26', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: '12px 16px', fontSize: 12, minWidth: 200 }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: '#8888a8' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
          <span style={{ color: p.color || p.fill }}>● {p.name}</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{formatCurrency(p.value, true)}</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#8888a8' }}>Difference</span>
        <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: a > b ? colorA : colorB }}>
          {formatCurrency(Math.abs(a - b), true)} {winner ? `→ ${winner}` : '(tied)'}
        </span>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function StepScenario({ incomeData, budgetData, allocationData, onNext, onBack }: Props) {
  const base = useMemo(() => getBase(incomeData, budgetData, allocationData), [incomeData, budgetData, allocationData])

  const defaultInvestingPct = allocationData.investing + allocationData.savings

  const [scenarioA, setScenarioA] = useState<ScenarioInputs>({
    label: 'Current Plan',
    color: '#7c5cfc',
    incomeBoost: 0, expenseReduction: 0, extraMonthly: 0,
    investingPct: defaultInvestingPct, savingsPct: allocationData.savings,
    annualReturn: 9.5, oneTimeLumpSum: 0, startMonth: 0,
  })

  const [scenarioB, setScenarioB] = useState<ScenarioInputs>({
    label: 'Scenario B',
    color: '#f5a623',
    incomeBoost: 0, expenseReduction: 500, extraMonthly: 0,
    investingPct: defaultInvestingPct + 5, savingsPct: allocationData.savings,
    annualReturn: 9.5, oneTimeLumpSum: 0, startMonth: 0,
  })

  const [horizon, setHorizon] = useState(120)
  const [activeEditor, setActiveEditor] = useState<'a' | 'b'>('a')
  const [goalAmount, setGoalAmount] = useState(1000000)

  const projData = useMemo(() => buildProjection(base, scenarioA, scenarioB, horizon), [base, scenarioA, scenarioB, horizon])

  const finalA = projData[projData.length - 1]?.a || 0
  const finalB = projData[projData.length - 1]?.b || 0
  const winner = finalA > finalB ? 'a' : finalB > finalA ? 'b' : null
  const delta = Math.abs(finalA - finalB)
  const winnerScenario = winner === 'a' ? scenarioA : winner === 'b' ? scenarioB : null

  // When does each scenario hit the goal?
  const goalMonthA = useMemo(() => {
    const arr = projectScenario(base, scenarioA, 600)
    return arr.findIndex(v => v >= goalAmount)
  }, [base, scenarioA, goalAmount])

  const goalMonthB = useMemo(() => {
    const arr = projectScenario(base, scenarioB, 600)
    return arr.findIndex(v => v >= goalAmount)
  }, [base, scenarioB, goalAmount])

  const fmtGoalMonth = (m: number) => {
    if (m < 0) return 'Never in 50yr'
    const y = Math.floor(m / 12), mo = m % 12
    return y > 0 && mo === 0 ? `${y} yr` : y > 0 ? `${y} yr ${mo} mo` : `${mo} mo`
  }

  return (
    <div className="fade-up">

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div className="section-tag" style={{ justifyContent: 'center', marginBottom: 12 }}>Step 7 of 7</div>
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>
          What If You Did<br /><span className="gradient-text">Something Different?</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 520, margin: '0 auto' }}>
          Build two financial scenarios side by side. Tune each one independently, then watch the projection gap grow — or close — in real time.
        </p>
      </div>

      {/* Winner banner (only if there's a clear winner) */}
      {winner && (
        <div style={{
          background: `${winnerScenario!.color}10`,
          border: `1px solid ${winnerScenario!.color}35`,
          borderRadius: 12, padding: '12px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 22 }}>🏆</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: winnerScenario!.color }}>{winnerScenario!.label}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}> comes out ahead by </span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{formatCurrency(delta, true)}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}> over {horizon / 12} years</span>
          </div>
        </div>
      )}

      {/* Horizon + goal controls */}
      <div style={{
        display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {[{ l: '5yr', m: 60 }, { l: '10yr', m: 120 }, { l: '20yr', m: 240 }, { l: '30yr', m: 360 }].map(h => (
            <button key={h.m} onClick={() => setHorizon(h.m)} style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid',
              borderColor: horizon === h.m ? 'var(--accent)' : 'var(--border)',
              background: horizon === h.m ? 'var(--accent-dim)' : 'transparent',
              color: horizon === h.m ? 'var(--accent-bright)' : 'var(--text-muted)',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>{h.l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Goal milestone:</span>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>$</span>
            <input type="number" value={goalAmount}
              onChange={e => setGoalAmount(parseFloat(e.target.value) || 0)}
              style={{ width: 130, paddingLeft: 22, fontSize: 13, height: 34 }} />
          </div>
        </div>
      </div>

      {/* Side-by-side output tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { s: scenarioA, val: finalA, letter: 'a' as const, gm: goalMonthA },
          { s: scenarioB, val: finalB, letter: 'b' as const, gm: goalMonthB },
        ].map(({ s, val, letter, gm }) => {
          const isWinner = winner === letter
          const isLoser = winner && winner !== letter
          return (
            <div key={letter} style={{
              background: isWinner ? `${s.color}09` : 'var(--surface)',
              border: `2px solid ${isWinner ? s.color + '60' : activeEditor === letter ? s.color + '40' : 'var(--border)'}`,
              borderRadius: 14, padding: 18, cursor: 'pointer', transition: 'all 0.2s',
              opacity: isLoser ? 0.8 : 1,
            }} onClick={() => setActiveEditor(letter)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, boxShadow: `0 0 8px ${s.color}60` }} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: activeEditor === letter ? s.color : 'var(--text)' }}>{s.label}</span>
                  {isWinner && <span style={{ fontSize: 10, background: `${s.color}20`, color: s.color, padding: '1px 7px', borderRadius: 8, fontWeight: 700 }}>WINNER</span>}
                </div>
                <button onClick={e => { e.stopPropagation(); setActiveEditor(letter) }}
                  style={{ fontSize: 10, color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}30`, padding: '3px 9px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                  Edit
                </button>
              </div>

              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 28, fontWeight: 800, color: s.color, marginBottom: 4 }}>
                {formatCurrency(val, true)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 12 }}>in {horizon / 12} years</div>

              {/* Mini stat grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { label: 'Monthly deployed', value: formatCurrency(Math.max(0, (base.cleared + s.incomeBoost + s.expenseReduction) * (s.investingPct / 100)) + s.extraMonthly) },
                  { label: 'Return rate', value: `${s.annualReturn}%` },
                  { label: `Hits ${formatCurrency(goalAmount, true)}`, value: gm >= 0 ? fmtGoalMonth(gm) : '—' },
                  { label: 'Lump sum', value: s.oneTimeLumpSum > 0 ? formatCurrency(s.oneTimeLumpSum, true) : '—' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: 'var(--surface2)', borderRadius: 7, padding: '7px 10px' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{stat.label}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, marginTop: 2 }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: 20, padding: '18px 8px 10px' }}>
        <div style={{ paddingLeft: 14, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Portfolio Growth Comparison</span>
          {goalAmount > 0 && <span style={{ fontSize: 10, color: 'var(--amber)' }}>— — goal line at {formatCurrency(goalAmount, true)}</span>}
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={projData} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="sgA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={scenarioA.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={scenarioA.color} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="sgB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={scenarioB.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={scenarioB.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{ fill: '#8888a8', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatCurrency(v, true)} tick={{ fill: '#8888a8', fontSize: 9 }} axisLine={false} tickLine={false} width={56} />
            <Tooltip content={<ChartTip nameA={scenarioA.label} nameB={scenarioB.label} colorA={scenarioA.color} colorB={scenarioB.color} />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {goalAmount > 0 && (
              <ReferenceLine y={goalAmount} stroke="rgba(245,166,35,0.5)" strokeDasharray="6 3"
                label={{ value: `Goal ${formatCurrency(goalAmount, true)}`, fill: '#f5a623', fontSize: 9, position: 'insideTopRight' }} />
            )}
            <Area type="monotone" dataKey="a" name={scenarioA.label} stroke={scenarioA.color} strokeWidth={2.5} fill="url(#sgA)" dot={false} />
            <Area type="monotone" dataKey="b" name={scenarioB.label} stroke={scenarioB.color} strokeWidth={2.5} fill="url(#sgB)" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Goal timing comparison */}
      {goalAmount > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { s: scenarioA, gm: goalMonthA },
            { s: scenarioB, gm: goalMonthB },
          ].map(({ s, gm }) => (
            <div key={s.label} style={{
              background: gm >= 0 ? `${s.color}08` : 'var(--surface2)',
              border: `1px solid ${gm >= 0 ? s.color + '30' : 'var(--border)'}`,
              borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                {s.label} reaches {formatCurrency(goalAmount, true)}
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 700, color: gm >= 0 ? s.color : 'var(--text-faint)' }}>
                {fmtGoalMonth(gm)}
              </div>
              {gm >= 0 && <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>from today</div>}
            </div>
          ))}
        </div>
      )}

      {/* Active scenario editor */}
      <div className="card" style={{
        marginBottom: 24,
        borderColor: activeEditor === 'a' ? `${scenarioA.color}40` : `${scenarioB.color}40`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: activeEditor === 'a' ? scenarioA.color : scenarioB.color }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: activeEditor === 'a' ? scenarioA.color : scenarioB.color }}>
              Editing: {activeEditor === 'a' ? scenarioA.label : scenarioB.label}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['a', 'b'] as const).map(letter => (
              <button key={letter} onClick={() => setActiveEditor(letter)} style={{
                padding: '5px 14px', borderRadius: 7, border: '1px solid',
                borderColor: activeEditor === letter ? (letter === 'a' ? scenarioA.color : scenarioB.color) : 'var(--border)',
                background: activeEditor === letter ? (letter === 'a' ? `${scenarioA.color}18` : `${scenarioB.color}18`) : 'transparent',
                color: activeEditor === letter ? (letter === 'a' ? scenarioA.color : scenarioB.color) : 'var(--text-muted)',
                fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>{letter === 'a' ? scenarioA.label : scenarioB.label}</button>
            ))}
          </div>
        </div>

        {activeEditor === 'a' ? (
          <ScenarioEditor scenario={scenarioA} base={base} allocationData={allocationData}
            onChange={patch => setScenarioA(prev => ({ ...prev, ...patch }))}
            color={scenarioA.color} label={scenarioA.label} />
        ) : (
          <ScenarioEditor scenario={scenarioB} base={base} allocationData={allocationData}
            onChange={patch => setScenarioB(prev => ({ ...prev, ...patch }))}
            color={scenarioB.color} label={scenarioB.label} />
        )}
      </div>

      {/* Key insight callout */}
      {delta > 5000 && (
        <div style={{
          background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '14px 18px', marginBottom: 24,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            📌 What this comparison tells you
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {winnerScenario ? (
              <>
                <strong style={{ color: winnerScenario.color }}>{winnerScenario.label}</strong> produces{' '}
                <strong style={{ color: 'var(--text)' }}>{formatCurrency(delta, true)} more</strong> over {horizon / 12} years.
                {' '}The difference between these scenarios is the equivalent of{' '}
                <strong style={{ color: 'var(--text)' }}>{formatCurrency(delta / (horizon / 12), true)}/year</strong> in additional wealth creation.
                {goalMonthA >= 0 && goalMonthB >= 0 && Math.abs(goalMonthA - goalMonthB) > 0 && (
                  <> The faster scenario reaches {formatCurrency(goalAmount, true)} <strong style={{ color: 'var(--text)' }}>{fmtGoalMonth(Math.abs(goalMonthA - goalMonthB))} sooner</strong>.</>
                )}
              </>
            ) : 'Both scenarios perform similarly over this horizon.'}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn-primary" onClick={onNext}>Finish & Plan Lifestyle →</button>
      </div>
    </div>
  )
}
