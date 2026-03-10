import { redirect } from "next/navigation";
import { auth } from "@/server/lib/auth";
import { PlatformShell } from "@/components/layout/PlatformShell";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <PlatformShell>{children}</PlatformShell>;
}
