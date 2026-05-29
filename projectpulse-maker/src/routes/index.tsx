import { createFileRoute, redirect } from "@tanstack/react-router";
import { tokenStore } from "@/lib/api";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: tokenStore.get() ? "/dashboard" : "/login" });
  },
  component: () => null,
});
