import { TransactionType } from "./perform-transaction";

export interface GetAccountStatementData {
  accountNumber: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  timestamp: string;
  newBalance: number;
}

export interface GetAccountStatementResponse {
  success: boolean;
  transactions: Transaction[];
}
