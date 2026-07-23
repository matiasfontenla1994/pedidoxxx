// Crea el primer usuario superadmin (rol de plataforma, sin tienda asociada).
// Uso: npx tsx scripts/create-superadmin.ts --email=vos@tudominio.com --password=algoSeguro --name="Tu Nombre"
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

async function main() {
  const args = parseArgs();
  const email = args.email?.trim().toLowerCase();
  const password = args.password;
  const name = args.name?.trim() || "Superadmin";

  if (!email || !password) {
    console.error(
      'Faltan datos. Uso:\n  npx tsx scripts/create-superadmin.ts --email=vos@tudominio.com --password=algoSeguro --name="Tu Nombre"'
    );
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

  const passwordHash = await bcrypt.hash(password, 10);
  await db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, tenant_id, created_at) VALUES (?, ?, ?, ?, 'SUPER_ADMIN', NULL, ?)`
  ).run(newId(), email, passwordHash, name, nowIso());

  console.log("Superadmin creado.");
  console.log(`  Login: /superadmin/login  ->  ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
