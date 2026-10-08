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
    <aside className="assigned-tasks-notice" aria-label="Tâches à suivre">
      <div>
        <strong>
          {pendingTasks.length === 1
            ? "Vous avez une tâche à suivre"
            : `Vous avez ${pendingTasks.length} tâches à suivre`}
        </strong>
        <span>
          {pendingTasks.some(({ task }) => task.status === "À faire" || task.status === "À corriger")
            ? "Une action est attendue dans votre dossier."
            : "Consultez l’état des tâches envoyées à l’administration."}
        </span>
      </div>
      <Link href="#demandes">
        Voir mes tâches <span aria-hidden="true">→</span>
      </Link>
    </aside>
  );
}
