"use client";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CarFront,
  Check,
  Clock3,
  Plus,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AttendanceForm } from "./attendance-form";
import type { DashboardData, User } from "./types";
import {
  api,
  Badge,
  carName,
  clock,
  Empty,
  formatDate,
  fullName,
  Loading,
  Table,
} from "./ui";
export function Overview({
  user,
  revision,
  refresh,
  report,
}: {
  user: User;
  revision: number;
  refresh: () => void;
  report: () => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null),
    [error, setError] = useState(""),
    [checkModal, setCheckModal] = useState<"in" | "out" | null>(null);
  useEffect(() => {
    api<DashboardData>(
      `dashboard?timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`,
    )
      .then(setData)
      .catch((e) => setError(e.message));
  }, [revision]);
  if (!data) return error ? <div className="error">{error}</div> : <Loading />;
  const manager =
    user.role.permissions.includes("*") ||
    user.role.permissions.includes("attendance.read");
  const stats = [
    {
      label: "Jami avtomobillar",
      value: data.totalCars,
      icon: CarFront,
      note: "Avtoparkdagi avtomobillar",
      color: "blue",
    },
    {
      label: "Faol xodimlar",
      value: data.activeEmployees,
      icon: Users,
      note: "Jamoa a’zolari",
      color: "purple",
    },
    {
      label: "Bugun ishga kelgan",
      value: data.attendance.length,
      icon: Clock3,
      note: `${data.attendance.filter((a) => a.status === "LATE").length} nafar kechikkan`,
      color: "green",
    },
    {
      label: "Servisdagi avtomobillar",
      value: data.carsInService,
      icon: Wrench,
      note: "Texnik xizmat jarayonida",
      color: "orange",
    },
  ];
  return (
    <>
      {manager && (
        <div className="stats-grid">
          {stats.map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-top">
                <span>{s.label}</span>
                <span className={`stat-icon ${s.color}`}>
                  <s.icon size={20} />
                </span>
              </div>
              <strong>{s.value.toString().padStart(2, "0")}</strong>
              <small>{s.note}</small>
            </div>
          ))}
        </div>
      )}
      <div className="checkin-strip">
        <div className="checkin-icon">
          <Clock3 />
        </div>
        <div>
          <h3>
            {data.myAttendance
              ? "Bugungi ish kuningiz"
              : "Xayrli kun, " + user.profile?.firstName}
          </h3>
          <p>
            {data.myAttendance
              ? `Kelish: ${clock(data.myAttendance.checkIn, data.myAttendance.checkInTimezone)} · Ketish: ${clock(data.myAttendance.checkOut, data.myAttendance.checkOutTimezone || data.myAttendance.checkInTimezone)}`
              : "Ish kunini boshlash uchun kelgan vaqtingizni qayd eting."}
          </p>
        </div>
        <div className="checkin-actions">
          <button className="primary" onClick={() => setCheckModal("in")}>
            <ArrowDownLeft size={17} />
            Ishga keldim
          </button>
          <button className="secondary" onClick={() => setCheckModal("out")}>
            <ArrowUpRight size={17} />
            Ishdan ketdim
          </button>

          <button className="secondary" onClick={report}>
            <Plus size={17} />
            Hisobot yozish
          </button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {manager && (
        <div className="summary-strip">
          <div>
            <span className="indicator orange" />
            <strong>{data.expiring.length}</strong> Hujjat muddati
            yaqinlashmoqda
            <Link href="/documents">
              Ko‘rish <ArrowRight size={15} />
            </Link>
          </div>
          <div>
            <span className="indicator red" />
            <strong>{data.expired}</strong> Hujjat muddati tugagan
          </div>
          <div>
            <Activity size={18} />
            <strong>{data.activities}</strong> Bugungi amallar
          </div>
        </div>
      )}
      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                {manager ? "Yaqinlashayotgan muddatlar" : "Bugungi ishlarim"}
              </h2>
              <p>
                {manager
                  ? "Keyingi 7 kun ichida yangilash kerak"
                  : "Bajarilgan ishlaringiz"}
              </p>
            </div>
            <Link href={manager ? "/documents" : "/daily-reports"}>
              Barchasi <ArrowRight size={15} />
            </Link>
          </div>
          {manager ? (
            <Table heads={["AVTOMOBIL", "HUJJAT", "MUDDAT", "HOLAT"]}>
              {data.expiring.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link className="row-car" href={`/cars/${d.car.id}`}>
                      <span className="mini-car">
                        <CarFront size={20} />
                      </span>
                      <span>
                        <b>{carName(d.car)}</b>
                        <small>{d.car.plateNumber}</small>
                      </span>
                    </Link>
                  </td>
                  <td>{d.documentType.name}</td>
                  <td>{formatDate(d.expiryDate)}</td>
                  <td>
                    <span
                      className={`due ${d.remainingDays! <= 1 ? "urgent" : ""}`}
                    >
                      {d.remainingDays} kun qoldi
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            data.tasks.map((t) => (
              <div className="activity-row" key={t.id}>
                <span className="activity-icon">
                  <Check size={16} />
                </span>
                <div>
                  <b>{t.description}</b>
                  <small>
                    Xarajat:{" "}
                    {Number(t.expenseAmount || 0).toLocaleString("uz-UZ")} so‘m{" "}
                    {t.expenseNotes ? `· ${t.expenseNotes}` : ""}
                  </small>
                  <small>{carName(t.car)}</small>
                </div>
              </div>
            ))
          )}
          {(manager ? !data.expiring.length : !data.tasks.length) && (
            <Empty
              text={
                manager
                  ? "Yaqin 7 kunda tugaydigan hujjatlar yo‘q"
                  : "Bugungi hisobotni kiriting"
              }
            />
          )}
        </section>
        <section className="panel attendance-panel">
          <div className="panel-heading">
            <div>
              <h2>Bugungi davomat</h2>
              <p>{data.attendance.length} nafar qayd etilgan</p>
            </div>
            <Link href="/attendance">
              <ArrowRight size={18} />
            </Link>
          </div>
          {data.attendance.slice(0, 5).map((a) => (
            <div className="attendance-row" key={a.id}>
              <div className="avatar small">
                {a.user.profile?.firstName[0]}
                {a.user.profile?.lastName[0]}
              </div>
              <div>
                <b>{fullName(a.user)}</b>
                <small>{a.user.profile?.position}</small>
              </div>
              <div className="attendance-time">
                <b>{clock(a.checkIn, a.checkInTimezone)}</b>
                <span
                  className={a.status === "LATE" ? "text-orange" : "text-green"}
                >
                  {a.status === "LATE" ? "Kechikdi" : "O‘z vaqtida"}
                </span>
              </div>
            </div>
          ))}
          {!data.attendance.length && <Empty />}
          <div className="panel-bottom">
            <span className="live-dot" /> Xodim kiritgan mahalliy vaqt va
            timezone
          </div>
        </section>
      </div>
      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>So‘nggi bajarilgan ishlar</h2>
              <p>Avtomobillar servis tarixidan</p>
            </div>
            <Link href="/services">
              Barchasi <ArrowRight size={15} />
            </Link>
          </div>
          {data.services.map((s) => (
            <div className="activity-row" key={s.id}>
              <span className="activity-icon">
                <Wrench size={17} />
              </span>
              <div>
                <b>{s.serviceType.name}</b>
                <small>
                  {carName(s.car)} <span>·</span> {s.car.plateNumber}{" "}
                  <span>·</span> {fullName(s.employee)}
                </small>
              </div>
              <time>{formatDate(s.date)}</time>
            </div>
          ))}
          {!data.services.length && <Empty />}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Mening bildirishnomalarim</h2>
              <p>Diqqat talab qiladigan holatlar</p>
            </div>
            <Bell size={19} />
          </div>
          {data.notifications.slice(0, 4).map((n) => (
            <div className="activity-row" key={n.id}>
              <span className="activity-icon amber">
                <Bell size={17} />
              </span>
              <div>
                <b>{n.title}</b>
                <small>{formatDate(n.createdAt, true)}</small>
              </div>
            </div>
          ))}
          {!data.notifications.length && (
            <Empty text="Yangi bildirishnoma yo‘q" />
          )}
        </section>
      </div>
      {checkModal && (
        <AttendanceForm
          mode={checkModal}
          onClose={() => setCheckModal(null)}
          onSaved={() => {
            setError("");
            refresh();
          }}
        />
      )}
    </>
  );
}
