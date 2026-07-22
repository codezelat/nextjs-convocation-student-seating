import Link from "next/link";
import { ArmchairIcon, FileBadge2Icon, LogOutIcon } from "lucide-react";

import { logoutAction } from "@/app/hidden-admin/actions";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

export function AdminHeader({
  email,
  active,
}: {
  email: string;
  active: "seating" | "certificate";
}) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl bg-background p-4 ring-1 ring-border lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <BrandMark href="/hidden-admin/dashboard" />
        <nav aria-label="Admin sections" className="flex flex-wrap gap-2">
          <Button
            nativeButton={false}
            size="sm"
            variant={active === "seating" ? "secondary" : "ghost"}
            render={<Link href="/hidden-admin/dashboard" />}
          >
            <ArmchairIcon data-icon="inline-start" />
            Seating
          </Button>
          <Button
            nativeButton={false}
            size="sm"
            variant={active === "certificate" ? "secondary" : "ghost"}
            render={<Link href="/hidden-admin/certificate" />}
          >
            <FileBadge2Icon data-icon="inline-start" />
            Certificates
          </Button>
        </nav>
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
        <span className="text-sm text-muted-foreground">{email}</span>
        <form action={logoutAction}>
          <Button type="submit" variant="outline">
            <LogOutIcon data-icon="inline-start" />
            Logout
          </Button>
        </form>
      </div>
    </header>
  );
}
