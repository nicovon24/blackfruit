"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesCombined, Factory, FlaskConical, LayoutDashboard, Package, ShoppingBag, Trash2, Users } from "lucide-react";

const groups = [
  { title: "Comercial", items: [
    { href: "/ventas", label: "Ventas", icon: ShoppingBag },
    { href: "/clientes", label: "Clientes", icon: Users },
    { href: "/muestras", label: "Muestras", icon: FlaskConical },
  ] },
  { title: "Producción", items: [
    { href: "/produccion", label: "Dashboard", icon: ChartNoAxesCombined },
    { href: "/produccion/maquina", label: "Máquinas", icon: Factory },
  ] },
  { title: "Catálogo", items: [
    { href: "/productos", label: "Productos", icon: Package },
  ] },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/produccion") return pathname === href;
  if (href === "/produccion/maquina") return pathname.startsWith("/produccion/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation() {
  const pathname = usePathname();
  const link = ({ href, label, icon: Icon }: { href: string; label: string; icon: typeof LayoutDashboard }) =>
    <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined} className="nav-link"><Icon size={18} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span></Link>;

  return <nav aria-label="Navegación principal" className="app-navigation">
    <div className="nav-home">{link({ href: "/dashboard", label: "Inicio", icon: LayoutDashboard })}</div>
    {groups.map((group) => <div className="nav-group" key={group.title}>
      <p className="nav-caption">{group.title}</p>
      {group.items.map(link)}
    </div>)}
    <div className="nav-utility">{link({ href: "/papelera", label: "Papelera", icon: Trash2 })}</div>
  </nav>;
}
