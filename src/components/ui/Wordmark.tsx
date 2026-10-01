import Link from "next/link";

export function Wordmark({ href = "/", size = "md" }: { href?: string; size?: "sm" | "md" }) {
  return <Link href={href} className={`font-heading font-bold leading-none tracking-[-0.03em] text-ink no-underline ${size === "sm" ? "text-lg" : "text-2xl"}`}>finsight</Link>;
}
