import { redirect } from "next/navigation";

/** Runs a mutation; on a thrown Error, redirects back to `path` with the message in ?error=. */
export async function attempt<T>(path: string, fn: () => Promise<T>): Promise<T> {
  let result: T;
  try {
    result = await fn();
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // let Next redirects/notFound through
    const msg = e instanceof Error ? e.message : "Something went wrong";
    const sep = path.includes("?") ? "&" : "?";
    redirect(`${path}${sep}error=${encodeURIComponent(msg)}`);
  }
  return result;
}
