export type RoomStatus =
  | "AVAILABLE"
  | "COMING_SOON";

export type Room = {
  id: number;
  code: string;

  price: number;
  area: number;
  maxPeople: number;

  description: string;
  availableFrom: string;
  status: RoomStatus;

  amenities: string[];
  furniture: string[];

  electricityRate: number;
  waterFee: number;
  parkingFee: number;
  wifiFee: number;
  depositMonths: number;

  images: string[];
};

// Dữ liệu demo giả lập cho Portfolio công khai.
// Mã phòng, diện tích, giá thuê và mọi khoản phí chỉ dùng minh họa,
// không đại diện cho phòng, khách thuê hoặc báo giá thực tế.
export const rooms: Room[] = [
  {
    id: 1,
    code: "DEMO-A01",
    price: 2100000,
    area: 20,
    maxPeople: 1,
    description: "Phòng demo A: không gian giả lập để minh họa giao diện danh sách phòng.",
    availableFrom: "Demo: có thể xem ngay, không phải tin cho thuê thực tế",
    status: "AVAILABLE",
    amenities: ["Wifi minh họa", "Khu bếp minh họa"],
    furniture: ["Giường minh họa", "Bàn minh họa"],
    electricityRate: 3000,
    waterFee: 60000,
    parkingFee: 50000,
    wifiFee: 20000,
    depositMonths: 1,
    images: [],
  },
  {
    id: 2,
    code: "DEMO-B02",
    price: 2700000,
    area: 28,
    maxPeople: 2,
    description: "Phòng demo B: dữ liệu giả lập để minh họa bộ lọc và trang chi tiết.",
    availableFrom: "Demo: có thể xem ngay, không phải tin cho thuê thực tế",
    status: "AVAILABLE",
    amenities: ["Wifi minh họa", "Chỗ để xe minh họa"],
    furniture: ["Giường minh họa", "Tủ minh họa"],
    electricityRate: 3000,
    waterFee: 60000,
    parkingFee: 50000,
    wifiFee: 20000,
    depositMonths: 1,
    images: [],
  },
  {
    id: 3,
    code: "DEMO-C03",
    price: 3300000,
    area: 34,
    maxPeople: 3,
    description: "Phòng demo C: dữ liệu giả lập minh họa trạng thái sắp có phòng.",
    availableFrom: "Demo: sắp có, không áp dụng lịch nhận phòng thực tế",
    status: "COMING_SOON",
    amenities: ["Wifi minh họa", "Khu bếp minh họa"],
    furniture: ["Giường minh họa", "Bàn minh họa", "Tủ minh họa"],
    electricityRate: 3000,
    waterFee: 60000,
    parkingFee: 50000,
    wifiFee: 20000,
    depositMonths: 1,
    images: [],
  },
];
