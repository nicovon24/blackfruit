import { Inbox, SearchX } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ title, description, filtered = false, action }: { title: string; description?: string; filtered?: boolean; action?: ReactNode }) {
  const Icon = filtered ? SearchX : Inbox;
  return <div className={`empty-state compact-empty ${!description && !action ? "empty-inline" : ""}`}><Icon size={26} strokeWidth={1.5} aria-hidden="true" /><h3>{title}</h3>{description && <p>{description}</p>}{action && <div className="empty-action">{action}</div>}</div>;
}
