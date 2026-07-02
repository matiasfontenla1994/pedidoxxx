import bcrypt from "bcryptjs";
import { db, newId, nowIso } from "../src/lib/db";

async function main() {
  const existing = db.prepare("SELECT * FROM tenants WHERE slug = ?").get("biloba-demo");
  if (existing) {
    console.log("La tienda demo ya existe (biloba-demo). No se vuelve a crear.");
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const tenantId = newId();
  const ts = nowIso();

  db.prepare(
    `INSERT INTO tenants (id, slug, name, description, primary_color, whatsapp, plan, currency, delivery_fixed_cost, open_hours_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    tenantId,
    "biloba-demo",
    "Biloba Alimentación Natural",
    "Productos naturales y dietéticos. Tienda de demostración.",
    "#ff7e7e",
    "5491100000000",
    "ESPECIALISTA",
    "USD",
    2,
    JSON.stringify({
      lun: "9:00-18:00",
      mar: "9:00-18:00",
      mie: "9:00-18:00",
      jue: "9:00-18:00",
      vie: "9:00-18:00",
      sab: "9:00-13:00",
      dom: "cerrado",
    }),
    ts,
    ts
  );

  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, tenant_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(newId(), "demo@pedix-clone.test", passwordHash, "Dueño Demo", "OWNER", tenantId, ts);

  for (const pm of [
    { name: "Efectivo", adj: 0 },
    { name: "Transferencia", adj: -5 },
    { name: "Tarjeta", adj: 8 },
  ]) {
    db.prepare(`INSERT INTO payment_methods (id, tenant_id, name, adjustment_pct) VALUES (?, ?, ?, ?)`).run(
      newId(),
      tenantId,
      pm.name,
      pm.adj
    );
  }

  for (const z of [
    { name: "Centro", cost: 2 },
    { name: "Zona norte", cost: 4 },
  ]) {
    db.prepare(`INSERT INTO delivery_zones (id, tenant_id, name, cost) VALUES (?, ?, ?, ?)`).run(
      newId(),
      tenantId,
      z.name,
      z.cost
    );
  }

  db.prepare(
    `INSERT INTO coupons (id, tenant_id, code, type, value, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(newId(), tenantId, "BIENVENIDA10", "PERCENT", 10, ts);

  const catAlmacenId = newId();
  const catFrescosId = newId();
  db.prepare(`INSERT INTO categories (id, tenant_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)`).run(
    catAlmacenId,
    tenantId,
    "Almacén",
    0,
    ts
  );
  db.prepare(`INSERT INTO categories (id, tenant_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)`).run(
    catFrescosId,
    tenantId,
    "Frescos",
    1,
    ts
  );

  const products = [
    {
      categoryId: catAlmacenId,
      name: "Granola artesanal 500g",
      description: "Avena, miel, frutos secos.",
      price: 6.5,
      sku: "GRA-500",
      stock: 40,
      optionsJson: JSON.stringify([
        {
          name: "Tipo",
          choices: [
            { label: "Clásica", priceDelta: 0 },
            { label: "Con chocolate", priceDelta: 0.5 },
          ],
        },
      ]),
    },
    {
      categoryId: catAlmacenId,
      name: "Miel pura 1kg",
      description: "Miel de abeja sin procesar.",
      price: 9,
      sku: "MIEL-1K",
      stock: 25,
      optionsJson: "[]",
    },
    {
      categoryId: catFrescosId,
      name: "Pan integral",
      description: "Pan de masa madre 100% integral.",
      price: 3.2,
      sku: "PAN-INT",
      stock: 15,
      optionsJson: "[]",
    },
  ];

  let order = 0;
  for (const p of products) {
    db.prepare(
      `INSERT INTO products (id, tenant_id, category_id, name, description, price, images_json, sku, stock, active, sort_order, options_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, 1, ?, ?, ?, ?)`
    ).run(newId(), tenantId, p.categoryId, p.name, p.description, p.price, p.sku, p.stock, order++, p.optionsJson, ts, ts);
  }

  console.log("Seed OK.");
  console.log("Tienda demo: /biloba-demo");
  console.log("Login admin: demo@pedix-clone.test / demo1234");
}

main();
