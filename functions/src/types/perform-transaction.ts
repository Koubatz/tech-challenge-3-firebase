export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
}

export interface PerformTransactionData {
  amount: number;
  type: TransactionType;
  timestamp?: string | number;
  category?: string;
}

export interface PerformTransactionResponse {
  success: boolean;
  transactionId: string;
  newBalance: number;
}
