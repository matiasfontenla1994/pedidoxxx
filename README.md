# Catálogo Digital (proyecto de demostración)

SaaS multi-tienda de catálogo digital: recepción de pedidos por WhatsApp, turnos/servicios
y panel de administración con planes (Principiante/Especialista/Pro) que limitan cantidad de
productos y funcionalidades disponibles.

## Cómo correrlo

Requiere **Node.js 22.5+** y una instancia de **PostgreSQL** corriendo (local o remota).

1. Configurá `DATABASE_URL` en `.env`, por ejemplo:
   `DATABASE_URL="postgres://usuario:password@localhost:5432/pedix_clone"`
2. Instalá dependencias y sembrá los datos:

```bash
npm install
npm run db:seed     # crea la tienda demo + usuario admin (crea las tablas si no existen)
npm run dev          # http://localhost:3000 (si el puerto está ocupado, Next elige otro y lo avisa en consola)
```

- Tienda demo: `http://localhost:3000/biloba-demo`
- Panel admin: `http://localhost:3000/admin/login` → `demo@catalogo-demo.test` / `demo1234`

Para reiniciar los datos desde cero: `npm run db:reset`.

Para dar de alta una tienda nueva hay dos caminos:
- **Panel de superadmin** (recomendado): `/superadmin/login`. El primer usuario superadmin se crea con
  `npm run superadmin:create -- --email=vos@tudominio.com --password=... --name="Tu Nombre"`.
- **Terminal**: `npm run tenant:create -- --name="Mi Tienda" --whatsapp=549... --email=dueno@mitienda.com --password=...`
  (ver `scripts/create-tenant.ts`).

Si venís de una versión anterior con datos en `data/dev.db` (SQLite), migralos con
`npm run db:migrate-sqlite` (una sola vez, copia todo a Postgres).

Para correr en modo producción: `npm run build && npm run start`.

## Qué incluye

- **Storefront público multi-tienda** (`/[slug]`): catálogo por categorías y subcategorías,
  sección de "Ofertas especiales" (productos destacados), variantes de producto (talle/sabor/etc.
  con ajuste de precio), carrito persistente en la sesión, checkout con cupón (% o monto fijo),
  método de pago (con recargo/descuento % o fijo, calculado en vivo), envío a domicilio o retiro
  en local, y horarios de atención.
- **Pedido por WhatsApp**: al confirmar, se guarda el pedido en la base (con el desglose de
  subtotal/descuento/recargo/envío) y se abre un link `wa.me` con el detalle ya formateado.
- **Turnos / servicios**: tiendas de tipo `SERVICES` o `BOTH` permiten reservar turno con
  personal y horarios propios (`admin/staff`), con su propio flujo de confirmación por WhatsApp.
- **Panel admin**: login, resumen del día con pedidos recientes editables, centro de pedidos con
  filtro por rango de fechas (default: mes en curso), estado y orden (fecha/monto), vista de
  detalle de pedido donde se puede **editar cantidades, quitar o agregar productos** a un pedido
  ya creado (con ajuste automático de stock), notificación opcional por WhatsApp al cliente
  cuando cambia el estado del pedido, CRUD de productos y categorías (con subcategorías),
  productos y servicios en secciones separadas (para tiendas de tipo `BOTH`), importación y
  exportación de productos por CSV (con plantilla de ejemplo descargable), configuración de
  tienda (datos, color, horarios, retiro en local, métodos de pago editables, zonas de envío,
  cupones editables), QR de la tienda, y una página de "Plan" con la comparativa completa y un
  botón para solicitar cambio de plan.
- **Panel de superadmin** (`/superadmin`): rol de plataforma (no atado a una tienda) que ve todas
  las tiendas creadas, puede darlas de alta/baja, suspenderlas (por falta de pago, por ejemplo),
  editar sus datos y plan, aprobar o descartar solicitudes de cambio de plan, e ingresar al panel
  de cualquier tienda (impersonation) para dar soporte sin pedir credenciales. Convive con
  `npm run tenant:create` para alta por script.
- **Gating por plan** (`src/lib/plans.ts`): límite de cantidad de productos (30/80/150 según
  plan), imágenes por producto, SKU, cupones y zonas de envío por distancia. El resto de los
  flags (`bulkEdit`, `advancedStats`, `pointOfSale`, etc.) están definidos pero todavía no
  restringen nada.

## Decisiones técnicas y por qué

- **Next.js 14+ (App Router) + TypeScript + Tailwind**: un solo proyecto sirve tienda y panel.
- **PostgreSQL vía `pg` (node-postgres)**: el proyecto arrancó sobre `node:sqlite` (un solo archivo,
  síncrono) porque en el entorno de desarrollo original la descarga de los binarios de Prisma
  estaba bloqueada. Al pensar la app para muchas tiendas concurrentes se migró a Postgres real:
  conexiones concurrentes de verdad (sin bloquear el event loop en cada consulta), e índices por
  `tenant_id` en las tablas que más se consultan. La capa de datos sigue aislada en
  `src/lib/db.ts` + `src/lib/data/*.ts` (todas las funciones son ahora `async`), así que si el día
  de mañana conviene un ORM (Prisma/Drizzle) encima de la misma base, el resto de la app no se
  entera. `scripts/migrate-sqlite-to-postgres.ts` migra los datos de una instalación vieja.
- **`wa.me` en vez de la API oficial de WhatsApp Business**: no requiere cuenta de Meta
  verificada ni contratos comerciales, alcanza para resolver "pedido por WhatsApp" en este
  proyecto de demostración.
- **Sesión de admin**: cookie HttpOnly firmada con JWT (`jose`) + contraseña con `bcryptjs`. Sin
  servicios externos.

## Qué NO está implementado (a propósito)

- **Pagos reales** (Mercado Pago, Ualá, Zenrise, Stripe, etc.): no hay credenciales, así que no
  hay cobro online real. El método de pago sí ajusta el total del pedido (recargo/descuento
  configurable), pero el cobro en sí lo arreglan cliente y vendedor por fuera del sistema.
- **WhatsApp Business API oficial / Meta**: solo el link público `wa.me`.
- **Multi-país con impuestos, facturación electrónica, Correo Argentino, Rapiboy/Puni,
  Fudo/Thinkion/MRC**: integraciones de terceros que requieren cuentas propias.
- **App nativa de celular**: es una web responsive.
- **Multi-tenant en el dominio**: cada tienda vive en `/slug`, no en subdominio o dominio propio.
- **Variantes de producto solo con 1 nivel**: un grupo de opciones (ej. "Talle") con una lista
  plana de valores + ajuste de precio. No hay combinaciones cruzadas de dos grupos (talle × color)
  con stock independiente por combinación.

## Estructura

```
src/
  app/
    page.tsx                  landing simple del SaaS (lista tiendas creadas)
    [slug]/page.tsx            storefront público (Server Component)
    [slug]/store-client.tsx    carrito + checkout (Client Component)
    admin/login                login
    admin/(dashboard)/         panel admin protegido (dashboard, pedidos, productos,
                                categorías, configuración, plan)
    superadmin/                panel de plataforma (lista tiendas, alta de tiendas nuevas)
  lib/
    db.ts                      pool de Postgres (pg) + creación/migración de tablas
    data/                      acceso a datos (una función async por entidad)
    actions/                   Server Actions (auth, catálogo, pedidos, configuración, superadmin)
    plans.ts                   definición de los 3 planes y su gating
    whatsapp.ts                armado del mensaje y link wa.me
    auth.ts                    sesión (JWT en cookie) + hash de contraseña
scripts/
  seed.ts, seed-peluqueria.ts  tiendas + catálogo de demostración
  create-tenant.ts             alta de tienda por terminal
  create-superadmin.ts         alta del primer usuario superadmin
  migrate-sqlite-to-postgres.ts  migración única desde una instalación vieja en SQLite
  reset-db.ts                  borra todas las tablas (usado por npm run db:reset)
```
