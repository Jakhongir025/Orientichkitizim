"use client";
import { RentCarBrand } from "./rentcar-brand";
import { LayoutDashboard, CarFront, Bell, FileText } from "lucide-react";
import { CarReports } from "./car-reports";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { AttendanceForm } from "./attendance-form";
import { RecordForm } from "./record-form";
import { api, Badge, clock, fullName, Loading, setMiniSession } from "./ui";
import type { DashboardData, Lookups, User } from "./types";

type TelegramApp = {
  initData: string;
  ready(): void;
  expand(): void;
  close(): void;
  BackButton: {
    show(): void;
    hide(): void;
    onClick(fn: () => void): void;
    offClick(fn: () => void): void;
  };
};
declare global {
  interface Window {
    Telegram?: { WebApp: TelegramApp };
  }
}
export function MiniApp({ nonce }: { nonce?: string }) {
  const started = useRef(false);
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Telegram yuklanmoqda…");
  const [modal, setModal] = useState<
    "in" | "out" | "report" | "service" | null
  >(null);
  const [tab, setTab] = useState<
    "today" | "cars" | "notifications" | "reports"
  >("today");
  const [reportCarId, setReportCarId] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const refresh = async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setData(
        await api<DashboardData>(
          `dashboard?timezone=${encodeURIComponent(timezone)}`,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };
  async function start() {
    if (started.current) return;
    started.current = true;
    const telegram = window.Telegram?.WebApp;
    telegram?.ready();
    telegram?.expand();
    if (!telegram?.initData) {
      setStatus(
        "Mini Appni Telegram botidagi «RentCarni ochish» tugmasidan oching.",
      );
      return;
    }
    try {
      setStatus("Hisob tasdiqlanmoqda…");
      const session = await api<{ token: string }>("auth/telegram", "POST", {
        initData: telegram.initData,
      });
      setMiniSession(session.token);
      const [me, options] = await Promise.all([
        api<User>("me"),
        api<Lookups>("lookup"),
      ]);
      setUser(me);
      setLookups(options);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    const back = () => {
      setModal(null);
      setTab("today");
    };
    const button = window.Telegram?.WebApp.BackButton;
    if (modal || tab !== "today") button?.show();
    else button?.hide();
    button?.onClick(back);
    return () => button?.offClick(back);
  }, [modal, tab, user]);
  const saved = () => {
    setMessage("Ma’lumot saqlandi");
    void refresh();
  };
  const can = (permission: string) =>
    user?.role.permissions.some((p) => p === "*" || p === permission);
  return (
    <main className="mini-app">
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        nonce={nonce}
        strategy="afterInteractive"
        onReady={() => {
          void start();
        }}
        onError={() =>
          setError(
            "Telegram kutubxonasi yuklanmadi. Internetni tekshirib, Mini Appni qayta oching.",
          )
        }
      />
      <div className="mini-brandbar">
        <div className="brand">
          <RentCarBrand />
        </div>
        <span>XODIM KABINETI</span>
      </div>
      <header className="mini-header">
        <div>
          <small>RENTCAR · XODIM KABINETI</small>
          <h1>{user ? fullName(user) : "OrientRentCar"}</h1>
        </div>
        {user && (
          <button
            className="secondary"
            onClick={async () => {
              try {
                await api("auth/logout", "POST");
                setMiniSession(null);
                setUser(null);
                setData(null);
                setStatus(
                  "Tizimdan chiqdingiz. Qayta kirish uchun Mini Appni yopib oching.",
                );
                window.Telegram?.WebApp.close();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Chiqish
          </button>
        )}
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!user ? (
        <section className="mini-card">
          <h2>Telegram orqali kirish</h2>
          <p>{status}</p>
          <p>
            Hisob hali ulanmagan bo‘lsa, web profilingizdan Telegramni ulang.
          </p>
          <a href="/login" target="_blank" rel="noopener noreferrer">
            Web panelga kirish ↗
          </a>
        </section>
      ) : (
        <>
          <nav className="mini-tabs" aria-label="Mini App bo‘limlari">
            {(
              [
                ["today", "Bugun"],
                ["cars", "Avtomobillar"],
                ["notifications", "Xabarlar"],
                ["reports", "Hisobotlar"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                aria-pressed={tab === key}
                onClick={() => setTab(key)}
              >
                {key === "today" ? (
                  <LayoutDashboard size={18} />
                ) : key === "cars" ? (
                  <CarFront size={18} />
                ) : key === "notifications" ? (
                  <Bell size={18} />
                ) : (
                  <FileText size={18} />
                )}{" "}
                {label}
              </button>
            ))}
          </nav>
          {message && <p role="status">✓ {message}</p>}
          {!data ? (
            <Loading />
          ) : (
            <>
              {tab === "today" && (
                <>
                  <section className="mini-card">
                    <h2>Bugungi davomat</h2>
                    <p>
                      {data.date} ·{" "}
                      {Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </p>
                    <div className="mini-times">
                      <div>
                        <small>Keldim</small>
                        <strong>
                          {data.myAttendance
                            ? clock(
                                data.myAttendance.checkIn,
                                data.myAttendance.checkInTimezone,
                              )
                            : "—"}
                        </strong>
                      </div>
                      <div>
                        <small>Ketdim</small>
                        <strong>
                          {data.myAttendance?.checkOut
                            ? clock(
                                data.myAttendance.checkOut,
                                data.myAttendance.checkOutTimezone ||
                                  data.myAttendance.checkInTimezone,
                              )
                            : "—"}
                        </strong>
                      </div>
                    </div>
                    {can("attendance.write") && (
                      <div className="mini-actions">
                        <button
                          className="primary"
                          onClick={() => setModal("in")}
                        >
                          Ishga keldim
                        </button>
                        <button
                          className="secondary"
                          onClick={() => setModal("out")}
                        >
                          Ishdan ketdim
                        </button>
                      </div>
                    )}
                    <p>
                      Vaqtni qo‘lda kiriting. 10:00 dan keyin kelganda sabab
                      yoziladi.
                    </p>
                  </section>
                  <div className="mini-actions">
                    {can("reports.write") && (
                      <button
                        className="primary"
                        onClick={() => setModal("report")}
                      >
                        ＋ Kunlik hisobot
                      </button>
                    )}
                    {can("services.write") && (
                      <button
                        className="secondary"
                        onClick={() => setModal("service")}
                      >
                        ＋ Servis ishi
                      </button>
                    )}
                  </div>
                  <section className="mini-card">
                    <h2>Bugungi hisobotlarim</h2>
                    {data.tasks
                      .filter((t) => t.employee.id === user.id)
                      .map((t) => (
                        <article key={t.id}>
                          <p>{t.description}</p>
                          <small>
                            Xarajat:{" "}
                            {Number(t.expenseAmount || 0).toLocaleString(
                              "uz-UZ",
                            )}{" "}
                            so‘m {t.expenseNotes ? `· ${t.expenseNotes}` : ""}
                          </small>
                          <small>{t.car?.plateNumber}</small>
                        </article>
                      ))}
                    {!data.tasks.some((t) => t.employee.id === user.id) && (
                      <p>Hali hisobot kiritilmagan.</p>
                    )}
                  </section>
                  <section className="mini-card">
                    <h2>Oxirgi servis ishlarim</h2>
                    {data.services
                      .filter((s) => s.employee.id === user.id)
                      .map((s) => (
                        <article key={s.id}>
                          <b>{s.serviceType.name}</b>
                          <p>
                            {s.car.plateNumber} · {s.mileage} km
                          </p>
                          <small>{s.notes}</small>
                        </article>
                      ))}
                  </section>
                </>
              )}
              {tab === "cars" && (
                <>
                  <label className="field">
                    Avtomobil qidirish
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Raqam yoki model"
                    />
                  </label>
                  {lookups?.cars
                    .filter((c) =>
                      `${c.plateNumber}${c.brand}${c.model}`
                        .replace(/\s/g, "")
                        .toLowerCase()
                        .includes(search.replace(/\s/g, "").toLowerCase()),
                    )
                    .map((c) => (
                      <section key={c.id} className="mini-card">
                        <h2>
                          {c.brand} {c.model}
                        </h2>
                        <b>{c.plateNumber}</b>
                      </section>
                    ))}
                </>
              )}
              {tab === "reports" && (
                <>
                  <label className="field">
                    Avtomobil raqami
                    <select
                      value={reportCarId}
                      onChange={(e) => setReportCarId(e.target.value)}
                    >
                      <option value="">Avtomobilni tanlang</option>
                      {lookups?.cars.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.plateNumber} · {c.brand} {c.model}
                        </option>
                      ))}
                    </select>
                  </label>
                  {reportCarId && <CarReports carId={reportCarId} />}
                </>
              )}
              {tab === "notifications" && (
                <section className="mini-card">
                  <h2>Xabarlar</h2>
                  {data.notifications.length === 0 && <p>Yangi xabar yo‘q.</p>}
                  {data.notifications.map((n) => (
                    <article key={n.id}>
                      <h3>{n.title}</h3>
                      <p style={{ whiteSpace: "pre-wrap" }}>{n.message}</p>
                      <Badge value={n.status} />
                    </article>
                  ))}
                </section>
              )}
              <button
                className="secondary"
                onClick={() => {
                  setError("");
                  void refresh();
                }}
              >
                Yangilash
              </button>
            </>
          )}
        </>
      )}
      {(modal === "in" || modal === "out") && (
        <AttendanceForm
          mode={modal}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
      {(modal === "report" || modal === "service") && lookups && (
        <RecordForm
          kind={modal}
          lookups={lookups}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
    </main>
  );
}
