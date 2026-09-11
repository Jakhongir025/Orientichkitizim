"use client";
import { RecordActions } from "./record-actions";
import { CarReports } from "./car-reports";
import { Activity, ArrowRight, CarFront } from "lucide-react";
import { useEffect, useState } from "react";
import { RentalSearch } from "./rental-search";
import { RecordForm } from "./record-form";
import type { Car, Document, Lookups } from "./types";
import {
  api,
  Badge,
  carName,
  formatDate,
  fullName,
  Loading,
  Modal,
  Table,
} from "./ui";
export function CarProfile({
  carId,
  can,
  edit,
  revision,
  lookups,
  refresh,
}: {
  carId: string;
  can: (p: string) => boolean;
  edit: (c: Car) => void;
  revision: number;
  lookups: Lookups;
  refresh: () => void;
}) {
  const [documentForm, setDocumentForm] = useState<Document | "new" | null>(
    null,
  );
  const [serviceForm, setServiceForm] = useState(false);
  const [car, setCar] = useState<Car | null>(null),
    [tab, setTab] = useState("Overview"),
    [error, setError] = useState(""),
    [archiving, setArchiving] = useState(false);
  useEffect(() => {
    api<Car>(`cars/${carId}`)
      .then(setCar)
      .catch((e) => setError(e.message));
  }, [carId, revision]);
  if (!car) return error ? <div className="error">{error}</div> : <Loading />;
  const tabs = [
    "Overview",
    "Hisobotlar",
    ...(can("documents.read") ? ["Documents"] : []),
    "Service History",
    "Rental History",
    ...(can("audit.read") ? ["Activity Log"] : []),
  ];
  return (
    <>
      <section className="profile-banner">
        <div className="profile-car-icon">
          {car.imageData ? (
            <img
              src={car.imageData}
              alt={`${car.brand} ${car.model}`}
              style={{ width: 180, height: 120, objectFit: "contain" }}
            />
          ) : (
            <CarFront size={65} strokeWidth={1} />
          )}
        </div>
        <div>
          <h2>{carName(car)}</h2>
          <div className="profile-badges">
            <span className="plate">{car.plateNumber}</span>
            <Badge value={car.status} />
          </div>
        </div>
        <div className="profile-actions">
          {can("*") && (
            <button className="secondary" onClick={() => edit(car)}>
              Tahrirlash
            </button>
          )}
          {can("*") && (
            <button
              className="text-button danger-text"
              onClick={() => setArchiving(true)}
            >
              Arxivlash
            </button>
          )}
        </div>
      </section>
      <section className="panel">
        <div className="tabs" role="tablist">
          {tabs.map((t) => (
            <button
              role="tab"
              aria-selected={t === tab}
              key={t}
              className={t === tab ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "Hisobotlar" && <CarReports carId={car.id} />}
        {tab === "Overview" && (
          <div className="detail-grid">
            {Object.entries({
              Brend: car.brand,
              Model: car.model,
              Yil: car.year,
              "Davlat raqami": car.plateNumber,
              "Yuridik raqam": car.legalPlateNumber || "—",
              VIN: car.vin || "—",
              Rang: car.color,
              Dvigatel: car.engine,
              Masofa: `${car.mileage.toLocaleString()} km`,
              Joylashuv: car.location,
              Izoh: car.notes || "—",
            }).map(([key, value]) => (
              <div key={key}>
                <small>{key}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        )}
        {tab === "Documents" && (
          <>
            {can("documents.write") && (
              <div className="panel-heading">
                <button
                  className="primary"
                  onClick={() => setDocumentForm("new")}
                >
                  Hujjat qo‘shish
                </button>
              </div>
            )}
            <Table
              heads={[
                "HUJJAT",
                "RAQAM",
                "BOSHLANISH",
                "TUGASH",
                "MAS’UL",
                "AMALLAR",
              ]}
            >
              {car.documents?.map((d) => (
                <tr key={d.id}>
                  <td>{d.documentType.name}</td>
                  <td>{d.number}</td>
                  <td>{formatDate(d.startDate)}</td>
                  <td>{formatDate(d.expiryDate)}</td>
                  <td>{fullName(d.responsible)}</td>
                  <td>
                    {can("*") && (
                      <button
                        className="secondary"
                        onClick={() => setDocumentForm(d)}
                      >
                        Tahrirlash
                      </button>
                    )}
                    {can("*") && (
                      <RecordActions
                        resource="documents"
                        record={d}
                        deleteOnly
                        onSaved={refresh}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </>
        )}
        {tab === "Service History" && (
          <>
            {can("services.write") && (
              <div className="panel-heading">
                <button
                  className="primary"
                  onClick={() => setServiceForm(true)}
                >
                  Servis qaydi qo‘shish
                </button>
              </div>
            )}
            <Table
              heads={[
                "SERVIS",
                "SANA",
                "MASOFA",
                "XODIM",
                "IZOH",
                ...(can("*") ? ["AMALLAR"] : []),
              ]}
            >
              {car.services?.map((s) => (
                <tr key={s.id}>
                  <td>{s.serviceType.name}</td>
                  <td>{formatDate(s.date)}</td>
                  <td>{s.mileage.toLocaleString()} km</td>
                  <td>{fullName(s.employee)}</td>
                  <td>{s.notes}</td>
                  {can("*") && (
                    <td>
                      <RecordActions
                        resource="services"
                        record={{ ...s, carId: car.id }}
                        lookup={lookups}
                        onSaved={refresh}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </Table>
          </>
        )}
        {tab === "Rental History" && (
          <RentalSearch initialPlate={car.plateNumber} canManage={can("*")} />
        )}
        {tab === "Activity Log" && (
          <>
            {car.activity?.map((a) => (
              <div className="activity-row" key={a.id}>
                <Activity size={18} />
                <div>
                  <b>
                    {a.action} · {fullName(a.user)}
                  </b>
                  <small>{formatDate(a.timestamp, true)}</small>
                  <details>
                    <summary>Tafsilot</summary>
                    <pre>
                      {JSON.stringify(
                        { old: a.oldValue, new: a.newValue },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </div>
              </div>
            ))}
            <div className="panel-heading">
              <h3>Status tarixi</h3>
            </div>
            {car.statusHistory?.map((h) => (
              <div className="activity-row" key={h.id}>
                <Badge value={h.fromStatus} />
                <ArrowRight size={16} />
                <Badge value={h.toStatus} />
                <small>{formatDate(h.createdAt, true)}</small>
              </div>
            ))}
          </>
        )}
      </section>
      {documentForm && (
        <RecordForm
          kind="document"
          lookups={lookups}
          defaultCarId={car.id}
          initial={documentForm === "new" ? undefined : documentForm}
          onSaved={refresh}
          onClose={() => setDocumentForm(null)}
        />
      )}
      {serviceForm && (
        <RecordForm
          kind="service"
          lookups={lookups}
          defaultCarId={car.id}
          onSaved={refresh}
          onClose={() => setServiceForm(false)}
        />
      )}
      {archiving && (
        <Modal
          title="Avtomobilni arxivlash"
          onClose={() => setArchiving(false)}
        >
          <p className="modal-description">
            Avtomobil faol ro‘yxatdan olib tashlanadi, servis va ijara tarixi
            saqlanadi.
          </p>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <button
              className="primary"
              onClick={async () => {
                try {
                  await api(`cars/${car.id}`, "DELETE");
                  window.location.href = "/cars";
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Arxivlash
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
