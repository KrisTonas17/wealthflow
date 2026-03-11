export interface IncomeData {
  mode: 'individual' | 'family'
  person1Income: number
  person2Income: number
  person1Bonus: number
  person2Bonus: number
  person1AdditionalCash: number
  person2AdditionalCash: number
  filingStatus: 'single' | 'married'
  state: string
}

export interface BudgetData {
  monthlyExpenses: number
}

export interface AllocationData {
  savings: number      // percentage
  investing: number    // percentage
  extraTax: number     // percentage
  funSpending: number  // percentage
}

export type LifeEventType =
  | 'raise'
  | 'job_loss'
  | 'new_job'
  | 'baby'
  | 'home_buy'
  | 'home_sell'
  | 'marriage'
  | 'divorce'
  | 'inheritance'
  | 'large_expense'
  | 'debt_payoff'
  | 'retire'
  | 'side_income'
  | 'expense_drop'

export interface LifeEvent {
  id: string
  type: LifeEventType
  label: string
  monthOffset: number   // months from now
  // Income delta (monthly, can be negative)
  incomeChange: number
  // Expense delta (monthly, can be negative)
  expenseChange: number
  // One-time cash impact (negative = spend, positive = receive)
  oneTimeCash: number
  // Investing contribution delta (monthly)
  investingChange: number
  color: string
  emoji: string
  note: string
}
