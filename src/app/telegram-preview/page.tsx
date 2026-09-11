"use client";
import { RentCarBrand } from "@/components/rentcar-brand";
import { useState } from "react";
export default function TelegramPreview() {
  const [tab, setTab] = useState("Bugun");
  const [hint, setHint] = useState("");
  return (
    <main
      style={{
        background: "#eaf0f5",
        minHeight: "100vh",
        padding: "32px 20px",
        color: "#172638",
      }}
    >
      <div style={{ maxWidth: 1050, margin: "auto" }}>
        <small style={{ letterSpacing: 3, color: "#14806d", fontWeight: 700 }}>
          RENTCAR · TELEGRAM
        </small>
        <h1 style={{ fontSize: 32, margin: "12px 0" }}>
          Xodim kabineti va hisobotlar
        </h1>
        <p>
          Interaktiv ko‘rinish namunasi. Bu sahifa bazaga ma’lumot yozmaydi va
          Telegramga xabar yubormaydi.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 36,
            alignItems: "flex-start",
            marginTop: 28,
          }}
        >
          <div
            style={{
              width: 390,
              maxWidth: "100%",
              border: "8px solid #162536",
              borderRadius: 34,
              overflow: "hidden",
              boxShadow: "0 16px 50px #14243822",
              background: "white",
            }}
          >
            <div
              style={{
                background: "#f5f7fa",
                padding: "18px 16px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>✕</span>
              <b>OrientRentCar</b>
              <span>⋯</span>
            </div>
            <section
              className="mini-app"
              style={{ minHeight: 580, padding: 16 }}
            >
              <div className="mini-brandbar">
                <div className="brand">
                  <RentCarBrand />
                </div>
              </div>
              <header className="mini-header">
                <div>
                  <small>XODIM KABINETI · NAMUNA</small>
                  <h1>Namuna xodim</h1>
                </div>
              </header>
              <nav className="mini-tabs">
                {["Bugun", "Avtomobillar", "Xabarlar", "Hisobotlar"].map(
                  (name) => (
                    <button
                      key={name}
                      aria-pressed={tab === name}
                      onClick={() => {
                        setTab(name);
                        setHint("");
                      }}
                    >
                      {name}
                    </button>
                  ),
                )}
              </nav>
              {tab === "Bugun" && (
                <>
                  <section className="mini-card">
                    <h2>Bugungi davomat</h2>
                    <p>08.09.2026 · Asia/Tashkent</p>
                    <div className="mini-times">
                      <div>
                        <small>Keldim</small>
                        <strong>09:54</strong>
                      </div>
                      <div>
                        <small>Ketdim</small>
                        <strong>—</strong>
                      </div>
                    </div>
                    <div className="mini-actions">
                      <button className="primary" disabled>
                        Ishga keldim ✓
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          setHint(
                            "Ketish vaqtini qo‘lda yozasiz. Masalan, 21:30 bo‘lsa sabab majburiy; 22:00 yoki keyin sabab talab qilinmaydi.",
                          )
                        }
                      >
                        Ishdan ketdim
                      </button>
                    </div>
                    <p>Qurilma vaqt zonasi hisobga olinadi.</p>
                  </section>
                  <div className="mini-actions">
                    <button
                      className="primary"
                      onClick={() =>
                        setHint(
                          "Kunlik hisobot: avtomobilni tanlab, bajarilgan ishni yozasiz. Xodim nomi hisobingizdan olinadi.",
                        )
                      }
                    >
                      ＋ Kunlik hisobot
                    </button>
                    <button
                      className="secondary"
                      onClick={() =>
                        setHint(
                          "Servis qaydi: avtomobil, xizmat turi, sana, kilometr va izoh kiritiladi.",
                        )
                      }
                    >
                      ＋ Servis ishi
                    </button>
                  </div>
                  <section className="mini-card">
                    <h2>Bugungi hisobotlarim</h2>
                    <p>Avtomobil mijozga topshirish uchun tayyorlandi.</p>
                    <small>01 A 038 AA</small>
                  </section>
                </>
              )}
              {tab === "Avtomobillar" && (
                <section className="mini-card">
                  <h2>Mercedes-Benz GLS 450</h2>
                  <b>01 A 038 AA</b>
                  <p>Raqam yoki model bo‘yicha qidirish mumkin.</p>
                </section>
              )}
              {tab === "Xabarlar" && (
                <section className="mini-card">
                  <h2>Bildirishnomalar</h2>
                  <p>Avtomobil hisoboti tayyor.</p>
                  <span className="badge sent">Yuborildi</span>
                </section>
              )}
              {tab === "Hisobotlar" && (
                <section className="mini-card">
                  <h2>Avtomobil hisoboti</h2>
                  <label className="field">
                    Avtomobil
                    <select>
                      <option>01 A 038 AA · GLS 450</option>
                    </select>
                  </label>
                  <label className="field">
                    Davr
                    <select>
                      <option>Kunlik</option>
                      <option>Haftalik</option>
                      <option>Oylik</option>
                    </select>
                  </label>
                  <label className="field">
                    Format
                    <select>
                      <option>Matn</option>
                      <option>PDF fayl</option>
                    </select>
                  </label>
                  <div className="mini-actions">
                    <button
                      className="primary"
                      onClick={() =>
                        setHint(
                          "Namuna: 2 ta servis ishi, 1 ta kunlik qayd va 1 ta holat o‘zgarishi.",
                        )
                      }
                    >
                      Tezkor ko‘rish
                    </button>
                    <button
                      className="secondary"
                      onClick={() =>
                        setHint(
                          "Ishchi Mini Appda hisobot sizning bog‘langan Telegram hisobingizga yuborish navbatiga qo‘shiladi.",
                        )
                      }
                    >
                      Telegramga yuborish
                    </button>
                  </div>
                  <p>Oy yakuni: keyingi oyning 1-kuni avtomatik.</p>
                </section>
              )}
              {hint && (
                <p className="mini-card" role="status">
                  {hint}
                </p>
              )}
            </section>
          </div>
          <section
            style={{
              flex: "1 1 340px",
              background: "#dce8de",
              padding: 24,
              borderRadius: 24,
              maxWidth: 520,
            }}
          >
            <h2 style={{ fontSize: 21, marginBottom: 18 }}>
              Telegramga keladigan xabar
            </h2>
            <article
              style={{
                background: "white",
                borderRadius: "18px 18px 18px 4px",
                padding: 22,
                lineHeight: 1.9,
                boxShadow: "0 3px 10px #15253810",
              }}
            >
              <small style={{ color: "#14806d", fontWeight: 700 }}>
                OrientRentCar Bot · NAMUNA
              </small>
              <h3>AVTOMOBIL HISOBOTI</h3>
              <b>
                Mercedes-Benz GLS 450
                <br />
                01 A 038 AA
              </b>
              <p>Davr: 08.09.2026 (kunlik)</p>
              <p>
                Servis ishlari: 2<br />
                Kunlik qaydlar: 1<br />
                Holat o‘zgarishlari: 1
              </p>
              <hr />
              <p>
                <b>SERVIS TARIXI</b>
                <br />
                Moy almashtirish · 52 800 km
                <br />
                Mobil 1 5W-30
                <br />
                Avtomobil yuvildi · 52 810 km
              </p>
              <p>
                <b>KUNLIK ISHLAR</b>
                <br />
                Avtomobil mijozga topshirish uchun tayyorlandi.
              </p>
              <p>
                <b>HOLAT</b>
                <br />
                15:30 · Servisda → Bo‘sh
              </p>
              <small>Bajaruvchi: Namuna xodim</small>
            </article>
            <article
              style={{
                background: "white",
                borderRadius: 16,
                padding: 18,
                marginTop: 16,
              }}
            >
              <b>📄 rentcar-01A038AA.pdf</b>
              <p>PDF tanlansa, shu hisobot fayl sifatida keladi.</p>
            </article>
            <p style={{ marginTop: 18 }}>
              Tezkor hisobotni ko‘rish yoki yuborish oylik avtomatik hisobotni
              bekor qilmaydi.
            </p>
            <a href="/mini">Ishchi Mini App kirish sahifasi →</a>
          </section>
        </div>
      </div>
    </main>
  );
}
