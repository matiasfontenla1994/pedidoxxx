import QRCode from "qrcode";

export async function storeQrDataUrl(slug: string) {
  // En esta demo asumimos localhost; en producción usarías el dominio real.
  const url = `http://localhost:3000/${slug}`;
  return { url, dataUrl: await QRCode.toDataURL(url, { margin: 1, width: 220 }) };
}
