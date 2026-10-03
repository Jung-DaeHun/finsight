import { CtaBand } from "@/components/landing/CtaBand";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import { PublicHeader } from "@/components/ui/Headers";
import { getUserId } from "@/lib/auth";

export default async function Home() {
  const signedIn = await getUserId() !== null;
  const startHref = signedIn ? "/dashboard" : "/signup";
  return <>
    <PublicHeader signedIn={signedIn} />
    <main>
      <Hero startHref={startHref} />
      <Features />
      <HowItWorks />
      <Pricing startHref={startHref} />
      <CtaBand startHref={startHref} />
    </main>
    <Footer />
  </>;
}
