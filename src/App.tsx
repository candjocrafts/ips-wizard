import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { jsPDF } from 'jspdf'
import './App.css'

type PrimaryGoal =
  | 'retirement'
  | 'capital_preservation'
  | 'wealth_accumulation'
  | 'education_funding'
  | 'other'

type LossAversion = 'sell_everything' | 'do_nothing' | 'buy_more'
type TaxStatus = 'taxable' | 'tax_deferred' | 'tax_exempt'
type RebalancingFrequency = 'monthly' | 'quarterly' | 'semi_annually' | 'annually'

type InvestorGoals = {
  primaryGoal: PrimaryGoal | ''
  primaryGoalOther: string
  timeHorizon: string
  liquidityNeeds: string
}

type RiskAssessment = {
  riskPerception: number
  lossAversion: LossAversion | ''
  riskCapacityPercentOfNetWorth: string
}

type FinancialConstraints = {
  taxStatus: TaxStatus | ''
  legalRegulatoryRestrictions: string
  uniquePreferences: string
}

type AssetAllocation = {
  equitiesPercent: string
  fixedIncomePercent: string
  cashPercent: string
  rebalancingFrequency: RebalancingFrequency | ''
}

type IpsFormData = {
  investorGoals: InvestorGoals
  riskAssessment: RiskAssessment
  financialConstraints: FinancialConstraints
  assetAllocation: AssetAllocation
}

type StepKey = 'investorGoals' | 'riskAssessment' | 'financialConstraints' | 'assetAllocation'
type ErrorMap = Partial<Record<string, string>>

const initialData: IpsFormData = {
  investorGoals: {
    primaryGoal: '',
    primaryGoalOther: '',
    timeHorizon: '',
    liquidityNeeds: '',
  },
  riskAssessment: {
    riskPerception: 5,
    lossAversion: '',
    riskCapacityPercentOfNetWorth: '',
  },
  financialConstraints: {
    taxStatus: '',
    legalRegulatoryRestrictions: '',
    uniquePreferences: '',
  },
  assetAllocation: {
    equitiesPercent: '',
    fixedIncomePercent: '',
    cashPercent: '',
    rebalancingFrequency: '',
  },
}

const steps: Array<{ key: StepKey; title: string; subtitle: string }> = [
  {
    key: 'investorGoals',
    title: 'Investor Profile & Objectives',
    subtitle: 'Define your goals, expected time horizon, and near-term liquidity needs.',
  },
  {
    key: 'riskAssessment',
    title: 'Risk Tolerance & Capacity',
    subtitle: 'Capture comfort with volatility and portfolio significance to net worth.',
  },
  {
    key: 'financialConstraints',
    title: 'Financial Constraints',
    subtitle: 'Set hard constraints for tax status, restrictions, and preferences.',
  },
  {
    key: 'assetAllocation',
    title: 'Asset Allocation Preferences',
    subtitle: 'Provide target mix assumptions and rebalancing cadence.',
  },
]

function App() {
  const [data, setData] = useState<IpsFormData>(initialData)
  const [stepIndex, setStepIndex] = useState(0)
  const [errors, setErrors] = useState<ErrorMap>({})
  const [isSubmitted, setIsSubmitted] = useState(false)

  const currentStep = steps[stepIndex]
  const progressPercent = Math.round((stepIndex / steps.length) * 100)
  const isLastStep = stepIndex === steps.length - 1

  const generatedPayload = useMemo(() => {
    return {
      investorGoals: {
        primaryGoal:
          data.investorGoals.primaryGoal === 'other'
            ? data.investorGoals.primaryGoalOther.trim()
            : data.investorGoals.primaryGoal,
        timeHorizon: data.investorGoals.timeHorizon.trim(),
        liquidityNeeds: data.investorGoals.liquidityNeeds.trim(),
      },
      riskAssessment: {
        riskPerception: data.riskAssessment.riskPerception,
        lossAversion: data.riskAssessment.lossAversion,
        riskCapacityPercentOfNetWorth: Number(data.riskAssessment.riskCapacityPercentOfNetWorth),
      },
      financialConstraints: {
        taxStatus: data.financialConstraints.taxStatus,
        legalRegulatoryRestrictions: data.financialConstraints.legalRegulatoryRestrictions.trim(),
        uniquePreferences: data.financialConstraints.uniquePreferences.trim(),
      },
      assetAllocation: {
        equitiesPercent: Number(data.assetAllocation.equitiesPercent),
        fixedIncomePercent: Number(data.assetAllocation.fixedIncomePercent),
        cashPercent: Number(data.assetAllocation.cashPercent),
        rebalancingFrequency: data.assetAllocation.rebalancingFrequency,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
      },
    }
  }, [data])

  const setField = <T extends keyof IpsFormData, K extends keyof IpsFormData[T]>(
    section: T,
    key: K,
    value: IpsFormData[T][K],
  ) => {
    setData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }))
  }

  const validateStep = (targetStep: StepKey): ErrorMap => {
    const stepErrors: ErrorMap = {}

    if (targetStep === 'investorGoals') {
      if (!data.investorGoals.primaryGoal) {
        stepErrors.primaryGoal = 'Select a primary investment goal.'
      }
      if (
        data.investorGoals.primaryGoal === 'other' &&
        !data.investorGoals.primaryGoalOther.trim()
      ) {
        stepErrors.primaryGoalOther = 'Describe your primary goal.'
      }
      if (!data.investorGoals.timeHorizon.trim()) {
        stepErrors.timeHorizon = 'Time horizon is required.'
      }
      if (!data.investorGoals.liquidityNeeds.trim()) {
        stepErrors.liquidityNeeds = 'Please describe expected liquidity needs.'
      }
    }

    if (targetStep === 'riskAssessment') {
      if (data.riskAssessment.riskPerception < 1 || data.riskAssessment.riskPerception > 10) {
        stepErrors.riskPerception = 'Risk perception must be between 1 and 10.'
      }
      if (!data.riskAssessment.lossAversion) {
        stepErrors.lossAversion = 'Select how you would react to a 20% decline.'
      }
      const riskCapacityValue = Number(data.riskAssessment.riskCapacityPercentOfNetWorth)
      if (data.riskAssessment.riskCapacityPercentOfNetWorth === '') {
        stepErrors.riskCapacityPercentOfNetWorth = 'Risk capacity percentage is required.'
      } else if (Number.isNaN(riskCapacityValue) || riskCapacityValue < 0 || riskCapacityValue > 100) {
        stepErrors.riskCapacityPercentOfNetWorth = 'Enter a valid percentage between 0 and 100.'
      }
    }

    if (targetStep === 'financialConstraints') {
      if (!data.financialConstraints.taxStatus) {
        stepErrors.taxStatus = 'Select account tax status.'
      }
      if (!data.financialConstraints.legalRegulatoryRestrictions.trim()) {
        stepErrors.legalRegulatoryRestrictions = 'Provide legal or regulatory restrictions (or state none).'
      }
      if (!data.financialConstraints.uniquePreferences.trim()) {
        stepErrors.uniquePreferences = 'Provide preferences or exclusions (or state none).'
      }
    }

    if (targetStep === 'assetAllocation') {
      const equities = Number(data.assetAllocation.equitiesPercent)
      const fixedIncome = Number(data.assetAllocation.fixedIncomePercent)
      const cash = Number(data.assetAllocation.cashPercent)
      const values = [
        { key: 'equitiesPercent', value: equities, label: 'Equities' },
        { key: 'fixedIncomePercent', value: fixedIncome, label: 'Fixed Income' },
        { key: 'cashPercent', value: cash, label: 'Cash' },
      ]

      values.forEach((item) => {
        if (item.value < 0 || item.value > 100 || Number.isNaN(item.value)) {
          stepErrors[item.key] = `${item.label} must be between 0 and 100.`
        }
      })

      if (Object.keys(stepErrors).length === 0 && equities + fixedIncome + cash !== 100) {
        stepErrors.allocationTotal = 'Target mix must total exactly 100%.'
      }

      if (!data.assetAllocation.rebalancingFrequency) {
        stepErrors.rebalancingFrequency = 'Select a rebalancing frequency.'
      }
    }

    return stepErrors
  }

  const handleNext = () => {
    const stepErrors = validateStep(currentStep.key)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    setErrors({})
    setStepIndex((prev) => prev + 1)
  }

  const handleBack = () => {
    setErrors({})
    setStepIndex((prev) => prev - 1)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const stepErrors = validateStep(currentStep.key)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    setErrors({})
    setIsSubmitted(true)
  }

  const handleDownloadPdf = () => {
    const payloadText = JSON.stringify(generatedPayload, null, 2)
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 14
    const contentWidth = pageWidth - margin * 2
    let y = 18
    let pageNumber = 1

    const formatEnum = (value: string) =>
      value
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

    const ensureSpace = (requiredHeight: number) => {
      if (y + requiredHeight > pageHeight - 18) {
        doc.setFontSize(9)
        doc.setTextColor(107, 114, 128)
        doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 8, { align: 'right' })
        doc.addPage()
        pageNumber += 1
        y = 18
      }
    }

    const drawHeader = () => {
      doc.setFillColor(30, 58, 138)
      doc.rect(0, 0, pageWidth, 30, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(191, 219, 254)
      doc.text('Rob Hubert, CFA', pageWidth - margin, 12, { align: 'right' })
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(255, 255, 255)
      doc.text('Investment Policy Statement Report', margin, 12)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date(generatedPayload.metadata.generatedAt).toLocaleString()}`, margin, 20)
      doc.setTextColor(31, 41, 55)
      y = 38
    }

    const drawSection = (title: string, rows: Array<{ label: string; value: string }>) => {
      const lineHeight = 6
      const wrappedRows = rows.map((row) => ({
        label: row.label,
        valueLines: doc.splitTextToSize(row.value || 'N/A', 120) as string[],
      }))
      const sectionHeight =
        10 + wrappedRows.reduce((acc, row) => acc + Math.max(lineHeight, row.valueLines.length * lineHeight), 0)

      ensureSpace(sectionHeight + 8)
      doc.setDrawColor(219, 234, 254)
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(margin, y, contentWidth, sectionHeight, 2, 2, 'FD')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text(title, margin + 3, y + 7)
      y += 12

      wrappedRows.forEach((row) => {
        const rowHeight = Math.max(lineHeight, row.valueLines.length * lineHeight)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text(row.label, margin + 3, y)
        doc.setFont('helvetica', 'normal')
        row.valueLines.forEach((line, idx) => {
          doc.text(line, margin + 62, y + idx * lineHeight)
        })
        y += rowHeight
      })
      y += 6
    }

    const drawJsonAppendix = () => {
      ensureSpace(12)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('Appendix: Source JSON', margin, y)
      y += 6

      doc.setFont('courier', 'normal')
      doc.setFontSize(8)
      const jsonLines = doc.splitTextToSize(payloadText, contentWidth - 4) as string[]
      jsonLines.forEach((line) => {
        ensureSpace(5)
        doc.text(line, margin + 2, y)
        y += 4.2
      })
    }

    drawHeader()
    drawSection('1) Investor Profile & Objectives', [
      { label: 'Primary Goal', value: formatEnum(generatedPayload.investorGoals.primaryGoal) },
      { label: 'Time Horizon', value: generatedPayload.investorGoals.timeHorizon },
      { label: 'Liquidity Needs', value: generatedPayload.investorGoals.liquidityNeeds },
    ])

    drawSection('2) Risk Tolerance & Capacity', [
      { label: 'Risk Perception (1-10)', value: String(generatedPayload.riskAssessment.riskPerception) },
      { label: 'Loss Aversion', value: formatEnum(generatedPayload.riskAssessment.lossAversion) },
      {
        label: 'Risk Capacity (% Net Worth)',
        value: `${generatedPayload.riskAssessment.riskCapacityPercentOfNetWorth}%`,
      },
    ])

    drawSection('3) Financial Constraints', [
      { label: 'Tax Status', value: formatEnum(generatedPayload.financialConstraints.taxStatus) },
      {
        label: 'Legal/Regulatory Restrictions',
        value: generatedPayload.financialConstraints.legalRegulatoryRestrictions,
      },
      { label: 'Unique Preferences', value: generatedPayload.financialConstraints.uniquePreferences },
    ])

    drawSection('4) Asset Allocation Preferences', [
      { label: 'Equities', value: `${generatedPayload.assetAllocation.equitiesPercent}%` },
      { label: 'Fixed Income', value: `${generatedPayload.assetAllocation.fixedIncomePercent}%` },
      { label: 'Cash', value: `${generatedPayload.assetAllocation.cashPercent}%` },
      {
        label: 'Rebalancing Frequency',
        value: formatEnum(generatedPayload.assetAllocation.rebalancingFrequency),
      },
    ])

    drawJsonAppendix()

    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 8, { align: 'right' })

    doc.save('investment-policy-statement-summary.pdf')
  }

  return (
    <main className="app-shell">
      <section className="card">
        <header className="header">
          <p className="brand">Rob Hubert, CFA</p>
          <p className="eyebrow">Investment Policy Statement Generator</p>
          <h1>Client Discovery Wizard</h1>
          <p className="subtitle">
            Collect a complete investor profile across goals, risk, constraints, and target
            allocation in a structured JSON format for PDF generation.
          </p>
        </header>

        <div className="progress-wrap" aria-label="Form progress">
          <div className="progress-meta">
            <span>
              Step {stepIndex + 1} of {steps.length}
            </span>
            <span>{progressPercent}% complete</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <section className="step-head">
            <h2>{currentStep.title}</h2>
            <p>{currentStep.subtitle}</p>
          </section>

          {currentStep.key === 'investorGoals' && (
            <div className="field-grid">
              <label className="field">
                <span>Primary Goal</span>
                <select
                  value={data.investorGoals.primaryGoal}
                  onChange={(event) =>
                    setField('investorGoals', 'primaryGoal', event.target.value as PrimaryGoal | '')
                  }
                >
                  <option value="">Select one</option>
                  <option value="retirement">Retirement</option>
                  <option value="capital_preservation">Capital Preservation</option>
                  <option value="wealth_accumulation">Wealth Accumulation</option>
                  <option value="education_funding">Education Funding</option>
                  <option value="other">Other</option>
                </select>
                {errors.primaryGoal && <small className="error">{errors.primaryGoal}</small>}
              </label>

              {data.investorGoals.primaryGoal === 'other' && (
                <label className="field">
                  <span>Describe Primary Goal</span>
                  <input
                    type="text"
                    value={data.investorGoals.primaryGoalOther}
                    onChange={(event) =>
                      setField('investorGoals', 'primaryGoalOther', event.target.value)
                    }
                    placeholder="Describe the objective"
                  />
                  {errors.primaryGoalOther && <small className="error">{errors.primaryGoalOther}</small>}
                </label>
              )}

              <label className="field">
                <span>Time Horizon</span>
                <input
                  type="text"
                  value={data.investorGoals.timeHorizon}
                  onChange={(event) => setField('investorGoals', 'timeHorizon', event.target.value)}
                  placeholder="e.g., 10 years before major withdrawals"
                />
                {errors.timeHorizon && <small className="error">{errors.timeHorizon}</small>}
              </label>

              <label className="field">
                <span>Liquidity Needs (next 2-5 years)</span>
                <textarea
                  rows={4}
                  value={data.investorGoals.liquidityNeeds}
                  onChange={(event) => setField('investorGoals', 'liquidityNeeds', event.target.value)}
                  placeholder="Major expenses such as home purchase, tuition, or business needs"
                />
                {errors.liquidityNeeds && <small className="error">{errors.liquidityNeeds}</small>}
              </label>
            </div>
          )}

          {currentStep.key === 'riskAssessment' && (
            <div className="field-grid">
              <label className="field">
                <span>Risk Perception (1-10)</span>
                <div className="slider-wrap">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={data.riskAssessment.riskPerception}
                    onChange={(event) =>
                      setField('riskAssessment', 'riskPerception', Number(event.target.value))
                    }
                  />
                  <output>{data.riskAssessment.riskPerception}</output>
                </div>
                {errors.riskPerception && <small className="error">{errors.riskPerception}</small>}
              </label>

              <fieldset className="field">
                <legend>Loss Aversion (20% one-year decline)</legend>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="lossAversion"
                      checked={data.riskAssessment.lossAversion === 'sell_everything'}
                      onChange={() => setField('riskAssessment', 'lossAversion', 'sell_everything')}
                    />
                    Sell everything
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="lossAversion"
                      checked={data.riskAssessment.lossAversion === 'do_nothing'}
                      onChange={() => setField('riskAssessment', 'lossAversion', 'do_nothing')}
                    />
                    Do nothing
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="lossAversion"
                      checked={data.riskAssessment.lossAversion === 'buy_more'}
                      onChange={() => setField('riskAssessment', 'lossAversion', 'buy_more')}
                    />
                    Buy more
                  </label>
                </div>
                {errors.lossAversion && <small className="error">{errors.lossAversion}</small>}
              </fieldset>

              <label className="field">
                <span>Risk Capacity (% of total net worth)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={data.riskAssessment.riskCapacityPercentOfNetWorth}
                  onChange={(event) =>
                    setField('riskAssessment', 'riskCapacityPercentOfNetWorth', event.target.value)
                  }
                  placeholder="e.g., 35"
                />
                {errors.riskCapacityPercentOfNetWorth && (
                  <small className="error">{errors.riskCapacityPercentOfNetWorth}</small>
                )}
              </label>
            </div>
          )}

          {currentStep.key === 'financialConstraints' && (
            <div className="field-grid">
              <label className="field">
                <span>Tax Status</span>
                <select
                  value={data.financialConstraints.taxStatus}
                  onChange={(event) =>
                    setField('financialConstraints', 'taxStatus', event.target.value as TaxStatus | '')
                  }
                >
                  <option value="">Select one</option>
                  <option value="taxable">Taxable Account</option>
                  <option value="tax_deferred">Tax-Deferred Account (401k/IRA)</option>
                  <option value="tax_exempt">Tax-Exempt Account</option>
                </select>
                {errors.taxStatus && <small className="error">{errors.taxStatus}</small>}
              </label>

              <label className="field">
                <span>Legal/Regulatory Restrictions</span>
                <textarea
                  rows={4}
                  value={data.financialConstraints.legalRegulatoryRestrictions}
                  onChange={(event) =>
                    setField(
                      'financialConstraints',
                      'legalRegulatoryRestrictions',
                      event.target.value,
                    )
                  }
                  placeholder="Insider trading restrictions, blackout windows, or 'None'"
                />
                {errors.legalRegulatoryRestrictions && (
                  <small className="error">{errors.legalRegulatoryRestrictions}</small>
                )}
              </label>

              <label className="field">
                <span>Unique Preferences / Exclusions</span>
                <textarea
                  rows={4}
                  value={data.financialConstraints.uniquePreferences}
                  onChange={(event) =>
                    setField('financialConstraints', 'uniquePreferences', event.target.value)
                  }
                  placeholder="Sector exclusions (ESG, tobacco, fossil fuels), or 'None'"
                />
                {errors.uniquePreferences && <small className="error">{errors.uniquePreferences}</small>}
              </label>
            </div>
          )}

          {currentStep.key === 'assetAllocation' && (
            <div className="field-grid">
              <div className="allocation-grid">
                <label className="field">
                  <span>Equities (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={data.assetAllocation.equitiesPercent}
                    onChange={(event) =>
                      setField('assetAllocation', 'equitiesPercent', event.target.value)
                    }
                    placeholder="60"
                  />
                  {errors.equitiesPercent && <small className="error">{errors.equitiesPercent}</small>}
                </label>
                <label className="field">
                  <span>Fixed Income (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={data.assetAllocation.fixedIncomePercent}
                    onChange={(event) =>
                      setField('assetAllocation', 'fixedIncomePercent', event.target.value)
                    }
                    placeholder="30"
                  />
                  {errors.fixedIncomePercent && (
                    <small className="error">{errors.fixedIncomePercent}</small>
                  )}
                </label>
                <label className="field">
                  <span>Cash (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={data.assetAllocation.cashPercent}
                    onChange={(event) => setField('assetAllocation', 'cashPercent', event.target.value)}
                    placeholder="10"
                  />
                  {errors.cashPercent && <small className="error">{errors.cashPercent}</small>}
                </label>
              </div>

              {errors.allocationTotal && <small className="error">{errors.allocationTotal}</small>}

              <label className="field">
                <span>Rebalancing Frequency</span>
                <select
                  value={data.assetAllocation.rebalancingFrequency}
                  onChange={(event) =>
                    setField(
                      'assetAllocation',
                      'rebalancingFrequency',
                      event.target.value as RebalancingFrequency | '',
                    )
                  }
                >
                  <option value="">Select one</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi_annually">Semi-Annually</option>
                  <option value="annually">Annually</option>
                </select>
                {errors.rebalancingFrequency && (
                  <small className="error">{errors.rebalancingFrequency}</small>
                )}
              </label>
            </div>
          )}

          <footer className="actions">
            <button type="button" onClick={handleBack} disabled={stepIndex === 0}>
              Back
            </button>

            {!isLastStep ? (
              <button type="button" className="primary" onClick={handleNext}>
                Next
              </button>
            ) : (
              <button type="submit" className="primary">
                Generate JSON Summary
              </button>
            )}
          </footer>
        </form>
      </section>

      {isSubmitted && (
        <section className="card output-card">
          <h2>JSON Payload (PDF Ready)</h2>
          <p className="subtitle">
            This structured object is ready to pass into a PDF generation utility or backend service.
          </p>
          <div className="output-actions">
            <button type="button" className="primary" onClick={handleDownloadPdf}>
              Download PDF Summary
            </button>
          </div>
          <pre>{JSON.stringify(generatedPayload, null, 2)}</pre>
        </section>
      )}
    </main>
  )
}

export default App
