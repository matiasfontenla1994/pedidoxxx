// Genera el link wa.me con el pedido formateado.
// Nota: esto NO es la API oficial de WhatsApp Business (requiere cuenta de Meta
// verificada). Es el link público que cualquiera puede usar sin aprobación,
// ver 02_arquitectura_clon.md para el porqué de esta decisión.

export interface OrderItemForMessage {
  name: string;
  quantity: number;
  unitPrice: number;
  optionsLabel?: string;
}

export function buildOrderMessage(params: {
  storeName: string;
  storeAlias?: string | null;
  items: OrderItemForMessage[];
  subtotal: number;
  discount: number;
  deliveryCost: number;
  total: number;
  currency: string;
  customerName: string;
  customerAddress?: string;
  paymentMethod?: string;
  couponCode?: string;
  notes?: string;
  appointment?: { staffName: string; date: string; time: string; serviceName: string };
}) {
  const displayName = params.storeAlias || params.storeName;
  const lines: string[] = [];
  lines.push(`*Nuevo pedido - ${displayName}*`);
  lines.push("");
  if (params.appointment) {
    const { serviceName, staffName, date, time } = params.appointment;
    lines.push(`*Turno:* ${serviceName}`);
    lines.push(`*Profesional:* ${staffName}`);
    lines.push(`*Fecha y hora:* ${date} a las ${time}`);
    lines.push("");
  }
  lines.push(`*Cliente:* ${params.customerName}`);
  if (params.customerAddress) lines.push(`*Dirección:* ${params.customerAddress}`);
  lines.push("");
  lines.push("*Productos:*");
  for (const item of params.items) {
    const opt = item.optionsLabel ? ` (${item.optionsLabel})` : "";
    lines.push(
      `- ${item.quantity}x ${item.name}${opt} — ${params.currency} ${(
        item.unitPrice * item.quantity
      ).toFixed(2)}`
    );
  }
  lines.push("");
  lines.push(`Subtotal: ${params.currency} ${params.subtotal.toFixed(2)}`);
  if (params.discount > 0) lines.push(`Descuento: -${params.currency} ${params.discount.toFixed(2)}`);
  if (params.deliveryCost > 0) lines.push(`Envío: ${params.currency} ${params.deliveryCost.toFixed(2)}`);
  lines.push(`*Total: ${params.currency} ${params.total.toFixed(2)}*`);
  if (params.paymentMethod) lines.push(`Forma de pago: ${params.paymentMethod}`);
  if (params.couponCode) lines.push(`Cupón aplicado: ${params.couponCode}`);
  if (params.notes) lines.push(`Notas: ${params.notes}`);
  return lines.join("\n");
}

export function buildWhatsappLink(phone: string, message: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
