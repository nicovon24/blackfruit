"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Trash2 } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ventas", label: "Ventas", icon: ShoppingBag },
  { href: "/ventas/papelera", label: "Papelera", icon: Trash2 },
];

export function AppNavigation() {
  const pathname = usePathname();
  return <nav aria-label="Navegación principal" className="app-navigation">
    <p className="nav-caption">Tu negocio</p>
    {items.map(({ href, label, icon: Icon }) => {
      const active = href === "/ventas" ? pathname.startsWith(href) && !pathname.startsWith("/ventas/papelera") : pathname === href;
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} className="nav-link"><Icon size={18} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span></Link>;
    })}
  </nav>;
}
