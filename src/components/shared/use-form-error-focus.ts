"use client";

import { useEffect, useRef } from "react";

export function useFormErrorFocus(state: { message?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.message) return;
    const error = formRef.current?.querySelector<HTMLElement>('[role="alert"]');
    if (!error) return;
    error.tabIndex = -1;
    error.focus();
  }, [state]);
  return formRef;
}
