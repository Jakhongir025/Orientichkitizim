"use client";
import { useEffect, useState } from "react";
import { api, today, formatDate } from "./ui";
type DayOff = {
  id: string;
  userId: string;
  date: string;
  notes: string | null;
  user: {
    profile: { firstName: string; lastName: string; phone: string } | null;
  };
};
export function DaysOff({
  revision = 0,
  onSaved = () => {},
}: {
  revision?: number;
  onSaved?: () => void;
}) {
  const [date, setDate] = useState(() => {
    const d = new Date(`${today()}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState(""),
    [rows, setRows] = useState<DayOff[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    api<DayOff[]>("days-off")
      .then((v) => {
        if (active) setRows(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [revision, version]);
  async function save(id?: string) {
    setBusy(true);
    setError("");
    try {
      await api(
        id ? `days-off/${id}` : "days-off",
        id ? "DELETE" : "POST",
        id ? undefined : { date, notes },
      );
      setVersion((v) => v + 1);
      setNotes("");
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel settings-card">
      <h2>Dam olish kunlarim</h2>
      <p>
        Sanani tanlang. Belgilangan kunda kelish-ketishni qayd etish shart emas.
        Sana Toshkent taqvimi bo‘yicha olinadi.
      </p>
      {rows.some((r) => r.date.slice(0, 10) === today()) && (
        <p className="success">
          Bugun dam olish kuningiz. Kelish-ketish qaydi talab qilinmaydi.
        </p>
      )}
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className="field">
          Dam olish sanasi
          <input
            type="date"
            min={today()}
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="field">
          Izoh (ixtiyoriy)
          <input
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <button className="primary" disabled={busy}>
          Dam olish kunim
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {rows.length === 0 ? (
        <p>Dam olish kuni hali belgilanmagan.</p>
      ) : (
        rows.map((r) => (
          <div className="fleet-status-row" key={r.id}>
            <div>
              <b>{formatDate(r.date)} — Dam olish kuni</b>
              {r.notes && <p>{r.notes}</p>}
            </div>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => {
                if (confirm("Ushbu dam olish kunini bekor qilasizmi?"))
                  void save(r.id);
              }}
            >
              Bekor qilish
            </button>
          </div>
        ))
      )}
    </section>
  );
}
