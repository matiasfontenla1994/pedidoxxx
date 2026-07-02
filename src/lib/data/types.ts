export interface Tenant {
  id: string;
  slug: string;
  name: string;
  alias: string | null;
  store_type: "PRODUCTS" | "SERVICES" | "BOTH";
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  whatsapp: string;
  plan: "PRINCIPIANTE" | "ESPECIALISTA" | "PRO";
  currency: string;
  delivery_fixed_cost: number;
  open_hours_json: string;
  created_at: string;
  updated_at: string;
}

export interface AppUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  tenant_id: string;
  created_at: string;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface OptionChoice {
  label: string;
  priceDelta: number;
}
export interface ProductOption {
  name: string;
  choices: OptionChoice[];
}

export interface Product {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  images_json: string;
  sku: string | null;
  stock: number | null;
  active: number;
  is_service: number;
  sort_order: number;
  options_json: string;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  tenant_id: string;
  name: string;
  active: number;
  created_at: string;
}

export interface StaffSchedule {
  id: string;
  staff_id: string;
  tenant_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  staff_id: string;
  order_id: string;
  service_name: string;
  date: string;
  time: string;
  duration_minutes: number;
  status: "CONFIRMED" | "CANCELLED";
  created_at: string;
}

export interface Coupon {
  id: string;
  tenant_id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  active: number;
  expires_at: string | null;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  tenant_id: string;
  name: string;
  adjustment_pct: number;
  active: number;
}

export interface DeliveryZone {
  id: string;
  tenant_id: string;
  name: string;
  cost: number;
  active: number;
}

export interface Order {
  id: string;
  tenant_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  items_json: string;
  subtotal: number;
  discount: number;
  delivery_cost: number;
  total: number;
  payment_method: string | null;
  coupon_code: string | null;
  notes: string | null;
  status: "NEW" | "IN_PROGRESS" | "READY" | "DELIVERED" | "CANCELLED";
  seen: number;
  created_at: string;
  updated_at: string;
}
