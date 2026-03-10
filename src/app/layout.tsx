import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-provider";
import { TRPCProvider } from "@/lib/trpc-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ignite - Innovation Management Platform",
  description:
    "Open-source innovation management platform for idea generation, evaluation, and implementation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <AuthProvider>
          <TRPCProvider>{children}</TRPCProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
