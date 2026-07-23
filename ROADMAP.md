# Roadmap y auditoría — pendientes antes de testear con clientes reales

Este documento junta dos cosas: una auditoría de seguridad del estado actual del sitio,
y una lista de mejoras/funcionalidades pendientes. Ninguno de estos puntos está implementado
todavía — es una lista de trabajo para más adelante.

## Auditoría de seguridad

Resuelto:

- ✅ **Rol de Postgres de la app ya no es superusuario**: se creó un rol dedicado (`catalogo_app`)
  con permisos acotados a esta base puntual (sin `SUPERUSER`, sin `CREATEROLE`, sin `CREATEDB`).
  `DATABASE_URL` en producción (Vercel) ya usa ese rol. Si el connection string se filtra, ya no se
  puede borrar el proyecto entero de Supabase ni crear cuentas nuevas — sigue pudiendo leer/escribir
  los datos de la app (ver punto de aislamiento por `tenant_id` más abajo, que sigue pendiente).
- ✅ **Rate limiting en login**: 5 intentos fallidos en 15 minutos bloquean el email, tanto en
  `/admin/login` como en `/superadmin/login` (`src/lib/data/login-attempts.ts`).
- ✅ **Registro de auditoría de acciones administrativas**: nueva tabla `audit_log` +
  página `/superadmin/auditoria`. Queda registrado quién entra/sale del panel de una tienda
  (impersonation), altas/bajas/ediciones de tienda, y aprobación/rechazo de cambio de plan.
- ✅ **Política mínima de contraseñas**: 8 caracteres mínimo, validado en el servidor (no solo en
  el navegador) al crear tienda o superadmin, tanto desde el panel como desde los scripts de
  terminal (`src/lib/password-policy.ts`).

Prioridad **alta** (todavía pendiente, revisar antes de dar acceso a un cliente real):

- **Aislamiento de datos a nivel de base de datos**: el aislamiento entre tiendas (`tenant_id`)
  sigue viviendo solo en el código de la aplicación (cada consulta filtra por `tenant_id`), no en
  Postgres. No hay Row Level Security activa. Si el `DATABASE_URL` se filtra, quien lo tenga
  ve/edita los datos de **todas** las tiendas, no solo una (aunque ya no puede destruir el proyecto
  entero, ver punto resuelto arriba).
- **Sin backups automáticos configurados** en la base de producción (Supabase free tier, plan
  actual no tiene backups habilitados). Antes de tener datos reales de un cliente, definir una
  estrategia de backup.

Prioridad **media**:

- **Sin 2FA** en ningún rol (ni tienda ni superadmin).
- **Sesión JWT fija de 30 días, sin revocación individual**: si un empleado se va o se sospecha de
  un acceso indebido, no hay forma de invalidar solo esa sesión sin rotar el `JWT_SECRET` global
  (lo que desloguea a todos los usuarios de todas las tiendas).
- **Server Actions sin límite de uso** (más allá del login): cualquier acción (crear pedido,
  importar CSV, etc.) se puede invocar repetidamente sin límite — abre la puerta a abuso o gasto de
  recursos de la base (ej. crear miles de pedidos falsos, importar CSVs enormes en loop).

Prioridad **baja / a futuro**:

- Revisar límite de tamaño de archivo en la importación de CSV de productos.
- Las contraseñas demo actuales (`demo1234`, `style1234`) son intencionalmente débiles y ya quedaron
  expuestas en conversaciones — cambiarlas (o eliminarlas) antes de que el proyecto deje de ser un demo.
- La contraseña del usuario `postgres` (superusuario) de Supabase también quedó expuesta en
  conversaciones — ya no la usa la app en producción, pero conviene rotarla desde el dashboard de
  Supabase (Settings → Database → Reset database password) ya que sigue dando acceso total al
  proyecto.

## Pendientes / mejoras funcionales

- **Roles de personal por servicio**: hoy "Personal" (`/admin/staff`) son solo nombres para asignar
  turnos, sin login ni permisos propios. Falta poder asignar un rol/permiso acorde al servicio que
  presta cada persona — no todos deberían poder hacer todo dentro del panel.
- **Modular Productos/Servicios según tipo de tienda**: si la tienda tiene ambas cosas (`BOTH`),
  mostrar las dos secciones (ya está); si es solo `SERVICES`, la sección/nav debería decir
  "Servicios" en vez de "Productos"; si es solo `PRODUCTS`, mantener "Productos". Hoy el nombre del
  nav es fijo independientemente del tipo de tienda.
- **Marcar la pestaña activa en el sidebar** del panel admin — hoy ningún link del menú indica
  visualmente en qué sección está parado el usuario.
- **Poder editar la URL de la imagen de un producto ya creado** — hoy se carga la imagen solo al
  crear el producto, no hay forma de cambiarla después desde la edición inline.
- **Sacar "Entrar al panel" para el usuario superadmin** — revisar/aclarar alcance exacto antes de
  tocar nada (¿sacar el botón de impersonation por completo, o cambiar cómo se accede?).
- **Recordatorio de turnos del día actual con confirmación** — enviar un aviso (WhatsApp,
  probablemente) recordando los turnos del día y pidiendo confirmación al cliente.
