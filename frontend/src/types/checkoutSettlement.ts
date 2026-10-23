export type CheckoutSnapshot = {
  id: number;
  contract_id: number;
  invoice_id: number | null;
  source_invoice_id: number | null;
  baseline_invoice_id: number;
  checkout_date: string;
  checkout_type: "EARLY" | "ON_TIME" | null;
  deposit_balance_at_prepare: number | null;
  deposit_forfeit_amount: number | null;
  deposit_offset_amount: number | null;
  deposit_refund_amount: number | null;
  tenant_due_after_deposit: number | null;

  deposit_execution_status: "PENDING" | "APPLIED";
  deposit_forfeit_transaction_id: number | null;
  deposit_deduction_transaction_id: number | null;
  deposit_refund_transaction_id: number | null;
  deposit_payment_id: number | null;
  deposit_processed_at: string | null;

  move_out_electric_reading: number;
  electricity_old_reading: number;
  electricity_new_reading: number;
  electricity_consumption: number;
  electricity_rate: number;
  electricity_amount: number;
  carried_electricity_amount: number;
  electricity_enabled: boolean;
  rent_mode: string;
  rent_amount: number;
  rent_period_start: string | null;
  rent_period_end: string | null;
  water_amount: number;
  management_amount: number;
  other_amount: number;
  total_amount: number;
  reason: string;
  status: string;
};
export type CheckoutAmounts = Omit<
  CheckoutSnapshot,
  | "id"
  | "invoice_id"
  | "status"
  | "deposit_execution_status"
  | "deposit_forfeit_transaction_id"
  | "deposit_deduction_transaction_id"
  | "deposit_refund_transaction_id"
  | "deposit_payment_id"
  | "deposit_processed_at"
>;
export type CheckoutInput = {
  room_id: number;
  invoice_id: number | null;
  checkout_date: string;
  checkout_type: "EARLY" | "ON_TIME";
  move_out_electric_reading: number;
  rent_mode: "NONE" | "FULL_MONTH" | "PRORATED" | "CUSTOM";
  rent_period_start: string | null;
  rent_period_end: string | null;
  custom_rent_amount: number;
  include_electricity: boolean;
  include_water: boolean;
  include_management: boolean;
  other_amount: number;
  reason: string;
};
export type CheckoutPreview = {
  snapshot: CheckoutAmounts;
  preview_token: string;
  action: "CREATE" | "UPDATE" | "REPLACE" | "PRESERVE";
  invoice_id: number | null;
  invoice_version: number | null;
  previous_items: { type: string; amount: number; description: string }[];
};


export type CheckoutDepositApplyRequest = {
  confirmed: true;
};
