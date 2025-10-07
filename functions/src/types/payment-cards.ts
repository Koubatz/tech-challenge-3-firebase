export type PaymentCardType = 'CREDIT' | 'DEBIT' | 'PHYSICAL' | 'VIRTUAL';

export interface CreatePaymentCardData {
  type: PaymentCardType;
  label?: string;
  brand?: string;
}

export interface CreatePaymentCardResponse {
  success: boolean;
  card: PaymentCard;
  message?: string;
}

export interface ListPaymentCardsResponse {
  success: boolean;
  cards: PaymentCard[];
}

export type PaymentCardTransactionType =
  | 'DEBIT'
  | 'CREDIT'
  | 'PURCHASE'
  | 'PAYMENT'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'CARD';

export type PaymentCardTransactionDirection = 'DEBIT' | 'CREDIT';

export interface PaymentCardTransaction {
  id: string;
  type: PaymentCardTransactionType;
  direction?: PaymentCardTransactionDirection;
  description?: string | null;
  amount: number;
  timestamp: string;
  category?: string | null;
}

export interface GetPaymentCardTransactionsData {
  cardId: string;
  limit?: number;
}

export interface GetPaymentCardTransactionsResponse {
  success: boolean;
  transactions: PaymentCardTransaction[];
}

export interface DeletePaymentCardData {
  cardId: string;
}

export interface DeletePaymentCardResponse {
  success: boolean;
  removedTransactions?: number;
}

export interface PaymentCard {
  id: string;
  cardType: PaymentCardType;
  brand?: string | null;
  label?: string | null;
  maskedNumber?: string | null;
  lastFourDigits?: string | null;
  cardNumber?: string | null;
  accountId?: string | null;
  accountNumber?: string | null;
  invoiceAmount?: number | null;
  invoiceDueDate?: string | null;
  availableLimit?: number | null;
  creditLimit?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
