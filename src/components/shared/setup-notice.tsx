import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="mb-4 text-sm font-semibold tracking-[0.16em] text-[#A94410] uppercase">
        BlackFruit · Córdoba
      </p>
      <h1 className="mb-5 font-serif text-5xl tracking-tight sm:text-6xl">
        El panel está en preparación.
      </h1>
      <p className="max-w-2xl text-lg leading-8 text-[#63594C]">
        Esta es la base técnica de la aplicación privada. El acceso, las ventas y
        la importación se incorporarán sobre servicios de negocio y PostgreSQL.
      </p>
      <div className="mt-10 rounded-xl border border-[#E7DFD0] bg-white p-6">
        <h2 className="text-lg font-semibold">Primeras piezas</h2>
        <ul className="mt-4 grid gap-3 text-sm text-[#63594C] sm:grid-cols-2">
          <li>Next.js App Router y TypeScript</li>
          <li>Componentes reutilizables</li>
          <li>Módulos de negocio separados</li>
          <li>Neon como PostgreSQL inicial</li>
        </ul>
      </div>
      <p className="mt-6 text-sm text-[#746B5E]">
        Esta página no muestra ventas ni datos de clientes hasta contar con
        autenticación y autorización en servidor.
      </p>
      <Button asChild className="mt-8 h-11 self-start px-6">
        <Link href="/login">Ingresar al panel</Link>
      </Button>
    </main>
  );
}
