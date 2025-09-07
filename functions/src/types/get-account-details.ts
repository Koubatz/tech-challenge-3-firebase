export interface GetAccountDetailsData {
  accountNumber: string;
}

export interface GetAccountDetailsResponse {
  success: boolean;
  accountNumber: string;
  agency: string;
  ownerName: string;
  balance: number;
}
