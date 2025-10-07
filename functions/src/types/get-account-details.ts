export interface GetAccountDetailsData {
  accountNumber?: string;
}

export interface GetAccountDetailsResponse {
  success: boolean;
  accountNumber: string;
  agency: string;
  ownerName: string;
  ownerEmail: string | null;
  balance: number;
}
