"use client";
import { useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { api, Field, Modal } from "./ui";
import type { Attendance } from "./types";
export function AttendanceEdit({
  entry,
  onClose,
  onSaved,
}: {
  entry: Attendance;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const local = (value: string, zone: string) =>
    formatInTimeZone(value, zone, "yyyy-MM-dd'T'HH:mm");
  return (
    <Modal title="Davomatni tahrirlash" onClose={onClose}>
      <form
        method="post"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const data = new FormData(e.currentTarget);
          const parse = (key: string) => {
            const value = String(data.get(key));
            return {
              date: value.slice(0, 10),
              time: value.slice(11, 16),
              timezone: String(data.get(`${key}Timezone`)),
              lateReason: String(data.get("lateReason") || ""),
              earlyLeaveReason: String(data.get("earlyLeaveReason") || ""),
            };
          };
          try {
            await api(`attendance/${entry.id}`, "PATCH", {
              checkIn: parse("checkIn"),
              checkOut: data.get("checkOut") ? parse("checkOut") : null,
              reason: data.get("reason"),
            });
            onSaved();
            onClose();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <Field
            label="Kelish sanasi va vaqti"
            name="checkIn"
            type="datetime-local"
            value={local(entry.checkIn, entry.checkInTimezone)}
            required
          />
          <Field
            label="Kelish vaqt zonasi"
            name="checkInTimezone"
            value={entry.checkInTimezone}
            required
          />
          <Field
            label="Ketish sanasi va vaqti (ixtiyoriy)"
            name="checkOut"
            type="datetime-local"
            value={
              entry.checkOut
                ? local(
                    entry.checkOut,
                    entry.checkOutTimezone || entry.checkInTimezone,
                  )
                : ""
            }
          />
          <Field
            label="Ketish vaqt zonasi"
            name="checkOutTimezone"
            value={entry.checkOutTimezone || entry.checkInTimezone}
            required
          />
          <Field
            label="Kechikish sababi (10:00 dan keyin majburiy)"
            name="lateReason"
            value={entry.lateReason || ""}
          />
          <Field
            label="Erta ketish sababi (22:00 dan oldin majburiy)"
            name="earlyLeaveReason"
            value={entry.earlyLeaveReason || ""}
          />
          <Field label="Tahrirlash sababi" name="reason" required />
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          Saqlash
        </button>
      </form>
    </Modal>
  );
}
