export type Tenant = {
  id: number;
  full_name: string;
  phone: string | null;
  email: string | null;
  citizen_id: string | null;
  note: string | null;
};


export type TenantCreate = {
  full_name: string;
  phone: string | null;
  email: string | null;
  citizen_id: string | null;
  note: string | null;
};


export type TenantUpdate = {
  full_name?: string;
  phone?: string | null;
  email?: string | null;
  citizen_id?: string | null;
  note?: string | null;
};