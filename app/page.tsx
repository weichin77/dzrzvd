import Link from "next/link";
import Image from "next/image";

const products = [
  {
    eyebrow: "WINTER / 高山保暖",
    title: "冬日寒寒，\n高山冷冷",
    features: "防風・防水・保暖",
    body: "杜戛地 DZRZVD 衝鋒衣結合高品質的防風防水外套，與鎖住溫度的刷毛衣，讓您不管是在寒流來襲時，或是上山過夜，都有足以保溫的裝備。",
    image: "/images/winter.jpg",
    href: "https://shopee.tw/shop/16630682/search?page=0&shopCollection=15182027",
    link: "選購保暖商品",
  },
  {
    eyebrow: "SUMMER / 日常防曬",
    title: "夏日炎炎，\n紫外線滿滿",
    features: "防曬・涼感・抗 UV",
    body: "杜戛地 DZRZVD 防曬衣的抗 UV 機能強大，讓您不再怕陽光紫外線；超強彈力讓您活動自如，是春夏常備用品。",
    image: "/images/summer.jpg",
    href: "https://shopee.tw/shop/16630682/search?page=0&shopCollection=140765395",
    link: "選購防曬商品",
  },
  {
    eyebrow: "ACTIVE / 自在伸展",
    title: "運動量大，\n依然自在",
    features: "吸濕・排汗・彈力",
    body: "運動時溼答答？衣服吸汗後活動卡卡？杜戛地 DZRZVD 提供具超強彈力、方便好活動的機能性服飾。",
    image: "/images/performance.jpg",
    href: "https://shopee.tw/shop/16630682/search?page=0&shopCollection=140790474",
    link: "選購排汗商品",
  },
];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-image" aria-hidden="true" />
        <div className="hero-shade" />
        <div className="hero-content container">
          <p className="eyebrow light">EST. 2013 · TAIPEI</p>
          <h1>為每一段旅程，<br />穿上自在。</h1>
          <p className="hero-copy">
            杜戛地 DZRZVD，戶外服飾的專家。讓高機能不再高不可攀，
            陪你從城市日常走向山野。
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#collections">探索機能系列</a>
            <Link className="text-link light-link" href="/about">認識 DZRZVD <span>↗</span></Link>
          </div>
        </div>
        <div className="hero-index">DZRZVD / 01</div>
      </section>

      <section className="intro container">
        <p className="eyebrow">FUNCTION MEETS FREEDOM</p>
        <div className="intro-grid">
          <h2>全天候的舒適，<br />從機能開始。</h2>
          <p>防風、防水、保暖、防曬、排汗。好的服裝不該限制你的目的地，而是讓你更自在地抵達。</p>
        </div>
      </section>

      <section id="collections" className="collections container">
        {products.map((product, index) => (
          <article className={`product-row ${index % 2 ? "reverse" : ""}`} key={product.eyebrow}>
            <div className="product-image-wrap">
              <Image
                src={product.image}
                alt=""
                fill
                sizes="(max-width: 800px) 100vw, 55vw"
                className="product-image"
              />
              <span className="product-number">0{index + 1}</span>
            </div>
            <div className="product-copy">
              <p className="eyebrow">{product.eyebrow}</p>
              <h2>{product.title.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</h2>
              <p className="features">{product.features}</p>
              <p className="body-copy">{product.body}</p>
              <a className="text-link" href={product.href} target="_blank" rel="noreferrer">
                {product.link} <span>↗</span>
              </a>
            </div>
          </article>
        ))}
      </section>

      <section className="manifesto">
        <div className="container">
          <p className="eyebrow light">OUR PROMISE</p>
          <p className="manifesto-text">WE MAKE YOU FEEL<br />COMFORTABLE<br /><em>AT ALL TIMES.</em></p>
          <Link className="button button-outline" href="/location">來店體驗</Link>
        </div>
      </section>
    </main>
  );
}
