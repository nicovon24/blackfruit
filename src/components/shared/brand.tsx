export function Brand({ className = "" }: { className?: string }) {
  return <span className={`font-serif text-[32px] font-bold tracking-[-1.5px] ${className}`}>BlackFruit<span className="text-[var(--citrus)]">.</span></span>;
}
