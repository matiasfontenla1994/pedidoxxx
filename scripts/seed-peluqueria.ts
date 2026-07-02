import bcrypt from "bcryptjs";
import { db, newId, nowIso } from "../src/lib/db";

async function main() {
  const existing = db.prepare("SELECT id FROM tenants WHERE slug = ?").get("style-demo");
  if (existing) {
    console.log("La tienda style-demo ya existe. Eliminando para recrear...");
    const t = existing as { id: string };
    db.prepare("DELETE FROM staff_schedules WHERE tenant_id = ?").run(t.id);
    db.prepare("DELETE FROM staff WHERE tenant_id = ?").run(t.id);
    db.prepare("DELETE FROM appointments WHERE tenant_id = ?").run(t.id);
    db.prepare("DELETE FROM products WHERE tenant_id = ?").run(t.id);
    db.prepare("DELETE FROM categories WHERE tenant_id = ?").run(t.id);
    db.prepare("DELETE FROM payment_methods WHERE tenant_id = ?").run(t.id);
    db.prepare("DELETE FROM users WHERE tenant_id = ?").run(t.id);
    db.prepare("DELETE FROM tenants WHERE id = ?").run(t.id);
  }

  const passwordHash = await bcrypt.hash("style1234", 10);
  const tenantId = newId();
  const ts = nowIso();

  db.prepare(
    `INSERT INTO tenants (id, slug, name, alias, store_type, description, primary_color, whatsapp, plan, currency, delivery_fixed_cost, open_hours_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    tenantId,
    "style-demo",
    "Style Barber & Shop",
    "Style",
    "BOTH",
    "Peluquería profesional. También vendemos productos para el cuidado del cabello.",
    "#1a1a2e",
    "5491155550000",
    "ESPECIALISTA",
    "ARS",
    0,
    JSON.stringify({
      lun: "9:00-19:00",
      mar: "9:00-19:00",
      mie: "9:00-19:00",
      jue: "9:00-19:00",
      vie: "9:00-19:00",
      sab: "9:00-15:00",
      dom: "cerrado",
    }),
    ts,
    ts
  );

  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, tenant_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(newId(), "style@pedix-clone.test", passwordHash, "Dueño Style", "OWNER", tenantId, ts);

  // Payment methods
  for (const pm of [
    { name: "Efectivo", adj: 0 },
    { name: "Transferencia", adj: -5 },
    { name: "Tarjeta débito", adj: 0 },
  ]) {
    db.prepare(`INSERT INTO payment_methods (id, tenant_id, name, adjustment_pct) VALUES (?, ?, ?, ?)`).run(
      newId(), tenantId, pm.name, pm.adj
    );
  }

  // Coupon
  db.prepare(`INSERT INTO coupons (id, tenant_id, code, type, value, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
    newId(), tenantId, "STYLE10", "PERCENT", 10, ts
  );

  // Categories
  const catProductosId = newId();
  const catServiciosId = newId();
  db.prepare(`INSERT INTO categories (id, tenant_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)`).run(
    catProductosId, tenantId, "Productos", 0, ts
  );
  db.prepare(`INSERT INTO categories (id, tenant_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)`).run(
    catServiciosId, tenantId, "Servicios", 1, ts
  );

  // Products (is_service = 0)
  const products = [
    { name: "Shampoo anticaída 300ml", desc: "Fórmula profesional para cabello débil.", price: 3500, cat: catProductosId },
    { name: "Acondicionador hidratante", desc: "Hidratación profunda para todo tipo de cabello.", price: 2800, cat: catProductosId },
    { name: "Pomada fijadora fuerte", desc: "Fijación extrema con acabado mate.", price: 2200, cat: catProductosId },
  ];
  for (const [i, p] of products.entries()) {
    db.prepare(
      `INSERT INTO products (id, tenant_id, category_id, name, description, price, images_json, sku, stock, active, is_service, sort_order, options_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, '[]', NULL, 50, 1, 0, ?, '[]', ?, ?)`
    ).run(newId(), tenantId, p.cat, p.name, p.desc, p.price, i, ts, ts);
  }

  // Services (is_service = 1)
  const services = [
    { name: "Corte de cabello", desc: "Corte personalizado según tu estilo.", price: 4500 },
    { name: "Corte + barba", desc: "Corte de cabello y perfilado de barba.", price: 6500 },
    { name: "Coloración completa", desc: "Tintura profesional con productos de primera.", price: 9000 },
    { name: "Tratamiento keratina", desc: "Alisado y nutrición profunda.", price: 14000 },
  ];
  for (const [i, s] of services.entries()) {
    db.prepare(
      `INSERT INTO products (id, tenant_id, category_id, name, description, price, images_json, sku, stock, active, is_service, sort_order, options_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, '[]', NULL, NULL, 1, 1, ?, '[]', ?, ?)`
    ).run(newId(), tenantId, catServiciosId, s.name, s.desc, s.price, i, ts, ts);
  }

  // Staff
  const staff = [
    { name: "Rodrigo" },
    { name: "Valentina" },
    { name: "Lucas" },
    { name: "Camila" },
  ];

  for (const s of staff) {
    const staffId = newId();
    db.prepare(`INSERT INTO staff (id, tenant_id, name, active, created_at) VALUES (?, ?, ?, 1, ?)`).run(
      staffId, tenantId, s.name, ts
    );

    // Schedules: Mon-Fri 9-19 (30min slots), Sat 9-15
    for (let day = 0; day <= 4; day++) { // Mon-Fri
      db.prepare(
        `INSERT INTO staff_schedules (id, staff_id, tenant_id, day_of_week, start_time, end_time, slot_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(newId(), staffId, tenantId, day, "09:00", "19:00", 30);
    }
    // Saturday
    db.prepare(
      `INSERT INTO staff_schedules (id, staff_id, tenant_id, day_of_week, start_time, end_time, slot_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(newId(), staffId, tenantId, 5, "09:00", "15:00", 30);
  }

  console.log("\n✓ Tienda style-demo creada.");
  console.log("  Storefront : http://localhost:3000/style-demo");
  console.log("  Login admin: style@pedix-clone.test / style1234");
  console.log("  Tipo       : BOTH (productos + servicios con turnos)");
  console.log("  Personal   : Rodrigo, Valentina, Lucas, Camila");
  console.log("  Horarios   : Lun-Vie 09-19, Sab 09-15, turnos c/30 min\n");
}

main();
