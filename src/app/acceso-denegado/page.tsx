import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <p className="font-serif text-3xl">BlackFruit</p>
      <h1 className="mt-8 text-2xl font-semibold">Acceso denegado</h1>
      <p className="mt-2 text-muted-foreground">
        Tu cuenta no tiene permiso para entrar a este espacio.
      </p>
      <Link href="/login" className="mt-6 text-primary underline underline-offset-4">
        Volver al ingreso
      </Link>
    </main>
  );
}
