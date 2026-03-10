'use client'

import { useState } from 'react'
import StepIncome from '@/components/StepIncome'
import StepBudget from '@/components/StepBudget'
import StepAllocation from '@/components/StepAllocation'
import StepInvestments from '@/components/StepInvestments'
import StepGoal from '@/components/StepGoal'
import type { IncomeData, BudgetData, AllocationData } from '@/types/app'

const STEPS = [
  { id: 0, label: 'Income', icon: '💰' },
  { id: 1, label: 'Budget', icon: '📊' },
  { id: 2, label: 'Allocate', icon: '🥧' },
  { id: 3, label: 'Invest', icon: '📈' },
  { id: 4, label: 'Goals', icon: '🎯' },
]

export default function Home() {
  const [step, setStep] = useState(0)

  const [incomeData, setIncomeData] = useState<IncomeData>({
    mode: 'individual',
    person1Income: 0,
    person2Income: 0,
    person1Bonus: 0,
    person2Bonus: 0,
    person1AdditionalCash: 0,
    person2AdditionalCash: 0,
    filingStatus: 'single',
    state: 'TX',
  })

  const [budgetData, setBudgetData] = useState<BudgetData>({
    monthlyExpenses: 0,
  })

  const [allocationData, setAllocationData] = useState<AllocationData>({
    savings: 10,
    investing: 15,
    extraTax: 5,
    funSpending: 20,
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        background: 'rgba(10,10,15,0.92)',
        backdropFilter: 'blur(12px)',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>⚡</div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>WealthFlow</span>
          <span style={{
            fontSize: 10, fontWeight: 600, color: 'var(--accent)',
            background: 'var(--accent-dim)', padding: '2px 7px', borderRadius: 4, letterSpacing: '0.1em',
          }}>2026</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {STEPS.map((s) => (
            <button key={s.id} onClick={() => s.id <= step ? setStep(s.id) : null}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 20, border: 'none',
                cursor: s.id <= step ? 'pointer' : 'default',
                background: step === s.id ? 'var(--accent-dim)' : 'transparent',
                color: step === s.id ? 'var(--accent-bright)' : s.id < step ? 'var(--text-muted)' : 'var(--text-faint)',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
              }}>
              <span style={{ fontSize: 13 }}>{s.icon}</span>
              <span>{s.label}</span>
              {s.id < step && <span style={{ color: 'var(--green)', fontSize: 10 }}>✓</span>}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {STEPS.map((s) => (
            <div key={s.id} style={{
              height: 4,
              width: step === s.id ? 20 : 6,
              borderRadius: 2,
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
        {step === 3 && <StepInvestments incomeData={incomeData} allocationData={allocationData} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
        {step === 4 && <StepGoal incomeData={incomeData} budgetData={budgetData} allocationData={allocationData} onBack={() => setStep(3)} onRestart={() => setStep(0)} />}
      </main>
    </div>
  )
}
