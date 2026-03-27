export type UserRole = "ADMIN" | "LANDLORD" | "STUDENT";

export type HostelStatus = "PENDING" | "APPROVED" | "REJECTED";

export type BookingStatus =
  | "PENDING_VERIFICATION"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Hostel {
  id: string;
  landlord_id: string;
  name: string;
  description: string;
  location: string;
  address: string;
  price_per_year: number;
  status: HostelStatus;
  facilities: string[];
  images: string[];
  bank_name: string;
  account_number: string;
  account_name: string;
  whatsapp_number?: string;
  total_rooms: number;
  available_rooms: number;
  created_at: string;
  updated_at: string;
  landlord?: User;
}

export interface Room {
  id: string;
  hostel_id: string;
  room_number: string;
  price: number;
  capacity: number;
  is_available: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
  hostel?: Hostel;
}

export interface Booking {
  id: string;
  student_id: string;
  room_id: string;
  hostel_id: string;
  status: BookingStatus;
  academic_year: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  student?: User;
  room?: Room;
  hostel?: Hostel;
  payment_proof?: PaymentProof;
}

export interface PaymentProof {
  id: string;
  booking_id: string;
  image_url?: string;
  whatsapp_proof?: string;
  note?: string;
  amount: number;
  status: PaymentStatus;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  booking?: Booking;
}

export interface Favorite {
  student_id: string;
  hostel_id: string;
  created_at: string;
  hostel?: Hostel;
}

export interface HostelFilters {
  search?: string;
  location?: string;
  min_price?: number;
  max_price?: number;
  facilities?: string[];
  status?: HostelStatus;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiError {
  error: string;
  details?: string;
}

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  name: string;
};
