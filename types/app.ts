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
