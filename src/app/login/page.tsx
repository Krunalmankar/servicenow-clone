import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getCurrentUser, setSession } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const userName = String(formData.get("userName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const user = await db.user.findUnique({ where: { userName } });
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect("/login?error=1");
  }
  await setSession(user.id);
  redirect("/");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-sn-dark">
      <form action={login} className="w-full max-w-sm rounded-lg bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold text-sn-dark">now<span className="text-sn-accent-dark">desk</span></div>
          <p className="mt-1 text-sm text-gray-500">IT Service Management</p>
        </div>
        {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">Invalid user name or password.</p>}
        <label className="mb-1 block text-sm font-medium">User name</label>
        <input name="userName" className="input mb-4" autoFocus required />
        <label className="mb-1 block text-sm font-medium">Password</label>
        <input name="password" type="password" className="input mb-6" required />
        <button className="btn-primary w-full justify-center py-2">Log in</button>
        <div className="mt-6 rounded bg-gray-50 p-3 text-xs text-gray-600">
          <p className="font-semibold">Demo accounts (password: <code>password</code>)</p>
          <p>admin · Admin &nbsp;|&nbsp; beth.anglin · ITIL agent</p>
          <p>david.loo · Change manager &nbsp;|&nbsp; abel.tuter · End user</p>
        </div>
      </form>
    </div>
  );
}
