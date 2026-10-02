import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/SignupForm";
import { getUserId } from "@/lib/auth";

export default async function SignupPage() {
  if (await getUserId()) redirect("/dashboard");
  return <SignupForm />;
}
