import QRCode from "qrcode";
import { headers } from "next/headers";

export async function getStoreBaseUrl() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function storeQrDataUrl(slug: string) {
  const base = await getStoreBaseUrl();
  const url = `${base}/${slug}`;
  return { url, dataUrl: await QRCode.toDataURL(url, { margin: 1, width: 220 }) };
}
