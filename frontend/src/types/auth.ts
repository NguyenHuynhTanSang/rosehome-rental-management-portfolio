export type AuthUser = {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  tenant_id: number | null;
  created_at: string;
};


export type LoginRequest = {
  email: string;
  password: string;
};


export type LoginResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};