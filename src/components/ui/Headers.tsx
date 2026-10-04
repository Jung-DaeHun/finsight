import type { Plan } from "@/types";
import { signOut } from "@/app/auth/actions";
import Link from "next/link";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Wordmark } from "./Wordmark";

const headerClass = "sticky top-0 z-20 grid min-h-15 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-hairline-soft bg-canvas px-(--gutter)";

export function PublicHeader({ signedIn }: { signedIn: boolean }) {
  return <header className={`${headerClass} max-[860px]:grid-cols-[auto_1fr]`}>
    <Wordmark />
    <nav aria-label="공개 메뉴" className="flex h-full items-center gap-1 max-[860px]:hidden">
      <Link href="/#features" className="px-3 font-medium no-underline hover:text-charcoal">기능</Link>
      <Link href="/#pricing" className="px-3 font-medium no-underline hover:text-charcoal">요금제</Link>
      <Link href="/sample" className="px-3 font-medium no-underline hover:text-charcoal">샘플 결과</Link>
    </nav>
    <div className="flex items-center justify-end gap-3">
      {signedIn ? <Button size="sm" href="/dashboard">대시보드</Button> : <><Link href="/login" className="text-sm font-medium no-underline hover:text-charcoal">로그인</Link><Button size="sm" href="/signup">무료로 시작하기</Button></>}
    </div>
  </header>;
}

export function AppHeader({ plan, email, active, onSignOut }: { plan: Plan; email: string; active: "dashboard" | "settings"; onSignOut?: () => void }) {
  const tabs = [
    { label: "대시보드", href: "/dashboard", selected: active === "dashboard" },
    { label: "새 분석", href: "/dashboard#upload", selected: false },
    { label: "설정", href: "/settings", selected: active === "settings" },
  ];
  return <header className={`${headerClass} max-[600px]:grid-cols-[1fr_auto] max-[600px]:pt-2`}>
    <Wordmark href="/dashboard" />
    <nav aria-label="앱 메뉴" className="flex h-full items-center justify-center gap-1 max-[600px]:col-span-2 max-[600px]:row-start-2 max-[600px]:h-11">
      {tabs.map((tab) => <Link key={tab.href} href={tab.href} aria-current={tab.selected ? "page" : undefined} className={`flex h-full items-center border-b-2 px-3 font-medium no-underline ${tab.selected ? "border-ink text-ink" : "border-transparent text-mute"}`}>{tab.label}</Link>)}
    </nav>
    <div className="flex items-center justify-end gap-3"><Badge inverse={plan === "pro"}>{plan === "pro" ? "Pro" : "Free"}</Badge><span className="text-sm text-mute max-[860px]:hidden">{email}</span>{onSignOut ? <button type="button" onClick={onSignOut} className="text-sm font-medium text-ink">로그아웃</button> : <form action={signOut}><button type="submit" className="text-sm font-medium text-ink">로그아웃</button></form>}</div>
  </header>;
}
