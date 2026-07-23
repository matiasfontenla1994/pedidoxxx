// Da de alta una tienda nueva desde la terminal, sin tocar SQL a mano.
// Uso:
//   npx tsx scripts/create-tenant.ts --name="Mi Tienda" --whatsapp=5491122334455 --email=dueno@mitienda.com --password=secreta123
//
// Flags opcionales: --slug --ownerName --plan=PRINCIPIANTE|ESPECIALISTA|PRO
//                    --currency=ARS --storeType=PRODUCTS|SERVICES|BOTH
import bcrypt from "bcryptjs";
import { db, pool, newId, nowIso } from "../src/lib/db";
import { validatePassword } from "../src/lib/password-policy";

function parseArgs() {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    args[key] = rest.join("=");
  }
  return args;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const args = parseArgs();

  const name = args.name;
  const whatsapp = args.whatsapp;
  const email = args.email;
  const password = args.password;

  if (!name || !whatsapp || !email || !password) {
    console.error(
      'Faltan datos. Uso mínimo:\n  npx tsx scripts/create-tenant.ts --name="Mi Tienda" --whatsapp=5491122334455 --email=dueno@mitienda.com --password=secreta123'
    );
    process.exit(1);
  }

  const slug = args.slug ? slugify(args.slug) : slugify(name);
  const plan = (args.plan ?? "PRINCIPIANTE").toUpperCase();
  const currency = (args.currency ?? "ARS").toUpperCase();
  const storeType = (args.storeType ?? "PRODUCTS").toUpperCase();

  if (await db.prepare("SELECT id FROM tenants WHERE slug = ?").get(slug)) {
    console.error(`Ya existe una tienda con el slug "${slug}". Probá con --slug=otro-nombre.`);
    process.exit(1);
  }
  if (await db.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
    console.error(`Ya existe un usuario con el email "${email}".`);
    process.exit(1);
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    console.error(passwordError);
    process.exit(1);
  }

  const tenantId = newId();
  const ts = nowIso();

  await db.prepare(
    `INSERT INTO tenants (id, slug, name, whatsapp, plan, currency, store_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(tenantId, slug, name, whatsapp, plan, currency, storeType, ts, ts);

  const passwordHash = await bcrypt.hash(password, 10);
  await db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, tenant_id, created_at) VALUES (?, ?, ?, ?, 'OWNER', ?, ?)`
  ).run(newId(), email, passwordHash, args.ownerName ?? "Dueño/a", tenantId, ts);

  // Método de pago por defecto para que el checkout no arranque vacío
  await db.prepare(
    `INSERT INTO payment_methods (id, tenant_id, name, adjustment_pct, adjustment_type) VALUES (?, ?, 'Efectivo', 0, 'PERCENT')`
  ).run(newId(), tenantId);

  console.log("Tienda creada.");
  console.log(`  Tienda pública: /${slug}`);
  console.log(`  Login admin:    /admin/login  ->  ${email}`);
  console.log(`  Plan: ${plan} · Moneda: ${currency} · Tipo: ${storeType}`);
  console.log("");
  console.log("Falta cargar desde el panel: categorías, productos, horarios y color de marca.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
