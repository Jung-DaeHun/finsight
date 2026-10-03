import { CtaBand } from "@/components/landing/CtaBand";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import { PublicHeader } from "@/components/ui/Headers";
import { getUserId } from "@/lib/auth";
import { getUserPlan } from "@/lib/data";

export default async function Home() {
  const userId = await getUserId();
  const plan = userId ? await getUserPlan(userId) : null;
  // 같은 목적지에는 같은 문구를 쓴다(UX_GUIDE 2.3): 로그인 상태면 공개 헤더처럼 `대시보드`.
  const start = userId ? { href: "/dashboard", label: "대시보드" } : { href: "/signup", label: "무료로 시작하기" };
  return <>
    <PublicHeader signedIn={userId !== null} />
    <main>
      <Hero start={start} />
      <Features />
      <HowItWorks />
      <Pricing start={start} plan={plan} />
      <CtaBand start={start} />
    </main>
    <Footer />
  </>;
}
