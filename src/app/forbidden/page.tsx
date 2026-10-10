import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="mx-auto mt-24 max-w-md card p-8 text-center">
      <h1 className="text-xl font-semibold">Access denied</h1>
      <p className="mt-2 text-sm text-gray-600">Your roles don&apos;t allow access to this page.</p>
      <Link href="/" className="btn-primary mt-6">Go home</Link>
    </div>
  );
}
