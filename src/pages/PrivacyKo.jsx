import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-base font-bold text-foreground border-b border-border pb-2">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
);

export default function PrivacyKo() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/privacy" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">개인정보 처리방침</h1>
        </div>
      </div>

      <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 mb-6 text-xs text-primary">
        본 문서는 ChatMarket 개인정보 처리방침의 한국어판입니다. 법적 구속력이 있는 정본은 일본어판입니다.{" "}
        <Link to="/privacy" className="underline">日本語版 →</Link>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-8">
        <p className="text-xs text-muted-foreground">제정일: 2026년 4월 15일 | 운영자: ChatMarket (주식회사 ONE STEP)</p>

        <Section title="제1조 (수집하는 정보)">
          <p>본 서비스는 다음의 정보를 수집합니다.</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>등록 정보:</strong> 이메일 주소, 성명(실명), 주소, 전화번호</li>
            <li><strong>본인확인 서류:</strong> 운전면허증·여권·신분증 등의 이미지</li>
            <li><strong>결제 정보:</strong> 코인 구매 내역·Stripe 결제 ID (카드 번호는 당사 서버에 저장되지 않습니다)</li>
            <li><strong>통화·방송 데이터:</strong> 통화 시간·녹화 파일(녹화 옵션 선택 시)·채팅 로그</li>
            <li><strong>이용 로그:</strong> IP 주소·기기 정보·열람 이력</li>
          </ul>
        </Section>

        <Section title="제2조 (정보의 이용 목적)">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>서비스의 제공·운영·개선</li>
            <li>본인확인 및 부정 이용 방지</li>
            <li>코인 구매·출금 처리 (자금결제법 대응)</li>
            <li>크리에이터 보수 산정·이체 처리</li>
            <li>고객 지원·서비스 안내</li>
            <li>법령에 따른 공개 대응</li>
          </ul>
        </Section>

        <Section title="제3조 (제3자 제공)">
          <p>당사는 다음의 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다.</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>이용자의 동의가 있는 경우</li>
            <li>법령에 따른 공개 요청이 있는 경우</li>
            <li>생명·신체·재산의 보호를 위해 필요한 경우</li>
            <li>업무 위탁처(Stripe, AWS 등)에 필요 최소한의 제공 (위탁처는 동등한 보호 의무를 부담)</li>
          </ul>
        </Section>

        <Section title="제4조 (녹화 데이터 취급)">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>녹화 데이터는 AWS S3(도쿄 리전)에 암호화하여 저장됩니다.</li>
            <li>접근은 AWS CloudFront 서명된 URL 경유로만 가능하며, 제3자의 직접 접근은 불가합니다.</li>
            <li>크리에이터가 아카이브를 공개 설정한 경우, 지정 범위의 이용자에게 공개됩니다. 공개 전 등장하는 모든 사람의 동의 확인은 크리에이터의 책임입니다.</li>
            <li>계정 삭제 시 녹화 데이터 삭제를 요청할 수 있습니다.</li>
          </ul>
        </Section>

        <Section title="제5조 (결제 정보 취급)">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>코인 구매는 Stripe, Inc.의 결제 시스템을 통해 처리됩니다. 카드 번호는 당사 서버에 저장되지 않습니다.</li>
            <li>구매 내역(금액·날짜·플랜 ID·코인 수)은 당사 데이터베이스에 기록됩니다.</li>
            <li>일본 자금결제법에 따라, 최초 코인 구매 시 이용약관 동의 일시를 영구 보존합니다.</li>
          </ul>
        </Section>

        <Section title="제6조 (본인확인 서류 취급)">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>본인확인 서류는 KYC(고객 확인) 목적에만 사용됩니다.</li>
            <li><strong>이미지 파일은 심사 완료 후 30일 이내에 AWS S3 라이프사이클 정책에 의해 자동 삭제됩니다.</strong> 이후에는 '심사 완료' 상태 및 날짜만 최소 정보로 보관합니다.</li>
            <li>제3자 제공은 법령에 따른 경우에만 이루어집니다.</li>
          </ul>
        </Section>

        <Section title="제7조 (Cookie·로컬 스토리지 및 PWA 기술적 사항)">
          <p>본 서비스는 세션 관리·서비스 개선을 위해 Cookie 및 브라우저 스토리지를 사용합니다.</p>
          <p className="font-semibold text-foreground mt-2">▼ PWA(프로그레시브 웹 앱) 기술적 세부사항</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>세션 Cookie:</strong> 로그인 인증 토큰 보관에 사용합니다. 브라우저 종료 또는 로그아웃 시 삭제됩니다.</li>
            <li><strong>localStorage:</strong> 언어 설정·UI 테마·최근 열람 상태 등 사용자 설정을 기기 내에만 저장합니다. 당사 서버로 전송되지 않습니다.</li>
            <li><strong>IndexedDB:</strong> 오프라인 대응을 위해 Service Worker가 캐시 데이터를 저장할 수 있습니다. 개인정보는 포함되지 않습니다.</li>
            <li><strong>Service Worker 캐시:</strong> PWA의 빠른 시작을 위해 정적 파일(JS·CSS·이미지)을 캐시합니다. 브라우저의 '사이트 데이터 지우기'로 삭제할 수 있습니다.</li>
            <li><strong>푸시 알림 토큰:</strong> 푸시 알림을 허용한 경우 기기 토큰을 서버에 저장합니다. 알림 설정 또는 브라우저 설정에서 삭제할 수 있습니다.</li>
            <li><strong>홈 화면 추가(PWA 설치):</strong> 앱으로 설치해도 수집·저장되는 데이터 종류는 웹 버전과 동일합니다. 추가 트래킹은 없습니다.</li>
          </ul>
        </Section>

        <Section title="제8조 (정보의 보관 기간)">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>계정 정보: 탈퇴 후 5년간 보존 (법령 대응)</li>
            <li>결제·코인 내역: 10년간 보존 (자금결제법 대응)</li>
            <li><strong>본인확인 서류 이미지: 심사 완료 후 30일 이내에 S3에서 자동 삭제.</strong> 이후에는 '심사 완료' 상태 및 날짜만 보관.</li>
            <li>통화 로그·채팅: 탈퇴 후 1년간</li>
            <li>녹화 데이터: 크리에이터가 삭제하거나 탈퇴로부터 90일 후</li>
          </ul>
        </Section>

        <Section title="제9조 (정보 열람·정정·삭제 청구 / GDPR·개인정보보호법 대응)">
          <p>이용자는 당사가 보유한 개인정보의 열람·정정·삭제를 청구할 수 있습니다. 이메일(<a href="mailto:info@live-chat-market.com" className="text-primary underline">info@live-chat-market.com</a>)로 문의해 주십시오. 본인 확인 후 법령이 정하는 기간 내에 대응합니다.</p>
          <p className="font-semibold text-foreground mt-3">▼ GDPR (EU/UK 거주자)</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>열람권(Right of Access):</strong> 당사가 보유한 모든 개인 데이터의 사본을 요청할 수 있습니다.</li>
            <li><strong>데이터 이동권(Right to Data Portability):</strong> 기계 판독 가능 형식(JSON)으로 데이터 제공을 요청 후 30일 이내에 대응합니다.</li>
            <li><strong>삭제권(Right to Erasure / "잊혀질 권리"):</strong> 법적 보존 의무 데이터를 제외한 모든 개인 데이터 삭제를 청구할 수 있습니다. 30일 이내 처리.</li>
            <li><strong>처리 제한권:</strong> 처리 목적에 이의가 있는 경우 처리 제한을 요청할 수 있습니다.</li>
            <li><strong>감독 기관 불만 제기권:</strong> EU 거주자는 거주 국가의 개인정보보호 감독 기관(DPA)에 불만을 제기할 권리가 있습니다.</li>
          </ul>
          <p className="font-semibold text-foreground mt-3">▼ 한국 개인정보보호법(PIPA) 대응</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>열람·정정·삭제·처리 정지 등 정보주체의 권리 행사는 위 이메일 주소로 접수합니다.</li>
            <li>요청 접수 후 10일 이내에 처리 결과를 통보합니다.</li>
          </ul>
        </Section>

        <Section title="제10조 (안전 관리 조치)">
          <p>당사는 개인정보 유출·소멸·훼손을 방지하기 위해 접근 제어·암호화·정기적인 보안 감사 등의 안전 관리 조치를 시행합니다.</p>
        </Section>

        <Section title="제11조 (문의처)">
          <p>
            개인정보 취급 관련 문의:<br />
            ChatMarket 개인정보보호 담당<br />
            Email: <a href="mailto:info@live-chat-market.com" className="text-primary underline">info@live-chat-market.com</a>
          </p>
        </Section>

        <div className="border-t border-border pt-4 text-xs text-muted-foreground text-right">
          <p>ChatMarket 운영사무국</p>
          <p>최종 업데이트: 2026년 4월 16일</p>
        </div>

        <div className="flex gap-4 pt-2 flex-wrap">
          <Link to="/privacy" className="text-xs text-primary hover:underline">日本語 →</Link>
          <Link to="/privacy/en" className="text-xs text-primary hover:underline">English →</Link>
          <Link to="/terms" className="text-xs text-primary hover:underline">이용약관 →</Link>
        </div>
      </div>
    </div>
  );
}