"use client";

import { useState, useTransition } from "react";
import { getStaffSlotsStatusAction, toggleBlockedSlotAction, type SlotStatus } from "@/lib/actions/staff";

interface Slot {
  time: string;
  status: SlotStatus;
}

export default function StaffSlotManager({ staffId, staffName }: { staffId: string; staffName: string }) {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function loadSlots(selectedDate: string) {
    if (!selectedDate) return;
    setLoading(true);
    const result = await getStaffSlotsStatusAction(staffId, selectedDate);
    setSlots(result);
    setLoading(false);
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const d = e.target.value;
    setDate(d);
    setSlots([]);
    loadSlots(d);
  }

  function handleToggle(time: string, status: SlotStatus) {
    if (status === "booked_online") return; // no se puede desbloquear un turno real
    startTransition(async () => {
      await toggleBlockedSlotAction(staffId, date, time);
      // Actualizar estado local optimistamente
      setSlots((prev) =>
        prev.map((s) =>
          s.time === time
            ? { ...s, status: s.status === "blocked_manual" ? "available" : "blocked_manual" }
            : s
        )
      );
    });
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="border-t pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-600">Turnos de {staffName}</p>
        <input
          type="date"
          value={date}
          min={today}
          onChange={handleDateChange}
          className="input !w-auto text-sm"
        />
      </div>

      {loading && <p className="text-sm text-zinc-400">Cargando horarios...</p>}

      {!loading && date && slots.length === 0 && (
        <p className="text-sm text-zinc-400">No hay horario configurado para ese día.</p>
      )}

      {slots.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                key={slot.time}
                disabled={slot.status === "booked_online" || pending}
                onClick={() => handleToggle(slot.time, slot.status)}
                title={
                  slot.status === "booked_online"
                    ? "Turno reservado online — no se puede modificar"
                    : slot.status === "blocked_manual"
                    ? "Bloqueado manualmente — click para liberar"
                    : "Disponible — click para bloquear"
                }
                className={`px-3 py-1.5 rounded-lg text-sm border font-medium transition-colors ${
                  slot.status === "booked_online"
                    ? "bg-red-100 text-red-700 border-red-200 cursor-not-allowed"
                    : slot.status === "blocked_manual"
                    ? "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200"
                    : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                {slot.time}
                {slot.status === "booked_online" && " 🔴"}
                {slot.status === "blocked_manual" && " 🟠"}
              </button>
            ))}
          </div>

          <div className="flex gap-4 text-xs text-zinc-500 pt-1">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-zinc-200 inline-block" /> Disponible</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-200 inline-block" /> Bloqueado (manual)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" /> Reservado online</span>
          </div>
        </>
      )}

      {!date && (
        <p className="text-xs text-zinc-400">Seleccioná una fecha para ver y gestionar los turnos.</p>
      )}
    </div>
  );
}
