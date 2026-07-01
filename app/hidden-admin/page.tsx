import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/lib/auth/session";

export default async function HiddenAdminPage() {
  const session = await getAdminSession();

  if (session) {
    redirect("/hidden-admin/dashboard");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-muted/30 px-5 py-10">
      <div className="flex w-full flex-col items-center gap-8">
        <BrandMark />
        <LoginForm />
      </div>
    </main>
  );
}
