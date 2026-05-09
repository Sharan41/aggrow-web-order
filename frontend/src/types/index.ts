export type UserRole = "CUSTOMER" | "HEAD_OFFICE" | "FACTORY";

export type OrderStatus =
  | "DRAFT"
  | "SUBMITTED_TO_HO"
  | "HO_FORWARDED"
  | "FACTORY_RESPONDED"
  | "COMPLETED"
  | "REJECTED";

export interface Branch {
  id: number;
  name: string;
  code: string;
  address?: string | null;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  branch_id: number | null;
  branch?: Branch | null;
  active: boolean;
}

export interface ProductPacking {
  size_label: string;
  available: boolean;
}

export interface Product {
  id: number;
  s_no: number;
  name: string;
  packing_type: string | null;
  display_order: number;
  active: boolean;
  packings: ProductPacking[];
}

export interface PackingGroup {
  id: number;
  label: string;
  column_headers: string[];
  display_order: number;
  products: Product[];
}

export interface Category {
  id: number;
  name: string;
  display_order: number;
  packing_groups: PackingGroup[];
}

export interface Catalog {
  categories: Category[];
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  size_label: string;
  customer_qty: number;
  ho_qty: number;
  factory_available: boolean | null;
  factory_item_note: string | null;
}

export interface OrderEvent {
  id: number;
  actor_user_id: number | null;
  action: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface OrderSummary {
  id: number;
  customer_id: number;
  customer_name: string;
  branch_id: number | null;
  branch_name: string | null;
  status: OrderStatus;
  created_at: string;
  submitted_at: string | null;
  ho_forwarded_at: string | null;
  factory_responded_at: string | null;
  item_count: number;
}

export interface OrderDetail {
  id: number;
  customer_id: number;
  customer_name: string;
  branch_id: number | null;
  branch_name: string | null;
  status: OrderStatus;
  customer_note: string | null;
  ho_note: string | null;
  factory_note: string | null;
  created_at: string;
  submitted_at: string | null;
  ho_forwarded_at: string | null;
  factory_responded_at: string | null;
  items: OrderItem[];
  events: OrderEvent[];
}

export interface DashboardKPI {
  draft: number;
  submitted_to_ho: number;
  ho_forwarded: number;
  factory_responded: number;
  completed: number;
  rejected: number;
  total: number;
}

export interface Notification {
  id: number;
  user_id: number;
  order_id: number | null;
  type:
    | "ORDER_SUBMITTED"
    | "ORDER_FORWARDED"
    | "ORDER_RESPONDED"
    | "ORDER_COMPLETED"
    | "ORDER_REJECTED";
  message: string;
  read_at: string | null;
  created_at: string;
}
