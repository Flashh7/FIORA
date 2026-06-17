import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  // If there is no active session, redirect to the Google login flow.
  if (!session || !session.user) {
    redirect("/api/auth/signin");
  }

  // The signIn callback in [...nextauth]/route.ts already validates the email against 
  // AUTHORIZED_ADMIN_EMAILS. However, we do a redundant check here just for safety.
  const authorizedEmails = process.env.AUTHORIZED_ADMIN_EMAILS 
    ? process.env.AUTHORIZED_ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) 
    : [];

  if (!session.user.email || !authorizedEmails.includes(session.user.email.toLowerCase())) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]">
        <div className="text-center space-y-6 max-w-md p-8 border border-rose-500/20 bg-rose-500/5 rounded-2xl">
          <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto" />
          <h1 className="text-3xl font-bold text-white tracking-tight">Access Denied</h1>
          <p className="text-gray-400 text-sm">
            The account <span className="font-mono text-rose-400">{session.user.email}</span> does not have Super-Admin privileges on this FIORA cluster.
          </p>
          <a 
            href="/api/auth/signout" 
            className="inline-block mt-4 px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors"
          >
            Sign Out
          </a>
        </div>
      </div>
    );
  }

  // User is fully authenticated and authorized
  return <>{children}</>;
}
