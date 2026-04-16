import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-base font-bold text-foreground border-b border-border pb-2">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
);

export default function PrivacyEn() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/privacy" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Privacy Policy</h1>
        </div>
      </div>

      <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 mb-6 text-xs text-primary">
        This is the English version of ChatMarket's Privacy Policy. The Japanese version is the legally binding master document.{" "}
        <Link to="/privacy" className="underline">日本語版 →</Link>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-8">
        <p className="text-xs text-muted-foreground">Established: April 15, 2026 | Operator: ChatMarket (株式会社 ONE STEP)</p>

        <Section title="Article 1 – Information We Collect">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>Registration data:</strong> Email address, full name, address, phone number</li>
            <li><strong>Identity verification documents:</strong> Images of driver's license, passport, or national ID</li>
            <li><strong>Payment data:</strong> Coin purchase history, Stripe payment IDs (card numbers are never stored on our servers)</li>
            <li><strong>Call / stream data:</strong> Call duration, recording files (only when recording option is selected), chat logs</li>
            <li><strong>Usage logs:</strong> IP address, device information, browsing history</li>
          </ul>
        </Section>

        <Section title="Article 2 – Purpose of Use">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Providing, operating, and improving the Service</li>
            <li>Identity verification and fraud prevention</li>
            <li>Coin purchase and payout processing (Japanese Payment Services Act compliance)</li>
            <li>Creator reward calculation and bank transfers</li>
            <li>Customer support and service announcements</li>
            <li>Responding to legal disclosure requests</li>
          </ul>
        </Section>

        <Section title="Article 3 – Sharing with Third Parties">
          <p>We do not share personal information with third parties except in the following cases:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>With the user's consent</li>
            <li>When required by law</li>
            <li>To protect life, body, or property</li>
            <li>To service providers (Stripe, AWS, etc.) to the minimum extent necessary (providers are bound by equivalent confidentiality obligations)</li>
          </ul>
        </Section>

        <Section title="Article 4 – Recording Data">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Recordings are stored encrypted on AWS S3 (Tokyo region).</li>
            <li>Access is restricted to AWS CloudFront signed URLs; no direct third-party access.</li>
            <li>If a creator publishes an archive, it becomes available to the specified audience. Obtaining consent from all persons appearing in the recording is the creator's responsibility.</li>
            <li>You may request deletion of your recording data upon account termination.</li>
          </ul>
        </Section>

        <Section title="Article 5 – Payment Data">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Coin purchases are processed via Stripe, Inc. Card numbers are never stored on our servers.</li>
            <li>Purchase history (amount, date, plan ID, coins received) is recorded in our database.</li>
            <li>Per the Japanese Payment Services Act, the timestamp of first Terms agreement at coin purchase is retained permanently.</li>
          </ul>
        </Section>

        <Section title="Article 6 – Identity Verification Documents">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>ID documents are used solely for KYC (Know Your Customer) purposes.</li>
            <li>Image files are <strong>automatically deleted from S3 storage within 30 days of verification completion</strong> via AWS S3 lifecycle policy. Only the "verified" status and date are retained.</li>
            <li>Documents are shared with third parties only when required by law.</li>
          </ul>
        </Section>

        <Section title="Article 7 – Cookies, Local Storage & PWA Technical Details">
          <p>We use cookies and browser storage for session management and service improvement.</p>
          <p className="font-semibold text-foreground mt-2">▼ PWA-specific technical details</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>Session Cookies:</strong> Used to maintain login authentication tokens. Deleted on browser close or explicit logout.</li>
            <li><strong>localStorage:</strong> Stores user preferences (language, UI theme, last viewed state) on-device only. Not transmitted to our servers.</li>
            <li><strong>IndexedDB:</strong> Service Worker may cache data for offline support. No personal information is included.</li>
            <li><strong>Service Worker Cache:</strong> Static files (JS, CSS, images) are cached for fast startup. Clearable via "Clear site data" in browser settings.</li>
            <li><strong>Push Notification Token:</strong> If you enable push notifications, your device token is stored on our server. Disable via notification settings or browser preferences.</li>
            <li><strong>Home Screen Install (PWA):</strong> Installing as an app does not change the type of data collected. No additional tracking occurs.</li>
          </ul>
        </Section>

        <Section title="Article 8 – Retention Periods">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Account information: 5 years after withdrawal (legal compliance)</li>
            <li>Payment / coin history: 10 years (Payment Services Act)</li>
            <li><strong>ID document images: Auto-deleted from S3 within 30 days of verification.</strong> Only "verified" status retained thereafter.</li>
            <li>Call logs / chat: 1 year after withdrawal</li>
            <li>Recordings: Until deleted by creator, or 90 days after account termination</li>
          </ul>
        </Section>

        <Section title="Article 9 – Your Rights (GDPR / CCPA / Korean PIPA)">
          <p>You may request access, correction, or deletion of your personal data by emailing <a href="mailto:unei@chatmarket.info" className="text-primary underline">unei@chatmarket.info</a>. We will respond within the legally required period after identity verification.</p>
          <p className="font-semibold text-foreground mt-3">▼ GDPR rights (EU/UK residents)</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>Right of Access:</strong> Obtain a copy of all personal data we hold about you.</li>
            <li><strong>Right to Data Portability:</strong> Receive your data in a machine-readable format (JSON) within 30 days of request.</li>
            <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of all personal data except legally mandated records. Completed within 30 days.</li>
            <li><strong>Right to Restriction of Processing:</strong> Request that we restrict processing where you contest accuracy or object to the purpose.</li>
            <li><strong>Right to Lodge a Complaint:</strong> EU residents may file a complaint with their local Data Protection Authority (DPA).</li>
            <li><strong>Korean users (PIPA):</strong> Rights to view, correct, delete, and suspend processing are also accepted at the email above.</li>
          </ul>
        </Section>

        <Section title="Article 10 – Security Measures">
          <p>We implement access controls, encryption, and periodic security audits to prevent unauthorized access, loss, or destruction of personal information.</p>
        </Section>

        <Section title="Article 11 – Contact">
          <p>
            ChatMarket Privacy Officer<br />
            Email: <a href="mailto:unei@chatmarket.info" className="text-primary underline">unui@chatmarket.info</a>
          </p>
        </Section>

        <div className="border-t border-border pt-4 text-xs text-muted-foreground text-right">
          <p>ChatMarket Operations</p>
          <p>Last updated: April 16, 2026</p>
        </div>

        <div className="flex gap-4 pt-2 flex-wrap">
          <Link to="/privacy" className="text-xs text-primary hover:underline">日本語 →</Link>
          <Link to="/privacy/ko" className="text-xs text-primary hover:underline">한국어 →</Link>
          <Link to="/terms" className="text-xs text-primary hover:underline">Terms of Service →</Link>
        </div>
      </div>
    </div>
  );
}