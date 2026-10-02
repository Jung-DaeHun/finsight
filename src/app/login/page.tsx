import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getUserId } from "@/lib/auth";
import { isAuthErrorCode } from "@/lib/auth-flow";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  if (await getUserId()) redirect("/dashboard");
  const { error } = await searchParams;
  return <LoginForm initialError={isAuthErrorCode(error) ? error : undefined} />;
}
