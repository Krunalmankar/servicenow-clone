import { redirect } from "next/navigation";
import { getCurrentUser, isAgent } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(isAgent(user) ? "/dashboard" : "/portal");
}
