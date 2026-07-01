"use client";

import { useActionState } from "react";
import { LockKeyholeIcon } from "lucide-react";

import { loginAction, type LoginState } from "@/app/hidden-admin/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {}
  );

  return (
    <Card className="w-full max-w-sm rounded-2xl shadow-xl shadow-foreground/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <LockKeyholeIcon aria-hidden="true" />
          Admin sign in
        </CardTitle>
        <CardDescription>Restricted seating management area.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-5">
          <FieldGroup>
            <Field data-invalid={Boolean(state.error)}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </Field>
            <Field data-invalid={Boolean(state.error)}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
              {state.error ? <FieldError>{state.error}</FieldError> : null}
            </Field>
          </FieldGroup>
          <Button type="submit" className="h-10" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
