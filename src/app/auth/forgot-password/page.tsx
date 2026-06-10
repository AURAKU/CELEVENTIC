"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <AuthLayout title="Reset Password" subtitle="We'll send you a reset link">
      {sent ? (
        <div className="text-center space-y-5">
          <div className="rounded-xl bg-brand-50 border border-brand-200 p-4 text-sm text-brand-700">
            If an account exists for {email}, you will receive a password reset link shortly.
          </div>
          <Link href="/auth/login" className="text-brand-600 text-sm font-semibold hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" size="lg">
            Send Reset Link
          </Button>
          <p className="text-center text-sm">
            <Link href="/auth/login" className="text-brand-600 font-semibold hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
