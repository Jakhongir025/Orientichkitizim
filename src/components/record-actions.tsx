"use client";
import { useState } from "react";
import { api, Modal } from "./ui";
import type { Lookups } from "./types";
type Field = {
  key: string;
  label: string;
  type?: string;
  options?: { id: string; name: string }[];
};
export function RecordActions<T extends { id: string }>({
  resource,
  record,
  lookup,
  onSaved,
  onEdit,
  deleteOnly = false,
}: {
  resource: string;
  record: T;
  lookup?: Lookups;
  onSaved: () => void;
  onEdit?: () => void;
  deleteOnly?: boolean;
}) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const values = record as Record<string, unknown>;
  const cars = lookup?.cars.map((c) => ({ id: c.id, name: c.plateNumber }));
  const fields: Field[] =
    resource === "daily-reports"
      ? [
          { key: "carId", label: "Avtomobil", options: cars },
          { key: "date", label: "Sana", type: "date" },
          { key: "description", label: "Bajarilgan ish" },
          { key: "expenseAmount", label: "Xarajat (so‘m)", type: "number" },
          { key: "expenseNotes", label: "Xarajat izohi" },
        ]
      : resource === "services"
        ? [
            { key: "carId", label: "Avtomobil", options: cars },
            {
              key: "serviceTypeId",
              label: "Servis turi",
              options: lookup?.serviceTypes,
            },
            { key: "date", label: "Sana", type: "date" },
            { key: "mileage", label: "Masofa (km)", type: "number" },
            { key: "notes", label: "Izoh" },
          ]
        : resource === "rentals"
          ? [
              { key: "customerName", label: "Mijoz" },
              { key: "phone", label: "Telefon" },
              { key: "contractNumber", label: "Shartnoma" },
              { key: "issuedBy", label: "Topshirgan" },
              { key: "acceptedBy", label: "Qabul qilgan" },
            ]
          : resource === "audit-logs"
            ? [
                { key: "action", label: "Amal" },
                { key: "entityType", label: "Obyekt turi" },
              ]
            : resource === "notifications"
              ? [
                  { key: "title", label: "Sarlavha" },
                  { key: "message", label: "Xabar" },
                ]
              : [{ key: "name", label: "Nomi" }];
  return (
    <>
      <div className="inline-actions">
        {!deleteOnly && (
          <button
            className="text-button"
            onClick={() => {
              setError("");
              onEdit ? onEdit() : setMode("edit");
            }}
          >
            Tahrirlash
          </button>
        )}
        <button
          className="text-button danger-text"
          onClick={() => {
            setError("");
            setMode("delete");
          }}
        >
          O‘chirish
        </button>
      </div>
      {mode && (
        <Modal
          title={mode === "delete" ? "Yozuvni o‘chirish" : "Yozuvni tahrirlash"}
          onClose={() => setMode(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api(
                  `record-management/${resource}/${record.id}`,
                  mode === "delete" ? "DELETE" : "PATCH",
                  mode === "edit"
                    ? Object.fromEntries(new FormData(e.currentTarget))
                    : undefined,
                );
                onSaved();
                setMode(null);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {mode === "delete" ? (
              <p className="modal-description">
                Ushbu yozuv ro‘yxatdan o‘chiriladi. Bog‘langan yozuvlar bo‘lsa,
                avval ularni boshqa yozuvga biriktiring. Amal audit tarixida
                saqlanadi. Davom etasizmi?
              </p>
            ) : (
              fields.map((f) => (
                <label className="field" key={f.key}>
                  {f.label}
                  {f.options ? (
                    <select
                      name={f.key}
                      defaultValue={String(
                        values[f.key] ??
                          (values.car as { id?: string } | undefined)?.id ??
                          "",
                      )}
                    >
                      {resource === "daily-reports" && (
                        <option value="">Avtomobilsiz</option>
                      )}
                      {f.options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  ) : f.type ? (
                    <input
                      name={f.key}
                      type={f.type}
                      min={f.type === "number" ? 0 : undefined}
                      step={f.key === "expenseAmount" ? "0.01" : "1"}
                      defaultValue={String(values[f.key] ?? "").slice(
                        0,
                        f.type === "date" ? 10 : undefined,
                      )}
                      required
                    />
                  ) : (
                    <textarea
                      name={f.key}
                      rows={2}
                      defaultValue={String(values[f.key] ?? "")}
                    />
                  )}
                </label>
              ))
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setMode(null)}
              >
                Bekor qilish
              </button>
              <button className="primary" disabled={busy}>
                {busy
                  ? "Saqlanmoqda…"
                  : mode === "delete"
                    ? "O‘chirish"
                    : "Saqlash"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
