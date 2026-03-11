'use client'

import { useState, useMemo } from 'react'
import StepIncome from '@/components/StepIncome'
import StepBudget from '@/components/StepBudget'
import StepAllocation from '@/components/StepAllocation'
import StepInvestments, { ACCOUNT_TEMPLATES } from '@/components/StepInvestments'
import StepEvents from '@/components/StepEvents'
import StepGoal from '@/components/StepGoal'
import StepScenario from '@/components/StepScenario'
import StepLifestyle from '@/components/StepLifestyle'
import { calculateFullTaxes, calculateBonusTax } from '@/lib/taxes'
import { type InvestmentAccount } from '@/lib/investments'
import type { IncomeData, BudgetData, AllocationData, LifeEvent } from '@/types/app'

const STEPS = [
  { id: 0, label: 'Income',    icon: '💰' },
  { id: 1, label: 'Budget',    icon: '📊' },
  { id: 2, label: 'Allocate',  icon: '🥧' },
  { id: 3, label: 'Invest',    icon: '📈' },
  { id: 4, label: 'Events',    icon: '🗓' },
  { id: 5, label: 'Goals',     icon: '🎯' },
  { id: 6, label: 'Scenarios', icon: '⚖️' },
  { id: 7, label: 'Lifestyle', icon: '🎉' },
]

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

export default function Home() {
  const [step, setStep] = useState(0)

  const [incomeData, setIncomeData] = useState<IncomeData>({
    mode: 'individual',
    person1Income: 0, person2Income: 0,
    person1Bonus: 0, person2Bonus: 0,
    person1AdditionalCash: 0, person2AdditionalCash: 0,
    filingStatus: 'single', state: 'TX',
  })

  const [budgetData, setBudgetData] = useState<BudgetData>({ monthlyExpenses: 0 })

  const [allocationData, setAllocationData] = useState<AllocationData>({
    savings: 10, investing: 15, extraTax: 5, funSpending: 20,
  })

  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([])

  // ── Investment portfolio state lives HERE so it survives navigation ──────────
  const [portfolioHorizon, setPortfolioHorizon] = useState(120)

  // Initialize accounts with lazy function so it only runs once
  const [accounts, setAccounts] = useState<InvestmentAccount[]>(() =>
    ACCOUNT_TEMPLATES.map((t, i) => ({ ...t, id: `acc-${i}` }))
  )

  // Derive total monthly deployed from actual account contributions (what user set)
  // Falls back to allocation-based calculation before user has visited the invest step
  const monthlyNet = useMemo(() => getMonthlyNet(incomeData), [incomeData])
  const cleared = monthlyNet - budgetData.monthlyExpenses
  const allocationBasedInvesting = cleared * ((allocationData.investing + allocationData.savings) / 100)

  // Sum of enabled account contributions — this is the "real" number after user configures portfolio
  const portfolioMonthlyDeployed = useMemo(
    () => accounts.filter(a => a.enabled).reduce((sum, a) => sum + a.monthlyContribution, 0),
    [accounts]
  )

  // Seed account contributions when income/allocation changes and user hasn't manually edited
  // We track whether the user has visited invest step to know which number to trust
  const [hasVisitedInvest, setHasVisitedInvest] = useState(false)

  // The number downstream steps use for "how much are you investing monthly"
  const effectiveMonthlyInvesting = hasVisitedInvest ? portfolioMonthlyDeployed : allocationBasedInvesting

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{
        borderBottom: '1px solid var(--border)', padding: '0 16px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0,
        background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(12px)', zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
          <span className="wf-logo-text" style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>WealthFlow</span>
          <span className="wf-logo-badge" style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-dim)', padding: '2px 7px', borderRadius: 4, letterSpacing: '0.1em' }}>2026</span>
        </div>

        {/* Step nav */}
        <div className="wf-step-nav" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {STEPS.map(s => (
            <button key={s.id} onClick={() => s.id <= step ? setStep(s.id) : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '4px 7px', borderRadius: 20, border: 'none',
                cursor: s.id <= step ? 'pointer' : 'default',
                background: step === s.id ? 'var(--accent-dim)' : 'transparent',
                color: step === s.id ? 'var(--accent-bright)' : s.id < step ? 'var(--text-muted)' : 'var(--text-faint)',
                fontFamily: 'inherit', fontSize: 10, fontWeight: 600, transition: 'all 0.2s',
              }}>
              <span style={{ fontSize: 11 }}>{s.icon}</span>
              <span className="wf-step-label">{s.label}</span>
              {s.id < step && <span style={{ color: 'var(--green)', fontSize: 8 }}>✓</span>}
            </button>
          ))}
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
          {STEPS.map(s => (
            <div key={s.id} style={{
              height: 4, width: step === s.id ? 18 : 5, borderRadius: 2,
              background: s.id < step ? 'var(--green)' : step === s.id ? 'var(--accent)' : 'var(--border-bright)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 80px' }}>
        {step === 0 && <StepIncome data={incomeData} onChange={setIncomeData} onNext={() => setStep(1)} />}
        {step === 1 && <StepBudget incomeData={incomeData} data={budgetData} onChange={setBudgetData} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <StepAllocation incomeData={incomeData} budgetData={budgetData} data={allocationData} onChange={setAllocationData} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && (
          <StepInvestments
            incomeData={incomeData} budgetData={budgetData} allocationData={allocationData}
            accounts={accounts} onAccountsChange={setAccounts}
            horizon={portfolioHorizon} onHorizonChange={setPortfolioHorizon}
            onNext={() => { setHasVisitedInvest(true); setStep(4) }}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && <StepEvents incomeData={incomeData} budgetData={budgetData} allocationData={allocationData} lifeEvents={lifeEvents} onChange={setLifeEvents} onNext={() => setStep(5)} onBack={() => setStep(3)} />}
        {step === 5 && <StepGoal incomeData={incomeData} budgetData={budgetData} allocationData={allocationData} monthlyInvesting={effectiveMonthlyInvesting} onNext={() => setStep(6)} onBack={() => setStep(4)} onRestart={() => setStep(0)} />}
        {step === 6 && <StepScenario incomeData={incomeData} budgetData={budgetData} allocationData={allocationData} monthlyInvesting={effectiveMonthlyInvesting} onNext={() => setStep(7)} onBack={() => setStep(5)} />}
        {step === 7 && <StepLifestyle incomeData={incomeData} budgetData={budgetData} allocationData={allocationData} onBack={() => setStep(6)} onRestart={() => setStep(0)} />}
      </main>
    </div>
  )
}
