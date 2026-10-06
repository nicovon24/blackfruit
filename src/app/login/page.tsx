import type { Metadata } from "next";
import { ArrowUpRight, Leaf, LockKeyhole } from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Ingresar | BlackFruit",
};

export default function LoginPage() {
  return <main className="login-page">
    <section className="login-story" aria-label="BlackFruit, gestión del negocio">
      <div className="flex items-center justify-between"><Brand className="text-[38px]" /><span className="login-origin">Córdoba, Argentina</span></div>
      <div className="login-story-content"><span className="login-eyebrow"><Leaf size={15} aria-hidden="true" />Simple. Natural. Nuestro.</span><h2>Todo lo que crece,<br />empieza con<br /><span>algo simple.</span></h2><p>Un lugar para tus ventas,<br />y para lo que viene después.</p></div>
      <div className="citrus-art" aria-hidden="true"><svg viewBox="0 0 400 400" fill="none"><circle cx="200" cy="200" r="176" /><circle cx="200" cy="200" r="160" /><circle cx="200" cy="200" r="24" />{Array.from({ length: 10 }, (_, index) => <path key={index} d="M200 170 C180 134 175 89 187 49 Q200 45 213 49 C225 89 220 134 200 170Z" transform={`rotate(${index * 36} 200 200)`} />)}</svg></div>
      <div className="login-story-footer"><span>Frutas deshidratadas.<br />Ideas en movimiento.</span><ArrowUpRight size={26} strokeWidth={1.2} aria-hidden="true" /></div>
    </section>
    <section className="login-access" aria-labelledby="login-title">
      <div className="login-mobile-brand"><Brand /><p>Gestión del negocio</p></div>
      <div className="login-form-container"><div className="login-lock"><LockKeyhole size={22} strokeWidth={1.5} aria-hidden="true" /></div><p className="eyebrow mb-3">Tu espacio de trabajo</p><h1 id="login-title">Qué bueno verte<br />por acá.</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">Ingresá para seguir con el día a día de BlackFruit.</p><LoginForm /><div className="login-help"><LockKeyhole size={14} aria-hidden="true" /><p>Acceso privado para el equipo.<br />Si necesitás ayuda para entrar, contactá al administrador.</p></div></div>
      <p className="login-bottom">Hecho para acompañar el crecimiento de BlackFruit.</p>
    </section>
  </main>;
}
