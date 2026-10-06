import type { ReactNode } from "react";
import Link from "next/link";
import { Home, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { AppNavigation } from "./app-navigation";

export function AppShell({ children, user, section }: { children: ReactNode; user: { name: string }; section: string }) {
  const initials = user.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <div className="app-shell">
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <aside className="app-sidebar">
      <Link href="/dashboard" className="sidebar-brand" aria-label="BlackFruit, inicio"><Brand /><span>Panel de gestión</span></Link>
      <AppNavigation />
      <div className="sidebar-actions"><SignOutButton /></div>
      <div className="sidebar-footer"><span className="avatar">{initials}</span><div><p className="truncate text-sm font-medium">{user.name}</p><p className="mt-1 text-xs text-[#c1b29c]">BlackFruit · Córdoba</p></div></div>
    </aside>
    <div className="app-body">
      <header className="app-topbar"><div className="flex min-w-0 items-center gap-3 text-xs sm:text-sm"><Home size={15} className="text-muted-foreground" aria-hidden="true" /><span className="hidden text-muted-foreground sm:inline">BlackFruit</span><span className="hidden text-border sm:inline">/</span><span>{section}</span></div><span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><ShieldCheck size={14} aria-hidden="true" />Panel privado</span></header>
      <main id="contenido" tabIndex={-1} className="app-content">{children}</main>
      <footer className="app-footer">BlackFruit · Gestión del negocio<span>Córdoba, Argentina</span></footer>
    </div>
  </div>;
}
