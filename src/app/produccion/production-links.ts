export function dashboardReturn(value?: string) {
  if (!value) return "/produccion";
  try {
    const url = new URL(value, "https://blackfruit.local");
    if (url.origin !== "https://blackfruit.local" || url.pathname !== "/produccion") return "/produccion";
    const allowed = new URLSearchParams();
    for (const key of ["month", "machine", "page", "drafts", "first", "second"]) {
      const entry = url.searchParams.get(key);
      if (entry) allowed.set(key, entry);
    }
    return allowed.size ? `/produccion?${allowed}` : "/produccion";
  } catch { return "/produccion"; }
}

export function cycleHref(id: string, back: string) {
  return `/produccion/${id}?${new URLSearchParams({ back })}`;
}
