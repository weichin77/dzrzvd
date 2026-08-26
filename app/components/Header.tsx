"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "首頁" },
  { href: "/products", label: "商品" },
  { href: "/about", label: "關於我們" },
  { href: "/location", label: "地點" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="header-inner container">
        <Link className="brand" href="/" onClick={() => setOpen(false)}>
          DZRZVD<span>杜戛地</span>
        </Link>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="切換導覽選單">
          <span /><span />
        </button>
        <nav className={open ? "nav open" : "nav"} aria-label="主要導覽">
          {links.map((link) => (
            <Link className={pathname === link.href ? "active" : ""} href={link.href} key={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
