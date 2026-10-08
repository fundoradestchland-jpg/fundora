import { redirect } from "next/navigation";
import { getSession } from "@/lib/server-auth";

export default async function DashboardOverviewPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "admin") redirect("/admin/dossiers");
  redirect(`/dashboard/${session.user}`);
}
