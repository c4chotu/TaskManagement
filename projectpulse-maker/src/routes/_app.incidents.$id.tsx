// Alias route — incident details reuse the task detail view.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/incidents/$id")({
  component: IncidentRedirect,
});

function IncidentRedirect() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/tasks/$id", params: { id }, replace: true });
  }, [id, navigate]);
  return null;
}
