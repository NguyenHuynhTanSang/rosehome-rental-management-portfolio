export type Room = {
  id: number;

  room_code: string;

  floor: number | null;

  status: string;

  description: string | null;
};


export type RoomCreate = {
  room_code: string;

  floor: number | null;

  description: string | null;

  electricity_rate: number;

  water_fee: number;

  management_fee: number;
};


export type RoomDetail = Room & {
  electricity_rate: number;

  water_fee: number;

  management_fee: number;
};


export type RoomUpdate = {
  room_code?: string;

  floor?: number | null;

  description?: string | null;

  electricity_rate?: number;

  water_fee?: number;

  management_fee?: number;
};