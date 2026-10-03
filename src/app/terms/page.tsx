import Link from "next/link";
import { PublicHeader } from "@/components/ui/Headers";

export default function TermsPage() {
  return <>
    <PublicHeader signedIn={false} />
    <main className="mx-auto flex max-w-[880px] flex-col gap-8 px-(--gutter) pt-8 pb-20">
      <h1 className="text-[32px] leading-[1.2] font-medium">이용약관</h1>
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl leading-[1.2] font-medium">1. 서비스 이용</h2>
        <p>finsight는 카드 명세서·은행 거래내역을 분석하여 지출 요약, 거래 분류 및 절약 조언을 제공하는 서비스입니다. 원화(KRW) 명세서를 지원하며, 본인이 이용 권한을 가진 파일만 업로드해야 합니다.</p>
        <p>이메일 인증 또는 Google 로그인을 통해 서비스를 이용할 수 있습니다. 계정과 로그인 정보를 안전하게 관리해 주세요.</p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl leading-[1.2] font-medium">2. 플랜과 분석</h2>
        <p>Free는 분석 요약, 카테고리 분류와 거래 목록, 탐지 건수를 제공합니다. Pro는 다중 파일 통합, 탐지 상세, 월별 추이와 AI 인사이트를 추가로 제공합니다. 파일 수와 월 분석 횟수는 <Link href="/#pricing" className="underline underline-offset-3">요금제</Link>에서 확인할 수 있습니다.</p>
        <p>월 분석 횟수는 성공한 분석만 기록하며, 분석을 삭제해도 복구되지 않습니다. 실패한 분석은 사용 횟수에 포함하지 않습니다.</p>
        <p>AI 분류와 조언에는 오류가 있을 수 있으므로 원본 명세서와 함께 결과를 확인해 주세요.</p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl leading-[1.2] font-medium">3. 결제와 해지</h2>
        <p>Pro 구독은 월 $9이며, Polar를 통해 미국 달러(USD)로 결제합니다. 구독 관리와 해지는 설정의 Polar 고객 포털에서 진행할 수 있습니다.</p>
        <p>해지를 예약해도 이용 기간이 끝날 때까지 Pro 기능을 사용할 수 있습니다. 기간 종료 후에는 Free로 전환되며, 과거 분석은 계속 열람할 수 있고 Pro 기능만 제한됩니다.</p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl leading-[1.2] font-medium">4. 데이터 보관과 삭제</h2>
        <p>업로드 원본 파일과 분석 기록은 사용자가 삭제하거나 탈퇴할 때까지 보관합니다. 설정에서 분석 개별 삭제 또는 회원 탈퇴를 할 수 있습니다. 분석을 삭제하면 해당 원본 파일과 거래 내역도 삭제됩니다.</p>
        <p>회원 탈퇴 시 구독 취소, 원본 파일 삭제, 계정과 분석 데이터 삭제 순서로 처리합니다. 개인정보의 수집과 처리에 관한 자세한 내용은 <Link href="/privacy" className="underline underline-offset-3">개인정보처리방침</Link>에서 확인할 수 있습니다.</p>
      </section>
    </main>
  </>;
}
