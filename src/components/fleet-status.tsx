"use client";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { useEffect, useState } from "react";
import { api, Badge, Modal, carName } from "./ui";
import type { Car } from "./types";
const choices = [
  ["AVAILABLE", "Bo‘sh"],
  ["RENTED", "Band"],
  ["WITH_OWNER", "Egasida"],
  ["CAR_WASH", "Avtomobil yuvish joyida"],
  ["SERVICE", "Servisda"],
] as const;
export function FleetStatus({
  canManage,
  telegramDelivery = false,
  onSaved,
}: {
  canManage: boolean;
  telegramDelivery?: boolean;
  onSaved: () => void;
}) {
  const [message, setMessage] = useState("");
  const [cars, setCars] = useState<Car[]>([]),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [revision, setRevision] = useState(0);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Car | null>(null),
    [until, setUntil] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      api<Car[]>(
        `cars?q=${encodeURIComponent(query)}&limit=30&page=${page + 1}`,
      )
        .then((rows) => {
          if (active) setCars(rows);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, page, revision]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") setRevision((v) => v + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, []);
  async function downloadPdf() {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({
        q: query,
        timezone: "Asia/Tashkent",
      });
      if (telegramDelivery) {
        await api("car-status/send-pdf", "POST", {
          ...Object.fromEntries(params),
          requestId: crypto.randomUUID(),
        });
        setMessage(
          "PDF bot chatiga yuborish navbatiga qo‘shildi. Botda /start bosilgan va worker ishlayotgan bo‘lishi kerak.",
        );
        return;
      }
      const file = await api<{ pdf: string; filename: string }>(
        `car-status/pdf?${params}`,
      );
      const url = URL.createObjectURL(
        new Blob([Uint8Array.from(atob(file.pdf), (c) => c.charCodeAt(0))], {
          type: "application/pdf",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(car: Car, status: string) {
    setBusy(true);
    setError("");
    try {
      await api(`car-status/${car.id}`, "PATCH", {
        status,
        updatedAt: car.updatedAt,
        occupiedUntil:
          status === "RENTED" && until
            ? fromZonedTime(until, "Asia/Tashkent").toISOString()
            : null,
      });
      setSelected(null);
      setRevision((v) => v + 1);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-card">
      <h2>Avtomobillarning joriy holati</h2>
      <button
        className="button primary"
        disabled={busy}
        onClick={() => void downloadPdf()}
      >
        {telegramDelivery ? "PDFni botga yuborish" : "PDF yuklab olish"}
      </button>
      <p>PDFga qidiruvga mos barcha sahifalardagi avtomobillar kiritiladi.</p>
      <label className="field">
        Model yoki raqam bo‘yicha qidirish
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
      </label>
      <button
        className="button secondary"
        onClick={() => {
          setError("");
          setRevision((v) => v + 1);
        }}
      >
        Yangilash
      </button>
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p>Yuklanmoqda…</p>
      ) : cars.length === 0 ? (
        <p>Avtomobil topilmadi</p>
      ) : (
        cars.map((car) => (
          <article className="fleet-status-row" key={car.id}>
            <div>
              <strong>{carName(car)}</strong>
              <p>{car.plateNumber}</p>
              <Badge value={car.status} />
              {car.occupiedUntil && (
                <p>
                  Band:{" "}
                  {formatInTimeZone(
                    car.occupiedUntil,
                    "Asia/Tashkent",
                    "dd.MM.yyyy HH:mm",
                  )}{" "}
                  gacha
                </p>
              )}
            </div>
            {canManage && (
              <div className="fleet-status-buttons">
                {choices.map(([status, label]) => (
                  <button
                    key={status}
                    className={`button ${car.status === status ? "primary" : "secondary"}`}
                    aria-pressed={car.status === status}
                    disabled={busy}
                    onClick={() => {
                      if (status === "RENTED") {
                        setSelected(car);
                        setUntil("");
                        setError("");
                      } else void save(car, status);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </article>
        ))
      )}
      <div className="fleet-status-buttons">
        <button
          className="button secondary"
          disabled={page === 0 || loading}
          onClick={() => setPage((v) => v - 1)}
        >
          Oldingi
        </button>
        <span>{page + 1}-sahifa</span>
        <button
          className="button secondary"
          disabled={cars.length < 30 || loading}
          onClick={() => setPage((v) => v + 1)}
        >
          Keyingi
        </button>
      </div>
      {selected && (
        <Modal
          title={`${selected.plateNumber} — Band`}
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save(selected, "RENTED");
            }}
          >
            <label className="field">
              Qachongacha band?
              <input
                type="datetime-local"
                required
                value={until}
                onChange={(e) => setUntil(e.target.value)}
              />
            </label>
            <p>
              Vaqt Toshkent vaqti bo‘yicha. Muddat tugaganda holat avtomatik
              Bo‘shga o‘zgaradi.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" disabled={busy}>
              Saqlash
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
