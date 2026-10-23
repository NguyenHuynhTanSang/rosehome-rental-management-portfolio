export type MeterReading = {
  id: number;

  room_id: number;

  year: number;
  month: number;

  old_reading: number;
  new_reading: number;

  consumption: number;
};


export type MeterReadingBulkItem = {
  room_id: number;

  new_reading: number;
};


export type MeterReadingBulkCreate = {
  year: number;
  month: number;

  readings: MeterReadingBulkItem[];
};