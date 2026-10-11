"use client";

import Link from "next/link";
import { useFundoraRequests } from "@/lib/request-api";

export function AssignedTasksNotice() {
  const { requests, loading, error } = useFundoraRequests();
  if (loading || error) return null;

  const pendingTasks = requests.flatMap((request) =>
    request.tasks.filter((task) => task.status !== "Validé").map((task) => ({
      task,
      request,
    }))
  );

  if (pendingTasks.length === 0) return null;

  return (
    <aside className="assigned-tasks-notice" aria-label="Tareas pendientes">
      <div>
        <strong>
          {pendingTasks.length === 1
            ? "Tienes una tarea pendiente"
            : `Tienes ${pendingTasks.length} tareas pendientes`}
        </strong>
        <span>
          {pendingTasks.some(({ task }) => task.status === "À faire" || task.status === "À corriger")
            ? "Une action est attendue sur votre dossier."
            : "Consultez le statut des tâches envoyées à l’administration."}
        </span>
      </div>
      <Link href="#demandes">
        Ver mis tareas <span aria-hidden="true">→</span>
      </Link>
    </aside>
  );
}
