import type { CheckoutSnapshot } from "./checkoutSettlement";
export type InvoiceItem = {

  id: number;

  invoice_id?: number;

  item_type: string;

  description: string;

  quantity: number | null;

  unit: string | null;

  unit_price: number | null;

  amount: number;

};


export type Invoice = {

  checkout_settlement?: CheckoutSnapshot | null;

  id: number;

  room_id: number;

  year: number;

  month: number;

  electricity_period_year: number | null;

  electricity_period_month: number | null;

  electricity_transition_old_reading: number | null;

  electricity_transition_new_reading: number | null;

  meter_reading_id: number | null;

  version: number;

  status: string;

  payment_status?: string;

  // Mã RH cố định sau khi hóa đơn được phát hành.
  transfer_reference: string | null;

  total_amount: number;

  note: string | null;

  replaces_invoice_id?: number | null;

  cancelled_reason?: string | null;

  items: InvoiceItem[];

};


export type InvoiceBulkGenerate = {

  transition_readings?: { room_id: number; current_reading: number }[];

  year: number;

  month: number;

};


export type InvoiceBulkResult = {

  created_count: number;

  skipped_count: number;

  created_invoice_ids: number[];

  skipped_rooms: string[];

};


export type InvoiceItemCreate = {

  item_type:
    | "OTHER"
    | "DISCOUNT";

  description: string;

  amount: number;

};
