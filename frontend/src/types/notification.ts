export type NotificationItem = {
  id: number;
  notification_type: string;
  contract_id: number;
  room_id: number;
  room_code: string;
  reminder_stage: "30_DAYS" | "7_DAYS" | string;
  contract_end_date: string;
  days_remaining: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type NotificationUnreadCount = {
  unread_count: number;
};

export type NotificationReadResult = {
  message: string;
  notification_id: number;
};

export type NotificationReadAllResult = {
  message: string;
  updated_count: number;
};