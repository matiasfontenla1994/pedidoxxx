# Pedix Clone (proyecto de demostración)

Clon educativo de [Pedix](https://info.pedix.app/es/) construido en esta sesión: catálogo digital
multi-tienda + recepción de pedidos por WhatsApp + panel de administración con planes
(Principiante/Especialista/Pro) que replican la tabla de funcionalidades real.

Ver `../01_analisis_pedix.md` y `../02_arquitectura_clon.md` para el análisis completo y las
decisiones de arquitectura.

## Cómo correrlo

Requiere **Node.js 22.5 o superior** (usa `node:sqlite`, que es una API experimental incluida en
Node, ver sección "Decisiones técnicas" más abajo).

```bash
npm install
npm run db:seed     # crea la tienda demo + usuario admin
npm run dev          # http://localhost:3000
```

- Tienda demo: `http://localhost:3000/biloba-demo`
- Panel admin: `http://localhost:3000/admin/login` → `demo@pedix-clone.test` / `demo1234`

Para reiniciar los datos desde cero: `npm run db:reset`.

Para correr en modo producción: `npm run build && npm run start`.

## Qué incluye

- **Storefront público multi-tienda** (`/[slug]`): catálogo por categorías, variantes de producto
  (talle/sabor/etc. con ajuste de precio), carrito, checkout con cupón/método de
  pago/zona de envío, horarios de atención.
- **Pedido por WhatsApp**: al confirmar, se guarda el pedido en la base y se abre un link
  `wa.me` con el detalle ya formateado (productos, cliente, total, forma de pago).
- **Panel admin**: login, resumen con estadísticas básicas (pedidos, facturación, ticket
  promedio, métodos de pago más usados), centro de pedidos con cambio de estado, CRUD de
  productos y categorías, configuración de tienda (datos, color, horarios, métodos de pago,
  zonas de envío, cupones), QR de la tienda, y una página de "Plan" con la comparativa completa.
- **Gating por plan** (`src/lib/plans.ts`): los límites (imágenes por producto, SKU, cupones,
  categorías dinámicas, zonas de envío por distancia, estadísticas avanzadas, etc.) están
  configurados igual que la tabla real de Pedix.

## Decisiones técnicas y por qué

- **Next.js 14+ (App Router) + TypeScript + Tailwind**: un solo proyecto sirve tienda y panel.
- **`node:sqlite` en vez de Prisma**: originalmente armé el modelo de datos con Prisma, pero en
  este entorno de desarrollo la descarga de los binarios del motor de Prisma
  (`binaries.prisma.sh`) devolvía 403 Forbidden (bloqueado por la red del sandbox), así que
  `prisma generate` no podía completarse. Pivoté a `node:sqlite`, que viene incluido en Node
  22.5+ y no necesita descargar nada externo. La capa de datos queda en `src/lib/db.ts` +
  `src/lib/data/*.ts`. Si en tu máquina Prisma sí puede descargar sus binarios, migrar es
  sencillo porque toda la lógica de acceso a datos está aislada en esos archivos.
- **`wa.me` en vez de la API oficial de WhatsApp Business**: no requiere cuenta de Meta
  verificada. Esto es una suposición mía sobre cómo resolver "pedido por WhatsApp" sin
  contratos comerciales — no tengo confirmado que así funcione Pedix internamente.
- **Sesión de admin**: cookie HttpOnly firmada con JWT (`jose`) + contraseña con `bcryptjs`. Sin
  servicios externos.

## Qué NO está implementado (a propósito)

- **Pagos reales** (Mercado Pago, Ualá, Zenrise, Stripe, etc.): no hay credenciales, así que no
  hay cobro online real. El campo "método de pago" es solo informativo en el pedido.
- **WhatsApp Business API oficial / Meta**: solo el link público `wa.me`.
- **Multi-país con impuestos, facturación electrónica, Correo Argentino, Rapiboy/Puni,
  Fudo/Thinkion/MRC**: integraciones de terceros que requieren cuentas propias.
- **App nativa de celular**: es una web responsive.
- **Escala productiva**: SQLite local alcanza para desarrollo/demo, no para miles de pedidos
  concurrentes. Para producción real conviene Postgres + un ORM con motor disponible
  (Prisma si tu red permite descargar sus binarios, o Drizzle).
- **Multi-tenant en el dominio**: cada tienda vive en `/slug`, no en subdominio o dominio propio.

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
  lib/
    db.ts                      conexión SQLite + creación de tablas
    data/                      acceso a datos (una función por entidad)
    actions/                   Server Actions (auth, catálogo, pedidos, configuración)
    plans.ts                   definición de los 3 planes y su gating
    whatsapp.ts                armado del mensaje y link wa.me
    auth.ts                    sesión (JWT en cookie) + hash de contraseña
scripts/seed.ts                tienda + usuario + catálogo de demostración
```
