"use client";

import { useState, useEffect, useCallback } from "react";
import { getAvailableSlotsAction } from "@/lib/actions/appointments";
import { createOrderAction } from "@/lib/actions/orders";

interface StaffVM { id: string; name: string }
interface ServiceVM { id: string; name: string; price: number; description: string | null }
interface TenantVM { id: string; whatsapp: string; currency: string; primaryColor: string }

/** Returns YYYY-MM-DD of the next day this staff member works (0=Mon…6=Sun convention) */
function nextWorkingDate(schedules: { dayOfWeek: number }[]): string {
  if (schedules.length === 0) return "";
  const workDays = new Set(schedules.map((s) => s.dayOfWeek));
  const today = new Date();
  for (let i = 1; i <= 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const jsDay = d.getDay(); // 0=Sun…6=Sat
    const ourDay = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon…6=Sun
    if (workDays.has(ourDay)) {
      return d.toISOString().split("T")[0];
    }
  }
  return "";
}

export default function BookingSection({
  tenant,
  staff,
  services,
  staffSchedules,
}: {
  tenant: TenantVM;
  staff: StaffVM[];
  services: ServiceVM[];
  staffSchedules: Record<string, { dayOfWeek: number }[]>;
}) {
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ orderId: string; whatsappLink: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedStaff = staff.find((s) => s.id === staffId);
  const selectedService = services.find((s) => s.id === serviceId);

  const loadSlotsForDate = useCallback(async (sid: string, d: string) => {
    if (!sid || !d) return;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedTime("");
    const available = await getAvailableSlotsAction(sid, d);
    setSlots(available);
    setLoadingSlots(false);
  }, []);

  // Auto-select next working date whenever staff changes
  useEffect(() => {
    const schedules = staffSchedules[staffId] ?? [];
    const next = nextWorkingDate(schedules);
    if (next) {
      setDate(next);
      loadSlotsForDate(staffId, next);
    } else {
      setDate("");
      setSlots([]);
    }
  }, [staffId, staffSchedules, loadSlotsForDate]);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedService || !selectedStaff || !date || !selectedTime) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await createOrderAction({
        tenantId: tenant.id,
        customerName: name,
        customerPhone: phone,
        notes: notes || undefined,
        deliveryZoneCost: 0,
        items: [{ productId: selectedService.id, quantity: 1, optionsPriceDelta: 0 }],
        appointment: {
          staffId: selectedStaff.id,
          staffName: selectedStaff.name,
          serviceName: selectedService.name,
          date,
          time: selectedTime,
          durationMinutes: 30,
        },
      });
      setResult(res);
    } catch {
      setError("No se pudo registrar el turno. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="bg-white border rounded-2xl p-6 space-y-3 max-w-md mx-auto text-center" style={{ borderColor: "#ECE6E2" }}>
        <p className="text-lg font-semibold">¡Turno registrado!</p>
        <p className="text-sm" style={{ color: "#6E635E" }}>
          {selectedService?.name} con {selectedStaff?.name} · {date} a las {selectedTime}
        </p>
        <p className="text-xs" style={{ color: "#9C8E87" }}>Pedido #{result.orderId.slice(0, 8)}</p>
        <a
          href={result.whatsappLink}
          target="_blank"
          rel="noreferrer"
          className="block text-center text-white py-3 rounded-xl font-medium"
          style={{ backgroundColor: "#25D366" }}
        >
          Confirmar por WhatsApp
        </a>
        <button
          onClick={() => { setResult(null); setSelectedTime(""); setSlots([]); setName(""); setPhone(""); setNotes(""); }}
          className="text-sm" style={{ color: "#9C8E87" }}
        >
          Reservar otro turno
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-md mx-auto">
      {/* Service selector */}
      {services.length > 1 ? (
        <div>
          <label className="text-sm font-medium block mb-1">Servicio</label>
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="input">
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {tenant.currency} {s.price.toFixed(2)}
              </option>
            ))}
          </select>
        </div>
      ) : selectedService && (
        <div className="rounded-xl p-3" style={{ background: "#FAF8F6", border: "1px solid #ECE6E2" }}>
          <p className="font-medium" style={{ color: "#211B18" }}>{selectedService.name}</p>
          {selectedService.description && (
            <p className="text-sm mt-0.5" style={{ color: "#9C8E87" }}>{selectedService.description}</p>
          )}
          <p className="font-semibold mt-1" style={{ color: tenant.primaryColor }}>
            {tenant.currency} {selectedService.price.toFixed(2)}
          </p>
        </div>
      )}

      {/* Staff selector */}
      {staff.length > 1 ? (
        <div>
          <label className="text-sm font-medium block mb-1">Profesional</label>
          <div className="flex flex-wrap gap-2">
            {staff.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStaffId(s.id)}
                className="px-3 py-2 rounded-xl border text-sm transition-colors"
                style={
                  staffId === s.id
                    ? { backgroundColor: tenant.primaryColor, borderColor: tenant.primaryColor, color: "#fff" }
                    : { borderColor: "#ECE6E2", color: "#6E635E", background: "#fff" }
                }
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      ) : selectedStaff && (
        <div>
          <label className="text-sm font-medium block mb-1">Profesional</label>
          <p className="text-sm rounded-xl px-3 py-2 border" style={{ borderColor: "#ECE6E2", color: "#211B18", background: "#fff" }}>
            {selectedStaff.name}
          </p>
        </div>
      )}

      {/* Date + slots */}
      <div>
        <label className="text-sm font-medium block mb-1">Fecha</label>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => {
              setDate(e.target.value);
              setSlots([]);
              setSelectedTime("");
            }}
            className="input flex-1"
          />
          <button
            type="button"
            onClick={() => loadSlotsForDate(staffId, date)}
            disabled={!date || !staffId || loadingSlots}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-colors"
            style={{ backgroundColor: tenant.primaryColor }}
          >
            {loadingSlots ? "..." : "Ver horarios"}
          </button>
        </div>
      </div>

      {loadingSlots && (
        <p className="text-sm" style={{ color: "#9C8E87" }}>Cargando horarios disponibles…</p>
      )}

      {!loadingSlots && slots.length > 0 && (
        <div>
          <label className="text-sm font-medium block mb-2">Horario disponible</label>
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setSelectedTime(slot)}
                className="px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors"
                style={
                  selectedTime === slot
                    ? { backgroundColor: tenant.primaryColor, borderColor: tenant.primaryColor, color: "#fff" }
                    : { borderColor: "#ECE6E2", color: "#6E635E", background: "#fff" }
                }
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loadingSlots && date && slots.length === 0 && (
        <p className="text-sm" style={{ color: "#9C8E87" }}>No hay horarios disponibles para ese día.</p>
      )}

      {selectedTime && (
        <div className="space-y-3 border-t pt-4" style={{ borderColor: "#ECE6E2" }}>
          <p className="text-sm font-semibold" style={{ color: "#211B18" }}>Tus datos</p>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="input" />
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" className="input" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas opcionales" className="input" rows={2} />
          {error && <p className="text-sm" style={{ color: "#DC2626" }}>{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full text-white py-3 rounded-xl font-medium disabled:opacity-50 transition-colors"
            style={{ backgroundColor: tenant.primaryColor }}
          >
            {submitting ? "Reservando…" : `Reservar turno · ${selectedTime}`}
          </button>
        </div>
      )}
    </form>
  );
}
