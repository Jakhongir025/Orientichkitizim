"use client";
import { RecordActions } from "./record-actions";
import { Search } from "lucide-react";
import { useState } from "react";
import type { Rental } from "./types";
import { api, carName, Empty, formatDate, Table } from "./ui";
export function RentalSearch({
  initialPlate = "",
  canManage = false,
}: {
  initialPlate?: string;
  canManage?: boolean;
}) {
  const [rows, setRows] = useState<Rental[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="panel rental-panel">
      <div className="rental-intro">
        <span className="stat-icon blue">
          <Search size={23} />
        </span>
        <div>
          <h2>Ijara tarixini tekshirish</h2>
          <p>
            Davlat raqamini kiriting va davrni tanlang. Jarimaning aniq vaqtini
            ham kiritishingiz mumkin.
          </p>
        </div>
      </div>
      <form
        method="post"
        className="rental-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const form = new FormData(e.currentTarget);
          const params = new URLSearchParams({
            plate: String(form.get("plate")),
            months: String(form.get("months")),
          });
          if (form.get("fineAt"))
            params.set("fineAt", `${form.get("fineAt")}:00+05:00`);
          try {
            setRows(await api<Rental[]>(`rentals/search?${params}`));
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Davlat raqami
          <input
            name="plate"
            placeholder="01 A 038 AA"
            defaultValue={initialPlate}
            required
            minLength={3}
          />
        </label>
        <label className="field">
          Vaqt oralig‘i
          <select name="months">
            <option value="1">Oxirgi 1 oy</option>
            <option value="3">Oxirgi 3 oy</option>
            <option value="6">Oxirgi 6 oy</option>
            <option value="12">Oxirgi 1 yil</option>
          </select>
        </label>
        <label className="field">
          Jarima vaqti · Toshkent (ixtiyoriy)
          <input name="fineAt" type="datetime-local" />
        </label>
        <button className="primary" disabled={busy}>
          <Search size={18} />
          {busy ? "Qidirilmoqda…" : "Qidirish"}
        </button>
      </form>
      {error && <div className="error">{error}</div>}
      {rows === null ? (
        <Empty text="Qidiruv uchun avtomobil raqamini kiriting" />
      ) : !rows.length ? (
        <Empty text="Bu vaqt oralig‘ida ijara topilmadi" />
      ) : (
        <>
          <div className="panel-heading">
            <h3>{rows.length} ta ijara topildi</h3>
            {rows.length > 1 && (
              <small>
                Jarima bo‘yicha mos kelgan barcha yozuvlarni tekshiring.
              </small>
            )}
          </div>
          <Table
            heads={[
              "MIJOZ",
              "AVTOMOBIL",
              "IJARA ORALIG‘I",
              "SHARTNOMA",
              "TOPSHIRGAN / QABUL QILGAN",
              "TAFSILOT",
              ...(canManage ? ["AMALLAR"] : []),
            ]}
          >
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <b>{r.customerName}</b>
                  <small>{r.phone}</small>
                </td>
                <td>
                  {carName(r.car)}
                  <small>{r.car.plateNumber}</small>
                </td>
                <td>
                  {formatDate(r.rentalStart, true)}
                  <small>{formatDate(r.rentalEnd, true)}</small>
                </td>
                <td>{r.contractNumber}</td>
                <td>
                  {r.issuedBy || "—"}
                  <small>{r.acceptedBy || "—"}</small>
                </td>
                <td>
                  {"passport" in r ? (
                    <details>
                      <summary>Passport va izoh</summary>
                      <p>{r.passport || "—"}</p>
                      <p>{r.passportDetails}</p>
                      <p>{r.notes}</p>
                    </details>
                  ) : (
                    "Cheklangan"
                  )}
                </td>
                {canManage && (
                  <td>
                    <RecordActions
                      resource="rentals"
                      record={r}
                      onSaved={() => setRows(null)}
                    />
                  </td>
                )}
              </tr>
            ))}
          </Table>
        </>
      )}
    </section>
  );
}
