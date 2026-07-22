import { Pool, type QueryResultRow } from "pg";
import crypto from "node:crypto";

// Postgres en vez de node:sqlite: node:sqlite es de un solo archivo y bloquea
// el event loop en cada consulta, lo cual no escala para muchas tiendas con
// tráfico concurrente real. Postgres soporta conexiones concurrentes de verdad.

// Next.js carga .env solo, pero los scripts sueltos (seed, migraciones) corridos
// con tsx no — lo cargamos acá si todavía no está en el entorno.
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile();
  } catch {
    // sin .env en cwd, seguimos con lo que ya haya en el entorno
  }
}

const globalForDb = globalThis as unknown as { __pgPool?: Pool };

export const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });
if (process.env.NODE_ENV !== "production") globalForDb.__pgPool = pool;

function toPositional(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

interface Statement<T extends QueryResultRow = QueryResultRow> {
  get(...params: unknown[]): Promise<T | undefined>;
  all(...params: unknown[]): Promise<T[]>;
  run(...params: unknown[]): Promise<{ changes: number }>;
}

function prepare<T extends QueryResultRow = QueryResultRow>(sql: string): Statement<T> {
  const positional = toPositional(sql);
  return {
    async get(...params: unknown[]) {
      await ensureSchema();
      const res = await pool.query<T>(positional, params);
      return res.rows[0];
    },
    async all(...params: unknown[]) {
      await ensureSchema();
      const res = await pool.query<T>(positional, params);
      return res.rows;
    },
    async run(...params: unknown[]) {
      await ensureSchema();
      const res = await pool.query(positional, params);
      return { changes: res.rowCount ?? 0 };
    },
  };
}

export const db = {
  prepare,
  async exec(sql: string) {
    await ensureSchema();
    await pool.query(sql);
  },
};

function addColumnIfMissing(table: string, column: string, definition: string) {
  return `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition};`;
}

let schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!schemaReady) schemaReady = initSchema();
  return schemaReady;
}

async function initSchema() {
  await pool.query(`
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
  currency TEXT NOT NULL DEFAULT 'ARS',
  delivery_fixed_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
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
  price DOUBLE PRECISION NOT NULL,
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
  value DOUBLE PRECISION NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  adjustment_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  cost DOUBLE PRECISION NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  items_json TEXT NOT NULL,
  subtotal DOUBLE PRECISION NOT NULL,
  discount DOUBLE PRECISION NOT NULL DEFAULT 0,
  delivery_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
  total DOUBLE PRECISION NOT NULL,
  payment_method TEXT,
  coupon_code TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'NEW',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

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

CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'ALL',
  scope_id TEXT,
  buy_qty INTEGER NOT NULL,
  pay_qty INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
  `);

  // Columnas agregadas en iteraciones posteriores
  await pool.query(`
    ${addColumnIfMissing("tenants", "alias", "TEXT")}
    ${addColumnIfMissing("tenants", "store_type", "TEXT NOT NULL DEFAULT 'PRODUCTS'")}
    ${addColumnIfMissing("products", "is_service", "INTEGER NOT NULL DEFAULT 0")}
    ${addColumnIfMissing("products", "featured", "INTEGER NOT NULL DEFAULT 0")}
    ${addColumnIfMissing("orders", "seen", "INTEGER NOT NULL DEFAULT 0")}
    ${addColumnIfMissing("orders", "customer_email", "TEXT")}
    ${addColumnIfMissing("categories", "parent_id", "TEXT")}
    ${addColumnIfMissing("orders", "payment_adjustment", "DOUBLE PRECISION NOT NULL DEFAULT 0")}
    ${addColumnIfMissing("payment_methods", "adjustment_type", "TEXT NOT NULL DEFAULT 'PERCENT'")}
    ${addColumnIfMissing("tenants", "pickup_enabled", "INTEGER NOT NULL DEFAULT 0")}
    ${addColumnIfMissing("tenants", "status", "TEXT NOT NULL DEFAULT 'ACTIVE'")}
    ${addColumnIfMissing("tenants", "plan_requested", "TEXT")}
    ${addColumnIfMissing("orders", "source", "TEXT NOT NULL DEFAULT 'WHATSAPP'")}
    ${addColumnIfMissing("orders", "promo_discount", "DOUBLE PRECISION NOT NULL DEFAULT 0")}
    ${addColumnIfMissing("orders", "promo_label", "TEXT")}
    ${addColumnIfMissing("staff", "link_slug", "TEXT")}
  `);

  // Superadmin: usuarios de plataforma no atados a una tienda puntual
  await pool.query(`ALTER TABLE users ALTER COLUMN tenant_id DROP NOT NULL;`);

  // Índices por tenant_id: todas las consultas de listado filtran por esta columna
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON coupons(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant ON payment_methods(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_delivery_zones_tenant ON delivery_zones(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_promotions_tenant ON promotions(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff ON staff_schedules(staff_id);
    CREATE INDEX IF NOT EXISTS idx_blocked_slots_staff_date ON blocked_slots(staff_id, date);
  `);
}

export function newId() {
  return crypto.randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}
