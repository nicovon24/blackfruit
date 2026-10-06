"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button type="button" variant="ghost" className="sidebar-sign-out" onClick={signOut}>
      <LogOut size={17} aria-hidden="true" />
      Salir
    </Button>
  );
}
