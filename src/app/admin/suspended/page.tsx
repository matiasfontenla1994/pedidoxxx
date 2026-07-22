import { logoutAction } from "@/lib/actions/auth";

export default function SuspendedPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="bg-white border rounded-xl p-6 w-full max-w-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold" style={{ color: "#211B18" }}>Tienda suspendida</h1>
        <p className="text-sm" style={{ color: "#6E635E" }}>
          Tu tienda está temporalmente suspendida y no podés acceder al panel ni recibir pedidos.
          Contactá a soporte para regularizar la situación.
        </p>
        <form action={logoutAction}>
          <button className="text-sm font-medium" style={{ color: "#E85A47" }}>Cerrar sesión</button>
        </form>
      </div>
    </main>
  );
}
