import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({ page, previous, next, label = "Páginas del listado" }: { page: number; previous?: string; next?: string; label?: string }) {
  if (!previous && !next) return null;
  return <nav className="list-pagination" aria-label={label}><span className="text-sm text-muted-foreground">Página {page}</span><div className="flex gap-2">
    {previous && <Button asChild variant="outline" size="sm"><Link href={previous}><ArrowLeft aria-hidden="true" />Anterior</Link></Button>}
    {next && <Button asChild variant="outline" size="sm"><Link href={next}>Siguiente<ArrowRight aria-hidden="true" /></Link></Button>}
  </div></nav>;
}
