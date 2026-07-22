import { requireAdmin } from "@/lib/require-admin";
import { toCsv, PRODUCT_CSV_HEADERS } from "@/lib/csv";

export async function GET() {
  await requireAdmin();

  const rows = [
    PRODUCT_CSV_HEADERS,
    ["", "Remera básica", "12000", "20", "REM-001", "Ropa", "Remera de algodón 100%", "si", "no", "no"],
    ["", "Corte de cabello", "4500", "", "", "Servicios", "Corte personalizado", "si", "no", "si"],
  ];

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="plantilla-productos-ejemplo.csv"`,
    },
  });
}
