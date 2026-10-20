import Link from "next/link";

export function ProductionNavigation({ active, dashboardHref = "/produccion" }: { active: "dashboard" | "machine"; dashboardHref?: string }) {
  return <nav aria-label="Secciones de producción" className="mb-6 flex w-fit max-w-full gap-1 rounded-xl border border-border bg-surface p-1 shadow-sm">
    <Link href="/produccion/maquina" aria-current={active === "machine" ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${active === "machine" ? "bg-success text-surface" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>Máquina</Link>
    <Link href={dashboardHref} aria-current={active === "dashboard" ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${active === "dashboard" ? "bg-success text-surface" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>Dashboard</Link>
  </nav>;
}
