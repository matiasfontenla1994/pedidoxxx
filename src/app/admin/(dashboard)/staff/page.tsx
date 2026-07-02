import { requireAdmin } from "@/lib/require-admin";
import { listStaff, getStaffSchedules } from "@/lib/data/staff";
import { createStaffAction, deleteStaffAction, upsertStaffScheduleAction, removeStaffScheduleDayAction } from "@/lib/actions/staff";
import DeleteButton from "../delete-button";
import StaffSlotManager from "./slot-manager";

const DAYS: [number, string][] = [
  [0, "Lunes"],
  [1, "Martes"],
  [2, "Miércoles"],
  [3, "Jueves"],
  [4, "Viernes"],
  [5, "Sábado"],
  [6, "Domingo"],
];

export default async function StaffPage() {
  const { tenant } = await requireAdmin();
  const staffList = listStaff(tenant.id);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold" style={{ color: "#211B18" }}>Personal y horarios</h1>

      <form action={createStaffAction} className="bg-white border rounded-2xl p-4 flex gap-2" style={{ borderColor: "#ECE6E2" }}>
        <input name="name" required placeholder="Nombre del profesional" className="input flex-1" />
        <button className="text-white px-4 rounded-xl font-medium text-sm" style={{ background: "#E85A47" }}>Agregar</button>
      </form>

      {staffList.length === 0 && (
        <p className="text-sm" style={{ color: "#9C8E87" }}>Todavía no agregaste personal.</p>
      )}

      {staffList.map((member) => {
        const schedules = getStaffSchedules(member.id);
        const scheduleByDay = Object.fromEntries(schedules.map((s) => [s.day_of_week, s]));

        return (
          <div key={member.id} className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#ECE6E2" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#ECE6E2" }}>
              <h2 className="font-semibold" style={{ color: "#211B18" }}>{member.name}</h2>
              <DeleteButton action={deleteStaffAction} id={member.id} />
            </div>

            {/* ── Slot manager FIRST (most used feature) ── */}
            <div className="px-4 py-4 border-b" style={{ borderColor: "#ECE6E2", background: "#FEFCFB" }}>
              <StaffSlotManager staffId={member.id} staffName={member.name} />
            </div>

            {/* ── Schedule config (collapsed by default) ── */}
            <details>
              <summary
                className="flex items-center justify-between px-4 py-3 cursor-pointer select-none list-none hover:bg-[#FAF8F6] transition-colors"
              >
                <span className="text-sm font-medium" style={{ color: "#6E635E" }}>
                  Configurar horarios disponibles
                </span>
                <span className="text-xs" style={{ color: "#9C8E87" }}>
                  {schedules.length > 0 ? `${schedules.length} día(s) habilitado(s)` : "Sin horarios"}
                </span>
              </summary>

              <div className="px-4 pb-4 pt-2 space-y-2">
                {DAYS.map(([dayNum, dayLabel]) => {
                  const existing = scheduleByDay[dayNum];
                  return (
                    <div key={dayNum} className="border rounded-xl p-3 space-y-2" style={{ borderColor: "#ECE6E2" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: "#211B18" }}>{dayLabel}</span>
                        {existing && (
                          <form action={removeStaffScheduleDayAction.bind(null, member.id, dayNum)}>
                            <button className="text-xs" style={{ color: "#E85A47" }}>Quitar</button>
                          </form>
                        )}
                      </div>
                      <form action={upsertStaffScheduleAction} className="flex flex-wrap gap-2 items-end">
                        <input type="hidden" name="staffId" value={member.id} />
                        <input type="hidden" name="dayOfWeek" value={dayNum} />
                        <label className="text-xs" style={{ color: "#6E635E" }}>
                          Desde
                          <input name="startTime" type="time" defaultValue={existing?.start_time ?? "09:00"} className="input mt-0.5 w-28 text-sm" />
                        </label>
                        <label className="text-xs" style={{ color: "#6E635E" }}>
                          Hasta
                          <input name="endTime" type="time" defaultValue={existing?.end_time ?? "18:00"} className="input mt-0.5 w-28 text-sm" />
                        </label>
                        <label className="text-xs" style={{ color: "#6E635E" }}>
                          Duración (min)
                          <input name="slotMinutes" type="number" min={15} step={15} defaultValue={existing?.slot_minutes ?? 30} className="input mt-0.5 w-20 text-sm" />
                        </label>
                        <button className="text-white px-3 py-1.5 rounded-lg text-xs" style={{ background: "#211B18" }}>
                          {existing ? "Actualizar" : "Habilitar"}
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            </details>
          </div>
        );
      })}
    </div>
  );
}
