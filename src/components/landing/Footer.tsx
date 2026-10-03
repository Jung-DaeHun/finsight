import Link from "next/link";
import { Wordmark } from "@/components/ui/Wordmark";

const CONTACT_EMAIL = "hello@finsight.app";

export function Footer() {
  return <footer className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-(--gutter) py-10">
    <Wordmark size="sm" />
    <nav aria-label="서비스 안내" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-mute">
      <Link href="/terms" className="no-underline hover:text-charcoal">이용약관</Link>
      <Link href="/privacy" className="no-underline hover:text-charcoal">개인정보처리방침</Link>
      <a href={`mailto:${CONTACT_EMAIL}`} className="no-underline hover:text-charcoal">문의</a>
    </nav>
    <span className="text-sm font-medium text-mute">© 2026 finsight</span>
  </footer>;
}
