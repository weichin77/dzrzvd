import type { Metadata } from "next";

export const metadata: Metadata = { title: "地點" };

export default function LocationPage() {
  return (
    <main className="inner-page location-page">
      <section className="location-intro container">
        <div>
          <p className="eyebrow">TAIPEI STORE / 實體門市</p>
          <h1>我們在此，<br />歡迎您。</h1>
        </div>
        <p className="location-lead">從布料的觸感到穿上的活動度，歡迎親自來店體驗 DZRZVD 的機能與舒適。</p>
      </section>
      <section className="location-grid container">
        <div className="map-wrap">
          <iframe
            title="DZRZVD 杜戛地門市地圖"
            src="https://www.google.com/maps?q=25.0537551,121.5077826&z=16&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div className="store-card">
          <p className="eyebrow">DZRZVD 杜戛地</p>
          <h2>台北門市</h2>
          <dl>
            <div><dt>地址</dt><dd>台北市大同區<br />南京西路 325 號一樓</dd></div>
            <div><dt>電話</dt><dd><a href="tel:+886225558670">02-2555-8670</a></dd></div>
          </dl>
          <a className="button button-dark" href="https://www.google.com/maps/dir/?api=1&destination=25.0537551,121.5077826" target="_blank" rel="noreferrer">開啟 Google 地圖 ↗</a>
        </div>
      </section>
      <section className="visit-note container">
        <p className="eyebrow">BEFORE YOU GO</p>
        <p>如需確認營業時間或商品庫存，建議出發前先來電詢問。</p>
      </section>
    </main>
  );
}
