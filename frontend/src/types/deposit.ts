export type DepositTransactionType =
  | "COLLECT"
  | "REFUND"
  | "DEDUCTION"
  | "FORFEIT";


export type ManualDepositTransactionType =
  Exclude<
    DepositTransactionType,
    "FORFEIT"
  >;


export type DepositTransaction = {
  id: number;

  contract_id: number;

  transaction_type:
    DepositTransactionType;

  amount: number;

  note: string | null;

  created_at: string;
};


export type DepositTransactionCreate = {
  transaction_type:
    ManualDepositTransactionType;

  amount: number;

  note: string | null;
};


export type DepositSummary = {
  contract_id: number;

  required_amount: number;

  total_collected: number;

  total_refunded: number;

  total_deducted: number;

  total_forfeited: number;

  current_balance: number;
};