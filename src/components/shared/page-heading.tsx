import type { ReactNode } from "react";

export function PageHeading({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="flex flex-wrap gap-2">{actions}</div>}</div>;
}
