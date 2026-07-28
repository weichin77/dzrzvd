import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = { title: "關於我們" };

export default function AboutPage() {
  return (
    <main className="inner-page">
      <section className="page-hero about-hero">
        <div className="container page-hero-content">
          <p className="eyebrow light">OUR STORY / 品牌故事</p>
          <h1>讓機能，<br />走進每個人的生活。</h1>
        </div>
      </section>
      <section className="story container">
        <div className="story-lead">
          <p className="eyebrow">DZRZVD SINCE 2013</p>
          <h2>我們致力於推廣<br />機能性服飾</h2>
        </div>
        <div className="story-body">
          <p className="quote">「有沒有可能把我的設計普及，讓一般人們也買得起？」</p>
          <p>2013 年，一位德國服裝設計師與她的代工廠的一段對話，開啟了 DZRZVD 多采多姿的旅程。</p>
          <p>杜戛地 DZRZVD 結合歐式品牌的機能服飾設計理念與品質概念，以及中國大量化生產的能力，讓原本高價的機能性服飾平價化，使更多人都能享受到高機能的戶外服飾。</p>
        </div>
      </section>
      <section className="story-images container">
        <div className="story-image">
          <Image src="/images/about-design.jpg" alt="戶外機能服飾設計靈感" fill sizes="(max-width: 800px) 100vw, 60vw" />
        </div>
        <div className="story-image">
          <Image src="/images/about-craft.jpg" alt="機能服飾製作細節" fill sizes="(max-width: 800px) 100vw, 40vw" />
        </div>
      </section>
      <section className="values container">
        <div><span>01</span><h3>設計</h3><p>以歐式機能美學，回應真實生活需求。</p></div>
        <div><span>02</span><h3>品質</h3><p>重視每一層材質，讓舒適陪你走得更遠。</p></div>
        <div><span>03</span><h3>普及</h3><p>讓可靠機能成為每個人都能擁有的日常。</p></div>
      </section>
      <section className="inner-cta">
        <p className="eyebrow light">COME VISIT US</p>
        <h2>親手感受，真正的舒適。</h2>
        <Link className="button button-outline" href="/location">查看門市地點</Link>
      </section>
    </main>
  );
}
