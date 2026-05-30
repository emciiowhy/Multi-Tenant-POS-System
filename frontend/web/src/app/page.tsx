import Link from "next/link";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">VendMe</h1>
      <p className="text-neutral-500">
        Multi-tenant POS + ERP. {session ? "You are signed in." : "Please sign in."}
      </p>

      {session ? (
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm">
            Account: <span className="font-mono">{session.accountId}</span>
          </p>
          <p className="text-sm">
            Active company:{" "}
            <span className="font-mono">{session.activeCompanyId ?? "—"}</span>
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            {session.memberships.length} company membership(s)
          </p>
        </div>
      ) : (
        <Link
          href="/login"
          className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Sign in
        </Link>
      )}
    </main>
  );
}
