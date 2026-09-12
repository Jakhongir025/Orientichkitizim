"use client";
import { useState } from "react";
import type { Car, Document, Lookups, User } from "./types";
import { api, carName, Field, fullName, Modal, Select, today } from "./ui";
type Kind = "car" | "employee" | "service" | "document" | "report";
export function RecordForm({
  kind,
  lookups,
  initial,
  defaultCarId,
  onClose,
  onSaved,
}: {
  kind: Kind;
  lookups: Lookups;
  initial?: Car | Document | User;
  defaultCarId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [imageData, setImageData] = useState<string | null>(
    (initial as Car | undefined)?.imageData || null,
  );
  const [imageBusy, setImageBusy] = useState(false);
  const [loginValue, setLoginValue] = useState("");
  const [loginEdited, setLoginEdited] = useState(false);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const car = kind === "car" ? (initial as Car | undefined) : undefined,
    employee = kind === "employee" ? (initial as User | undefined) : undefined,
    document =
      kind === "document" ? (initial as Document | undefined) : undefined;
  const opts = (items: { id: string; name: string }[]) =>
    items.map((x) => ({ value: x.id, label: x.name }));
  const titles = {
    car: "Avtomobil",
    employee: "Xodim",
    service: "Servis qaydi",
    document: "Hujjat",
    report: "Kunlik hisobot",
  };
  return (
    <Modal
      title={`${titles[kind]} ${initial ? "tahrirlash" : "qo‘shish"}`}
      onClose={onClose}
    >
      <form
        method="post"
        onChange={(e) => {
          if (
            kind !== "employee" ||
            initial ||
            loginEdited ||
            (e.target as HTMLInputElement).name === "login"
          )
            return;
          const form = e.currentTarget;
          const values = new FormData(form);
          const name = `${values.get("firstName") || ""}.${values.get("lastName") || ""}`;
          setLoginValue(
            name
              .toLowerCase()
              .normalize("NFKD")
              .replace(/[‘’ʻʼ'`]/g, "")
              .replace(/[^a-z0-9._-]/g, "")
              .replace(/^\.+|\.+$/g, "")
              .slice(0, 60),
          );
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setBusy(true);
          const form = new FormData(e.currentTarget);
          const data: Record<string, unknown> = Object.fromEntries(form);
          if (kind === "employee" && initial) {
            if (!data.password) delete data.password;
            if (!data.roleId) delete data.roleId;
            delete data.login;
            data.active = data.active === "true";
            for (const key of [
              "telegramChatId",
              "telegramUserId",
              "telegramUsername",
            ])
              if (data[key] === "") data[key] = null;
          }
          if (kind === "car") data.imageData = imageData;
          if (kind === "document")
            data.recipientIds = form.getAll("recipientIds");
          const paths = {
            car: "cars",
            employee: "employees",
            service: "services",
            document: "documents",
            report: "daily-reports",
          };
          try {
            await api(
              `${paths[kind]}${initial ? `/${initial.id}` : ""}`,
              initial ? "PATCH" : "POST",
              data,
            );
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
          {kind === "car" && (
            <>
              <label className="field">
                Avtomobil rasmi yoki brend logotipi
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setImageBusy(true);
                    setError("");
                    try {
                      if (file.size > 5 * 1024 * 1024)
                        throw new Error("Rasm 5 MBdan oshmasin");
                      const bitmap = await createImageBitmap(file);
                      const canvas = window.document.createElement("canvas");
                      const scale = Math.min(
                        1,
                        600 / Math.max(bitmap.width, bitmap.height),
                      );
                      canvas.width = Math.round(bitmap.width * scale);
                      canvas.height = Math.round(bitmap.height * scale);
                      const ctx = canvas.getContext("2d")!;
                      ctx.fillStyle = "white";
                      ctx.fillRect(0, 0, canvas.width, canvas.height);
                      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                      bitmap.close();
                      let encoded = canvas.toDataURL("image/jpeg", 0.8);
                      for (
                        let quality = 0.7;
                        encoded.length > 55000 && quality >= 0.1;
                        quality -= 0.1
                      )
                        encoded = canvas.toDataURL("image/jpeg", quality);
                      if (encoded.length > 55000)
                        throw new Error("Kichikroq rasm tanlang");
                      setImageData(encoded);
                    } catch (err) {
                      setError((err as Error).message || "Rasm ochilmadi");
                    } finally {
                      setImageBusy(false);
                    }
                  }}
                />
                {imageData && (
                  <>
                    <img
                      src={imageData}
                      alt="Tanlangan rasm"
                      style={{ height: 120, objectFit: "contain" }}
                    />
                    <button type="button" onClick={() => setImageData(null)}>
                      Rasmni olib tashlash
                    </button>
                  </>
                )}
              </label>
              <Field label="Brend" name="brand" value={car?.brand} required />
              <Field label="Model" name="model" value={car?.model} required />
              <Field
                label="Davlat raqami"
                name="plateNumber"
                value={car?.plateNumber}
                required
              />
              <Field
                label="Yil"
                name="year"
                type="number"
                value={car?.year || new Date().getFullYear()}
                required
              />
              <Field label="Rang" name="color" value={car?.color} required />
              <Field label="Dvigatel" name="engine" value={car?.engine || ""} />
              <Field
                label="Yurgan masofa (km)"
                name="mileage"
                type="number"
                value={car?.mileage || 0}
                required
              />
              <Field
                label="Joylashuv"
                name="location"
                value={car?.location || "Toshkent ofisi"}
              />
              <Field label="VIN" name="vin" value={car?.vin || ""} />
              <Field
                label="Yuridik raqam"
                name="legalPlateNumber"
                value={car?.legalPlateNumber || ""}
              />
              <Select
                label="Holat"
                name="status"
                value={car?.status || "AVAILABLE"}
                options={[
                  "AVAILABLE",
                  "RENTED",
                  "SERVICE",
                  "RESERVED",
                  "UNAVAILABLE",
                  "WITH_OWNER",
                  "CAR_WASH",
                ].map((value) => ({
                  value,
                  label: (
                    {
                      AVAILABLE: "Bo‘sh",
                      RENTED: "Ijarada",
                      SERVICE: "Servisda",
                      RESERVED: "Band qilingan",
                      UNAVAILABLE: "Mavjud emas",
                      WITH_OWNER: "Egasida",
                      CAR_WASH: "Avtomobil yuvish joyida",
                    } as Record<string, string>
                  )[value],
                }))}
              />
              <Field label="Izoh" name="notes" value={car?.notes || ""} />
            </>
          )}
          {kind === "employee" && (
            <>
              <Field
                label="Ism"
                name="firstName"
                value={employee?.profile?.firstName}
                required
              />
              <Field
                label="Familiya"
                name="lastName"
                value={employee?.profile?.lastName}
                required
              />
              <Field
                label="Telefon"
                name="phone"
                value={employee?.profile?.phone}
              />
              <Field
                label="Lavozim (masalan: Direktor, Community Manager)"
                name="position"
                value={employee?.profile?.position}
              />
              {!initial && (
                <label className="field">
                  Login (o‘zingiz o‘zgartirishingiz mumkin)
                  <input
                    name="login"
                    value={loginValue}
                    onChange={(e) => {
                      setLoginEdited(true);
                      setLoginValue(e.target.value);
                    }}
                    required
                    minLength={3}
                    maxLength={60}
                    pattern="[a-zA-Z0-9._\-]+"
                    autoComplete="off"
                  />
                  <small>
                    Masalan: jaxongir.abdurazoqov. Lotin harflari, raqam, nuqta,
                    chiziq va pastki chiziq.
                  </small>
                </label>
              )}
              <Field
                label={
                  initial
                    ? "Yangi parol (ixtiyoriy, 12+ belgi)"
                    : "Parol (12+ belgi)"
                }
                name="password"
                type="password"
                required={!initial}
              />
              <Select
                label="Tizimdagi ruxsat roli"
                name="roleId"
                options={opts(lookups.roles)}
                value={employee?.role.id}
                optional={Boolean(initial)}
              />
              <Select
                label="Ofis"
                name="officeId"
                options={opts(lookups.offices)}
                value={employee?.profile?.officeId}
              />
              {initial && (
                <>
                  <Select
                    label="Holat"
                    name="active"
                    value={String(employee?.active)}
                    options={[
                      { value: "true", label: "Faol" },
                      { value: "false", label: "Nofaol" },
                    ]}
                  />
                  <Field
                    label="Ruxsat berilgan Telegram foydalanuvchi ID raqami (raqam)"
                    name="telegramUserId"
                    value={employee?.profile?.telegramUserId || ""}
                  />
                  <Field
                    label="Telegram chat ID raqami"
                    name="telegramChatId"
                    value={employee?.profile?.telegramChatId || ""}
                  />
                  <Field
                    label="Telegram username"
                    name="telegramUsername"
                    value={employee?.profile?.telegramUsername || ""}
                  />
                </>
              )}
            </>
          )}
          {["service", "document", "report"].includes(kind) && (
            <Select
              label="Avtomobil"
              name="carId"
              value={document?.carId || defaultCarId}
              options={lookups.cars.map((c) => ({
                value: c.id,
                label: `${c.plateNumber} · ${carName(c)}`,
              }))}
              optional={kind === "report"}
            />
          )}
          {kind === "report" && (
            <fieldset className="expense-fields span-2">
              <legend>Xarajat</legend>
              <label className="field">
                Sarflangan summa (so‘m)
                <input
                  name="expenseAmount"
                  type="number"
                  min="0"
                  max="999999999999.99"
                  step="0.01"
                  defaultValue="0"
                  required
                />
              </label>
              <label className="field">
                Xarajat izohi
                <textarea
                  name="expenseNotes"
                  maxLength={2000}
                  rows={2}
                  placeholder="Masalan: moy va filtr uchun 650 000 so‘m"
                />
              </label>
            </fieldset>
          )}
          {kind === "service" && (
            <>
              <Select
                label="Servis turi"
                name="serviceTypeId"
                options={opts(lookups.serviceTypes)}
              />
              <Field
                label="Sana"
                name="date"
                type="date"
                value={today()}
                required
              />
              <Field
                label="Yurgan masofa (km)"
                name="mileage"
                type="number"
                required
              />
              <Field label="Izoh" name="notes" />
            </>
          )}
          {kind === "document" && (
            <>
              <Select
                label="Hujjat turi"
                name="documentTypeId"
                options={opts(lookups.documentTypes)}
                value={document?.documentTypeId}
              />
              <Field
                label="Hujjat raqami"
                name="number"
                value={document?.number}
                required
              />
              <Field
                label="Kompaniya"
                name="company"
                value={document?.company || ""}
              />
              <Field
                label="Boshlanish sanasi"
                name="startDate"
                type="date"
                value={document?.startDate.slice(0, 10) || today()}
                required
              />
              <Field
                label="Tugash sanasi"
                name="expiryDate"
                type="date"
                value={document?.expiryDate.slice(0, 10)}
                required
              />
              <Select
                label="Mas’ul xodim"
                name="responsibleId"
                options={lookups.employees.map((u) => ({
                  value: u.id,
                  label: fullName(u),
                }))}
                value={document?.responsibleId}
              />
              <Field
                label="Hujjat havolasi (HTTPS, ixtiyoriy)"
                name="fileUrl"
                type="url"
                value={document?.fileUrl || ""}
              />
              <label className="field span-2">
                Qo‘shimcha bildirishnoma oluvchilar
                <select
                  name="recipientIds"
                  multiple
                  defaultValue={
                    document?.recipients.map((r) => r.employeeId) || []
                  }
                >
                  {lookups.employees.map((u) => (
                    <option key={u.id} value={u.id}>
                      {fullName(u)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {kind === "report" && (
            <>
              <Field
                label="Sana"
                name="date"
                type="date"
                value={today()}
                required
              />
              <label className="field span-2">
                Bajarilgan ish
                <textarea
                  name="description"
                  rows={5}
                  required
                  minLength={3}
                  maxLength={5000}
                />
              </label>
            </>
          )}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="primary" disabled={busy || imageBusy}>
            {busy ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
