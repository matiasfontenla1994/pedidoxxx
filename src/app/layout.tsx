import type { Metadata } from "next";
import { Onest } from "next/font/google";
import "./globals.css";

const onest = Onest({ subsets: ["latin"], display: "swap", variable: "--font-onest" });

export const metadata: Metadata = {
  title: "Pedix Clone — tienda online + pedidos por WhatsApp",
  description: "Clon educativo de Pedix: catálogo digital, pedidos por WhatsApp y panel admin.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full ${onest.variable}`}>
      <body
        className="min-h-full flex flex-col antialiased"
        style={{ background: "#FAF8F6", color: "#211B18", fontFamily: "var(--font-onest), ui-sans-serif, system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
