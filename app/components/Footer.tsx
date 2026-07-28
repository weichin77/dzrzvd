import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Link className="brand footer-brand" href="/">DZRZVD<span>杜戛地</span></Link>
          <p>WE MAKE YOU FEEL COMFORTABLE AT ALL TIMES.</p>
        </div>
        <div className="footer-links">
          <Link href="/">首頁</Link>
          <Link href="/about">關於我們</Link>
          <Link href="/location">地點</Link>
          <a href="https://shopee.tw/shop/16630682" target="_blank" rel="noreferrer">蝦皮商店 ↗</a>
        </div>
        <div className="footer-address">
          <p>台北市大同區南京西路 325 號一樓</p>
          <a href="tel:+886225558670">02-2555-8670</a>
        </div>
      </div>
      <div className="container footer-bottom">© {new Date().getFullYear()} DZRZVD. ALL RIGHTS RESERVED.</div>
    </footer>
  );
}
