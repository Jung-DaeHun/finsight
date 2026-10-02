import Link from "next/link";
import { PublicHeader } from "@/components/ui/Headers";

const processors = [
  ["Anthropic", "미국", "가맹점명·명세서 헤더 일부와 샘플 행을 통한 거래 분류·열 매핑, 집계값을 통한 인사이트 생성"],
  ["Polar", "미국", "이메일·사용자 식별자 및 결제 정보를 통한 구독 결제 처리"],
  ["Vercel", "미국", "서비스 요청과 분석 처리에 필요한 데이터의 호스팅"],
  ["Supabase", "대한민국(서울 리전)", "계정, 업로드 원본 파일과 거래 내역, 분석 결과 및 구독 정보 저장"],
];

export default function PrivacyPage() {
  return <>
    <PublicHeader signedIn={false} />
    <main className="mx-auto flex max-w-[880px] flex-col gap-8 px-(--gutter) pt-8 pb-20">
      <h1 className="text-[32px] leading-[1.2] font-medium">개인정보처리방침</h1>
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl leading-[1.2] font-medium">1. 수집 항목과 이용 목적</h2>
        <p>finsight는 회원가입과 인증을 위해 이메일과 사용자 식별자를 수집합니다. 분석을 위해 업로드 원본 파일과 거래 내역(거래 날짜, 금액, 가맹점명, 설명), 분석 결과를 처리하고, 구독 관리를 위해 결제·구독 정보를 처리합니다.</p>
        <p>수집한 정보는 계정 관리, 명세서 분석, 분석 기록 제공 및 구독 결제에 사용합니다. 원본 파일은 비공개 저장소에 보관합니다.</p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl leading-[1.2] font-medium">2. 보관 기간</h2>
        <p>업로드 원본 파일과 거래 내역, 분석 결과는 사용자가 삭제하거나 탈퇴할 때까지 보관합니다. 계정 정보는 회원 탈퇴 시 삭제합니다.</p>
        <p>월 분석 한도 확인을 위한 성공 사용량 기록은 분석 개별 삭제 후에도 유지되며, 회원 탈퇴 시 함께 삭제합니다.</p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl leading-[1.2] font-medium">3. 처리 위탁 및 국외 이전</h2>
        <p>서비스 제공을 위해 다음 수탁사가 정보를 처리합니다. Anthropic, Polar, Vercel로의 미국 국외 이전은 회원가입 시 필수 동의를 받으며, 분석·결제·서비스 이용 시 필요한 정보가 전달됩니다.</p>
        <div className="overflow-x-auto">
          <table aria-label="처리 위탁 및 국외 이전" className="w-full min-w-[600px] border-collapse text-left text-sm">
            <thead><tr>{["수탁사", "국가", "처리 항목 및 목적"].map((label) => <th key={label} scope="col" className="border-b border-ink py-3 pr-4 font-medium">{label}</th>)}</tr></thead>
            <tbody>{processors.map(([name, country, purpose]) => <tr key={name}>
              <th scope="row" className="border-b border-hairline-soft py-3 pr-4 align-top font-medium">{name}</th>
              <td className="border-b border-hairline-soft py-3 pr-4 align-top">{country}</td>
              <td className="border-b border-hairline-soft py-3 align-top">{purpose}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl leading-[1.2] font-medium">4. 삭제 방법</h2>
        <p><Link href="/settings" className="underline underline-offset-3">설정</Link>에서 분석 개별 삭제 또는 회원 탈퇴를 할 수 있습니다. 개별 삭제는 원본 파일과 해당 분석의 거래 내역·결과를 삭제합니다. 회원 탈퇴는 Polar 구독 취소, 전체 원본 파일 삭제, 계정과 분석 데이터 삭제 순서로 처리합니다.</p>
        <p>서비스 이용 조건은 <Link href="/terms" className="underline underline-offset-3">이용약관</Link>에서 확인할 수 있습니다.</p>
      </section>
    </main>
  </>;
}
