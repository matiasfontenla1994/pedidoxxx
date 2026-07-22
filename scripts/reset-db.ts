// Borra todas las tablas de la base Postgres para volver a empezar de cero.
// Uso: npm run db:reset (llama a este script y después a db:seed)
import { pool } from "../src/lib/db";

async function main() {
  await pool.query(`
    DROP TABLE IF EXISTS
      blocked_slots, appointments, staff_schedules, staff,
      orders, delivery_zones, payment_methods, coupons,
      products, categories, users, tenants
    CASCADE;
  `);
  console.log("Tablas eliminadas.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
