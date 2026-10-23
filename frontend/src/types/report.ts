export type DebtReportItem = {
  invoice_id: number;

  room_id: number;

  room_code: string;

  year: number;

  month: number;

  invoice_total: number;

  total_paid: number;

  remaining_amount: number;

  payment_status: string;
};


export type DebtReport = {
  total_debt: number;

  debt_invoice_count: number;

  items: DebtReportItem[];
};