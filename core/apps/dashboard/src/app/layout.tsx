import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/AuthProvider";
import { HealthProvider } from "../lib/HealthProvider";
import { NextAuthProvider } from "../lib/NextAuthProvider";
import AppShell from "../components/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FIORA | Operational Command Center",
  description: "AI-native operational intelligence system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-gray-100 antialiased selection:bg-white/10`}>
        <NextAuthProvider>
          <AuthProvider>
            <HealthProvider>
              <AppShell>
                {children}
              </AppShell>
            </HealthProvider>
          </AuthProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
