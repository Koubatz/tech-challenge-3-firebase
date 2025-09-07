export enum TransactionType {
  DEPOSIT = "DEPOSIT",
  WITHDRAWAL = "WITHDRAWAL",
}

export interface PerformTransactionData {
  accountNumber: string;
  amount: number;
  type: TransactionType;
}

export interface PerformTransactionResponse {
  success: boolean;
  transactionId: string;
  newBalance: number;
}
