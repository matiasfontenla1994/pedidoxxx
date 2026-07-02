import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

// Usamos node:sqlite (built-in en Node 22.5+) en vez de Prisma.
// Motivo: en este entorno de desarrollo, la descarga de los binarios del
// motor de Prisma (binaries.prisma.sh) está bloqueada por la red del sandbox
// (403 Forbidden), así que Prisma no podía generar su cliente. node:sqlite
// viene incluido en Node y no requiere descargar nada. Es una decisión de
// esta implementación, no algo de Pedix.

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "dev.db");

const globalForDb = globalThis as unknown as { __db?: DatabaseSync };

export const db = globalForDb.__db ?? new DatabaseSync(dbPath);
if (process.env.NODE_ENV !== "production") globalForDb.__db = db;

db.exec(`PRAGMA journal_mode = WAL;`);

// Add columns to existing tables without losing data
function addColumnIfMissing(table: string, column: string, definition: string) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch {
    // column already exists
  }
}

db.exec(`
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#ff7e7e',
  whatsapp TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'PRINCIPIANTE',
  currency TEXT NOT NULL DEFAULT 'USD',
  delivery_fixed_cost REAL NOT NULL DEFAULT 0,
  open_hours_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'OWNER',
  tenant_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  category_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  images_json TEXT NOT NULL DEFAULT '[]',
  sku TEXT,
  stock INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  options_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  value REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  adjustment_pct REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  cost REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  items_json TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  delivery_cost REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT,
  coupon_code TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'NEW',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);

// Migrate existing tables with new columns
addColumnIfMissing("tenants", "alias", "TEXT");
addColumnIfMissing("tenants", "store_type", "TEXT NOT NULL DEFAULT 'PRODUCTS'");
addColumnIfMissing("products", "is_service", "INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("orders", "seen", "INTEGER NOT NULL DEFAULT 0");

db.exec(`
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff_schedules (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  slot_minutes INTEGER NOT NULL DEFAULT 30
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blocked_slots (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(staff_id, date, time)
);
`);

export function newId() {
  return crypto.randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}
