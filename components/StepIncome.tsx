'use client'

import { useState } from 'react'
import { STATE_TAXES, calculateFullTaxes, calculateBonusTax } from '@/lib/taxes'
import { formatCurrency, formatPercent } from '@/lib/investments'
import type { IncomeData } from '@/types/app'

interface Props {
  data: IncomeData
  onChange: (d: IncomeData) => void
  onNext: () => void
}

function TaxBreakdown({ label, gross, bonus, additionalCash, filingStatus, state, color }: {
  label: string
  gross: number
  bonus: number
  additionalCash: number
  filingStatus: 'single' | 'married'
  state: string
  color: string
}) {
  if (gross === 0) return null
  const tax = calculateFullTaxes(gross, filingStatus, state)
  const bonusTax = bonus > 0 ? calculateBonusTax(bonus, gross, filingStatus, state) : null
  const totalNet = tax.netMonthly + (bonusTax ? bonusTax.netBonus / 12 : 0) + (additionalCash / 12)

  return (
    <div style={{
      background: 'var(--surface2)',
      border: `1px solid ${color}30`,
      borderRadius: 12,
      padding: 20,
      marginTop: 20,
    }} className="fade-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
        </div>
        <div className="mono" style={{ fontSize: 22, fontWeight: 700, color }}>
          {formatCurrency(totalNet)}<span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>/mo</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Gross Annual', value: formatCurrency(gross), sub: '' },
          { label: 'Federal Tax', value: formatCurrency(tax.federalTax), sub: formatPercent(tax.effectiveFederalRate) + ' eff.' },
          { label: 'FICA', value: formatCurrency(tax.ficaTotal), sub: '' },
          { label: 'State Tax', value: formatCurrency(tax.stateTax), sub: formatPercent(tax.stateEffectiveRate) + ' eff.' },
        ].map(item => (
          <div key={item.label} style={{
            background: 'var(--bg)',
            borderRadius: 8,
            padding: '10px 12px',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 500 }}>{item.value}</div>
            {item.sub && <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1 }}>{item.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>NET ANNUAL TAKE-HOME</span>
        <span className="mono" style={{ fontSize: 15, color, fontWeight: 700 }}>{formatCurrency(tax.netAnnual)}</span>
      </div>

      {bonusTax && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            ⚡ Bonus Breakdown — Taxed as Supplemental Income
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Gross Bonus</div>
              <div className="mono" style={{ fontSize: 13 }}>{formatCurrency(bonus)}</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Total Tax (22%+)</div>
              <div className="mono" style={{ fontSize: 13, color: 'var(--red)' }}>{formatCurrency(bonusTax.totalTax)}</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Net Bonus</div>
              <div className="mono" style={{ fontSize: 13, color: 'var(--green)' }}>{formatCurrency(bonusTax.netBonus)}</div>
            </div>
          </div>
        </div>
      )}

      {additionalCash > 0 && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(34,209,122,0.06)', borderRadius: 8, border: '1px solid rgba(34,209,122,0.15)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+ Additional Cash (annual)</span>
          <span className="mono" style={{ fontSize: 13, color: 'var(--green)' }}>{formatCurrency(additionalCash)}</span>
        </div>
      )}

      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className="pill pill-accent">Marginal Rate: {formatPercent(tax.marginalRate)}</span>
        <span className="pill pill-amber">Total Tax: {formatPercent(tax.totalTax / gross)}</span>
        {STATE_TAXES[state]?.noIncomeTax && <span className="pill pill-green">No State Income Tax</span>}
      </div>
    </div>
  )
}

export default function StepIncome({ data, onChange, onNext }: Props) {
  const [showPerson2, setShowPerson2] = useState(data.mode === 'family')

  const update = (patch: Partial<IncomeData>) => onChange({ ...data, ...patch })

  const stateList = Object.entries(STATE_TAXES).sort((a, b) => a[1].name.localeCompare(b[1].name))

  const totalMonthlyNet = (() => {
    const t1 = data.person1Income > 0 ? calculateFullTaxes(data.person1Income, data.mode === 'family' ? 'married' : data.filingStatus, data.state) : null
    const t2 = data.person2Income > 0 ? calculateFullTaxes(data.person2Income, 'married', data.state) : null
    const b1 = data.person1Bonus > 0 ? calculateBonusTax(data.person1Bonus, data.person1Income, data.filingStatus, data.state) : null
    const b2 = data.person2Bonus > 0 ? calculateBonusTax(data.person2Bonus, data.person2Income, 'married', data.state) : null
    return (t1?.netMonthly || 0) + (t2?.netMonthly || 0) +
      ((b1?.netBonus || 0) + (b2?.netBonus || 0)) / 12 +
      (data.person1AdditionalCash + data.person2AdditionalCash) / 12
  })()

  return (
    <div className="fade-up">
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div className="section-tag" style={{ justifyContent: 'center', marginBottom: 12 }}>Step 1 of 5</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>
          Your Real<br /><span className="gradient-text">Take-Home Pay</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 460, margin: '0 auto' }}>
          Using 2026 federal tax brackets + actual state rates. Each income is calculated independently — the way your employer actually withholds.
        </p>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, justifyContent: 'center' }}>
        {(['individual', 'family'] as const).map(mode => (
          <button key={mode} onClick={() => {
            update({ mode, filingStatus: mode === 'family' ? 'married' : 'single' })
            setShowPerson2(mode === 'family')
          }}
            style={{
              padding: '8px 20px', borderRadius: 8, border: '1px solid',
              borderColor: data.mode === mode ? 'var(--accent)' : 'var(--border)',
              background: data.mode === mode ? 'var(--accent-dim)' : 'transparent',
              color: data.mode === mode ? 'var(--accent-bright)' : 'var(--text-muted)',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              textTransform: 'capitalize', letterSpacing: '0.02em',
            }}>
            {mode === 'individual' ? '👤 Individual' : '👨‍👩‍👧 Family'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: data.mode === 'family' ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 20 }}>
        {/* Person 1 */}
        <div className="card" style={{ borderColor: 'rgba(124,92,252,0.25)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
            {data.mode === 'family' ? '👤 Partner 1' : '👤 Your Income'}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Annual Salary / W-2 Income</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: 14 }}>$</span>
              <input type="number" placeholder="95,000" value={data.person1Income || ''} min={0}
                onChange={e => update({ person1Income: parseFloat(e.target.value) || 0 })}
                style={{ paddingLeft: 24 }} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Annual Bonus (pre-tax)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: 14 }}>$</span>
              <input type="number" placeholder="0" value={data.person1Bonus || ''}
                onChange={e => update({ person1Bonus: parseFloat(e.target.value) || 0 })}
                style={{ paddingLeft: 24 }} />
            </div>
            {data.person1Bonus > 0 && (
              <p style={{ fontSize: 11, color: 'var(--amber)', marginTop: 4 }}>
                ⚠ Bonuses taxed at 22% federal supplemental rate + state + FICA
              </p>
            )}
          </div>

          <div>
            <label className="label">Other Annual Cash Income</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: 14 }}>$</span>
              <input type="number" placeholder="freelance, rental, etc." value={data.person1AdditionalCash || ''}
                onChange={e => update({ person1AdditionalCash: parseFloat(e.target.value) || 0 })}
                style={{ paddingLeft: 24 }} />
            </div>
          </div>
        </div>

        {/* Person 2 */}
        {data.mode === 'family' && (
          <div className="card" style={{ borderColor: 'rgba(32,226,215,0.25)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
              👤 Partner 2
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="label">Annual Salary / W-2 Income</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: 14 }}>$</span>
                <input type="number" placeholder="75,000" value={data.person2Income || ''}
                  onChange={e => update({ person2Income: parseFloat(e.target.value) || 0 })}
                  style={{ paddingLeft: 24 }} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="label">Annual Bonus (pre-tax)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: 14 }}>$</span>
                <input type="number" placeholder="0" value={data.person2Bonus || ''}
                  onChange={e => update({ person2Bonus: parseFloat(e.target.value) || 0 })}
                  style={{ paddingLeft: 24 }} />
              </div>
            </div>

            <div>
              <label className="label">Other Annual Cash Income</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: 14 }}>$</span>
                <input type="number" placeholder="freelance, rental, etc." value={data.person2AdditionalCash || ''}
                  onChange={e => update({ person2AdditionalCash: parseFloat(e.target.value) || 0 })}
                  style={{ paddingLeft: 24 }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* State + filing */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div>
          <label className="label">State of Residence</label>
          <select value={data.state} onChange={e => update({ state: e.target.value })}>
            {stateList.map(([code, s]) => (
              <option key={code} value={code}>{s.name}{s.noIncomeTax ? ' ✓ No Income Tax' : ''}</option>
            ))}
          </select>
        </div>
        {data.mode === 'individual' && (
          <div>
            <label className="label">Filing Status</label>
            <select value={data.filingStatus} onChange={e => update({ filingStatus: e.target.value as 'single' | 'married' })}>
              <option value="single">Single</option>
              <option value="married">Married Filing Jointly</option>
            </select>
          </div>
        )}
        {data.mode === 'family' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px',
            border: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 14 }}>ℹ️</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Family mode calculates each income independently — as employers withhold — then combines take-home.</span>
          </div>
        )}
      </div>

      {/* Tax breakdowns */}
      {data.person1Income > 0 && (
        <TaxBreakdown
          label={data.mode === 'family' ? 'Partner 1' : 'Your Tax Breakdown'}
          gross={data.person1Income}
          bonus={data.person1Bonus}
          additionalCash={data.person1AdditionalCash}
          filingStatus={data.mode === 'family' ? 'married' : data.filingStatus}
          state={data.state}
          color="var(--accent-bright)"
        />
      )}

      {data.mode === 'family' && data.person2Income > 0 && (
        <TaxBreakdown
          label="Partner 2"
          gross={data.person2Income}
          bonus={data.person2Bonus}
          additionalCash={data.person2AdditionalCash}
          filingStatus="married"
          state={data.state}
          color="var(--teal)"
        />
      )}

      {/* Combined total */}
      {totalMonthlyNet > 0 && (
        <div className="fade-up" style={{
          marginTop: 24,
          background: 'linear-gradient(135deg, rgba(124,92,252,0.15), rgba(32,226,215,0.1))',
          border: '1px solid var(--accent)',
          borderRadius: 16,
          padding: 24,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            {data.mode === 'family' ? 'Combined Household' : ''} Monthly Take-Home
          </div>
          <div className="mono glow-accent" style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {formatCurrency(totalMonthlyNet)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            {formatCurrency(totalMonthlyNet * 12)} / year after all taxes
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28 }}>
        <button className="btn-primary" onClick={onNext} disabled={data.person1Income === 0}
          style={{ opacity: data.person1Income === 0 ? 0.4 : 1 }}>
          Set My Budget →
        </button>
      </div>
    </div>
  )
}
