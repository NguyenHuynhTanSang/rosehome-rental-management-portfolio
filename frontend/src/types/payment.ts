export type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "OTHER"
  | "DEPOSIT";


export type ManualPaymentMethod =
  Exclude<
    PaymentMethod,
    "DEPOSIT"
  >;


export type Payment = {
  id: number;

  invoice_id: number;

  amount: number;

  payment_method: PaymentMethod;

  transaction_reference: string | null;

  receipt_file_key: string | null;

  receipt_original_name: string | null;

  confirmed_by: string | null;

  note: string | null;

  paid_at: string;
};


export type PaymentCreate = {
  amount: number;

  payment_method: ManualPaymentMethod;

  transaction_reference: string | null;

  note: string | null;
};