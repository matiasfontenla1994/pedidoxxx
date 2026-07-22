"use client";

import { useState } from "react";

interface OptionChoice { label: string; priceDelta: number }
interface ProductOption { name: string; choices: OptionChoice[] }

export default function ProductOptionsEditor({ initialOptions = [] }: { initialOptions?: ProductOption[] }) {
  const [groups, setGroups] = useState<ProductOption[]>(initialOptions);

  function addGroup() {
    setGroups((prev) => [...prev, { name: "", choices: [{ label: "", priceDelta: 0 }] }]);
  }

  function removeGroup(gi: number) {
    setGroups((prev) => prev.filter((_, i) => i !== gi));
  }

  function renameGroup(gi: number, name: string) {
    setGroups((prev) => prev.map((g, i) => (i === gi ? { ...g, name } : g)));
  }

  function addChoice(gi: number) {
    setGroups((prev) => prev.map((g, i) => (i === gi ? { ...g, choices: [...g.choices, { label: "", priceDelta: 0 }] } : g)));
  }

  function removeChoice(gi: number, ci: number) {
    setGroups((prev) => prev.map((g, i) => (i === gi ? { ...g, choices: g.choices.filter((_, j) => j !== ci) } : g)));
  }

  function updateChoice(gi: number, ci: number, field: "label" | "priceDelta", value: string) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === gi
          ? { ...g, choices: g.choices.map((c, j) => (j === ci ? { ...c, [field]: field === "priceDelta" ? Number(value) || 0 : value } : c)) }
          : g
      )
    );
  }

  const cleanGroups = groups
    .map((g) => ({ name: g.name.trim(), choices: g.choices.filter((c) => c.label.trim()) }))
    .filter((g) => g.name && g.choices.length > 0);

  return (
    <div className="col-span-2 space-y-3">
      <input type="hidden" name="optionsJson" value={JSON.stringify(cleanGroups)} />
      <p className="text-xs font-medium" style={{ color: "#6E635E" }}>
        Variantes (talle, sabor, etc. — opcional)
      </p>
      {groups.map((group, gi) => (
        <div key={gi} className="border rounded-lg p-3 space-y-2" style={{ borderColor: "#ECE6E2" }}>
          <div className="flex gap-2">
            <input
              value={group.name}
              onChange={(e) => renameGroup(gi, e.target.value)}
              placeholder="Nombre del grupo (ej. Talle)"
              className="input text-sm flex-1"
            />
            <button type="button" onClick={() => removeGroup(gi)} className="text-xs font-medium shrink-0" style={{ color: "#DC2626" }}>
              Quitar grupo
            </button>
          </div>
          <div className="space-y-1.5">
            {group.choices.map((choice, ci) => (
              <div key={ci} className="flex gap-2 items-center">
                <input
                  value={choice.label}
                  onChange={(e) => updateChoice(gi, ci, "label", e.target.value)}
                  placeholder="Opción (ej. M)"
                  className="input text-sm flex-1"
                />
                <input
                  type="number"
                  step="0.01"
                  value={choice.priceDelta}
                  onChange={(e) => updateChoice(gi, ci, "priceDelta", e.target.value)}
                  placeholder="Ajuste de precio"
                  className="input text-sm w-32"
                />
                <button type="button" onClick={() => removeChoice(gi, ci)} className="text-xs shrink-0" style={{ color: "#DC2626" }}>
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => addChoice(gi)} className="text-xs font-medium" style={{ color: "#211B18" }}>
            + Agregar opción
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addGroup}
        className="text-xs font-medium px-3 py-1.5 rounded-lg border"
        style={{ borderColor: "#ECE6E2", color: "#211B18" }}
      >
        + Agregar grupo de variantes
      </button>
    </div>
  );
}
