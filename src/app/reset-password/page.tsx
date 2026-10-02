import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { getUserId } from "@/lib/auth";

export default async function ResetPage() {
  // verifyOtp(type=recovery)가 서버 쿠키에 저장한 세션을 getClaims로 검증한다.
  return <ResetPasswordForm canUpdatePassword={Boolean(await getUserId())} />;
}
