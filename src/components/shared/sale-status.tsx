export function SaleStatus({ status }: { status: string }) {
  return <span className={`status-pill ${status === "confirmed" ? "status-confirmed" : "status-void"}`}><span aria-hidden="true" />{status === "confirmed" ? "Confirmada" : "Anulada"}</span>;
}
