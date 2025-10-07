export interface CreateAccountData {
  ownerName: string;
  ownerEmail: string;
}

export interface CreateAccountResponse {
  success: boolean;
  docId: string;
  accountNumber: string;
}
