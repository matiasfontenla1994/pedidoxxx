// Copia todos los datos de data/dev.db (SQLite) a la base Postgres configurada
// en DATABASE_URL. Pensado para correr UNA vez al migrar de motor.
// Uso: npm run db:migrate-sqlite
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { pool } from "../src/lib/db";

// Orden sin relevancia estricta (no hay FKs declaradas), pero mantiene la
// lectura prolija: entidades "padre" antes que las que las referencian.
const TABLES = [
  "tenants",
  "users",
  "categories",
  "products",
  "coupons",
  "payment_methods",
  "delivery_zones",
  "orders",
  "staff",
  "staff_schedules",
  "appointments",
  "blocked_slots",
];

async function main() {
  const dbPath = path.join(process.cwd(), "data", "dev.db");
  if (!fs.existsSync(dbPath)) {
    console.error(`No encontré ${dbPath}. Nada que migrar.`);
    process.exit(1);
  }
  const sqlite = new DatabaseSync(dbPath);

  for (const table of TABLES) {
    let rows: Record<string, unknown>[];
    try {
      rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
    } catch {
      console.log(`${table}: no existe en el sqlite de origen, se salta.`);
      continue;
    }
    if (rows.length === 0) {
      console.log(`${table}: sin filas.`);
      continue;
    }

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const insertSql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;

    let migrated = 0;
    for (const row of rows) {
      const values = columns.map((c) => row[c]);
      await pool.query(insertSql, values);
      migrated++;
    }
    console.log(`${table}: ${migrated} fila(s) migrada(s).`);
  }

  console.log("Migración completa.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
