export type Contract = {
  id: number;
  room_id: number;
  tenant_id: number;
  start_date: string;
  end_date: string | null;
  move_in_electric_reading?: number | null;
  move_out_electric_reading?: number | null;
  monthly_rent: number;
  deposit_required: number;
  occupant_count: number;
  status: string;
};


export type ContractCreate = {
  room_id: number;
  tenant_id: number;
  start_date: string;
  end_date: string | null;
  move_in_electric_reading: number;
  monthly_rent: number;
  deposit_required: number;
  occupant_count: number;
};


export type ContractUpdate = {
  move_in_electric_reading?: number;
  room_id?: number;
  tenant_id?: number;
  start_date?: string;
  end_date?: string | null;
  monthly_rent?: number;
  deposit_required?: number;
  occupant_count?: number;
};


export type ContractEndRequest = {
  end_date: string | null;
  move_out_electric_reading?: number | null;
  allow_unsettled_deposit: boolean;
};