"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

function serialize(form: HTMLFormElement) {
  return Array.from(new FormData(form).entries())
    .map(([key, value]) => `${key}=${typeof value === "string" ? value : value.name}`)
    .join("&");
}

export default function SaveButton({
  children,
  pendingLabel = "Guardando...",
  className = "",
  idleClassName = "opacity-40 grayscale cursor-not-allowed",
  style,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  idleClassName?: string;
  style?: React.CSSProperties;
}) {
  const { pending } = useFormStatus();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const baseline = useRef("");
  const wasPending = useRef(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const form = buttonRef.current?.closest("form");
    if (!form) return;
    baseline.current = serialize(form);
    const check = () => setDirty(serialize(form) !== baseline.current);
    form.addEventListener("input", check);
    form.addEventListener("change", check);
    return () => {
      form.removeEventListener("input", check);
      form.removeEventListener("change", check);
    };
  }, []);

  useEffect(() => {
    if (wasPending.current && !pending) {
      const form = buttonRef.current?.closest("form");
      if (form) baseline.current = serialize(form);
      setDirty(false);
    }
    wasPending.current = pending;
  }, [pending]);

  const disabled = pending || !dirty;

  return (
    <button
      ref={buttonRef}
      type="submit"
      disabled={disabled}
      className={`${className} ${disabled ? idleClassName : ""} transition-all`}
      style={style}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
