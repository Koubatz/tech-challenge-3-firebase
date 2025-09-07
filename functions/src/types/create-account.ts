export interface CreateAccountData {
  ownerName: string;
}

export interface CreateAccountResponse {
  success: boolean;
  docId: string;
  accountNumber: string;
}
