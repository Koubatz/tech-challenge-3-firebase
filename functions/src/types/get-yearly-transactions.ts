import { Transaction } from './get-account-statement';

export interface GetYearlyTransactionsData {
  year?: number;
  accountNumber?: string;
}

export interface MonthlyTransactions {
  month: number;
  transactions: Transaction[];
}

export interface GetYearlyTransactionsResponse {
  success: boolean;
  year: number;
  months: MonthlyTransactions[];
}
