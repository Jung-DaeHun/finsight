import { AUTH_ERROR_CODES, type AuthErrorCode } from "@/types/errors";

export function isProtectedPath(pathname: string): boolean {
  return ["/dashboard", "/settings"].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function confirmationNext(next: string | null): "/dashboard" | "/reset-password" {
  return next === "/reset-password" ? next : "/dashboard";
}

export function isEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email.trim());
}

export function validateCredentials(email: string, password: string): { email?: AuthErrorCode; password?: AuthErrorCode } {
  return {
    ...(!isEmail(email) && { email: "invalid_email" as const }),
    ...(password.length < 8 && { password: "password_too_short" as const }),
  };
}

export function isAuthErrorCode(code: unknown): code is AuthErrorCode {
  return typeof code === "string" && AUTH_ERROR_CODES.some((allowed) => allowed === code);
}

/** Supabase의 오류 원문은 화면·URL·로그에 전달하지 않는다. */
export function authErrorCode(error: { code?: string }): AuthErrorCode {
  if (error.code === "email_not_confirmed") return "email_not_confirmed";
  if (error.code === "invalid_credentials") return "invalid_credentials";
  if (error.code === "email_address_invalid") return "invalid_email";
  if (error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit") return "auth_rate_limited";
  return "auth_failed";
}

export function authUrl(path: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is required");
  return `${appUrl.replace(/\/$/, "")}${path}`;
}
