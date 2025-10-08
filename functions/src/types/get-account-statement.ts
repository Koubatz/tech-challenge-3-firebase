import { TransactionType } from './perform-transaction';

export interface GetAccountStatementData {
  accountNumber?: string;
  page?: number;
  pageSize?: number;
  transactionType?: TransactionType;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  timestamp: string;
  newBalance: number;
  category?: string | null;
}

export interface GetAccountStatementResponse {
  success: boolean;
  transactions: Transaction[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}
