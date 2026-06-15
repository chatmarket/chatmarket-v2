import React, { useState, useEffect } from "react";
import RequiredProfileModal from "@/components/onboarding/RequiredProfileModal";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, User, CreditCard, Building, Camera, Tag, PhoneCall, Lock, AlertCircle, Upload, Check, Shield, Key, Crown, Coins, Volume2 } from "lucide-react";
import useStreamSpeech from "@/hooks/useStreamSpeech";
import CoinPurchasePanel from "../components/yell/CoinPurchasePanel";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import CategoryTagSelector from "../components/channel/CategoryTagSelector";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const { voices, selectedVoice, setSelectedVoice, speak } = useStreamSpeech();
  const [testSpeechLoading, setTestSpeechLoading] = useState(false);

  const [profile, setProfile] = useState({
    nickname: "",
    bio: "",
    address: "",
    phone: "",
    avatar_url: "",
  });

  const [bank, setBank] = useState({
    bank_account_name: "",
    bank_name: "",
    bank_branch: "",
    bank_account_number: "",
    bank_account_type: "普通",
  });

  const [subscription, setSubscription] = useState({
    auto_subscribe_price: 3000,
    auto_subscribe_enabled: false,
  });
  const [channelTags, setChannelTags] = useState([]);
  const [channelCategoryId, setChannelCategoryId] = useState("");
  const [channelId, setChannelId] = useState(null);
  const [streamCategory, setStreamCategory] = useState("chat");
  const [fortuneFields, setFortuneFields] = useState({
    fortune_arts: "",
    fortune_experience: "",
    fortune_genres: "",
  });
  const [fanclubSettings, setFanclubSettings] = useState({
    fanclub_enabled: false,
    fanclub_monthly_price: 500,
    fanclub_description: "",
  });
  const [callSettings, setCallSettings] = useState({
    call_enabled: false,
    call_price_30min: 3000,
    call_price_60min: 5000,
    call_available_dates: "",
    call_theme: "",
  });

  // 基本情報
  const [basicInfo, setBasicInfo] = useState({
    email: "",
    full_name: "",
    address: "",
    phone: "",
    region: "",
  });
  const [editingBasicInfo, setEditingBasicInfo] = useState(false);
  const [verificationDocs, setVerificationDocs] = useState({
    full_name_doc: null,
    address_doc: null,
  });
  const [identityDocument, setIdentityDocument] = useState({
    url: "",
    status: "pending", // pending, approved, rejected
  });
  const [fullNameChanged, setFullNameChanged] = useState(false);
  const [addressChanged, setAddressChanged] = useState(false);
  const [isKycVerified, setIsKycVerified] = useState(false);

  // アカウント復旧設定
  const [recoverySettings, setRecoverySettings] = useState({
    backup_email: "",
    recovery_phone: "",
  });

  const FREE_TRIAL_EMAILS = ["haru.24@icloud.com"];

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then((u) => {
          setUser(u);
          setProfile({
            nickname: u.nickname || "",
            bio: u.bio || "",
            address: u.address || "",
            phone: u.phone || "",
            avatar_url: u.avatar_url || "",
          });
          setSubscription({
            auto_subscribe_price: u.auto_subscribe_price || 3000,
            auto_subscribe_enabled: u.auto_subscribe_enabled || false,
          });
          setBasicInfo({
            email: u.email || "",
            full_name: u.full_name || "",
            address: u.address || "",
            phone: u.phone || "",
            region: u.region || "",
          });
          // KYC確認: 氏名と住所の両方が設定されている場合
          setIsKycVerified(!!(u.full_name && u.address));
          // 身分証情報を設定
          if (u.identity_document_url || u.identity_document_status) {
           setIdentityDocument({
             url: u.identity_document_url || "",
             status: u.identity_document_status || "pending",
           });
          }
          // アカウント復旧設定を初期化
          setRecoverySettings({
           backup_email: u.backup_email || "",
           recovery_phone: u.recovery_phone || "",
          });
          });
      }
    });

    // Load channel info (bank + tags)
    base44.auth.me().then(async (u) => {
      const channels = await base44.entities.Channel.filter({ owner_email: u.email });
      if (channels[0]) {
        setBank({
          bank_account_name: channels[0].bank_account_name || "",
          bank_name: channels[0].bank_name || "",
          bank_branch: channels[0].bank_branch || "",
          bank_account_number: channels[0].bank_account_number || "",
          bank_account_type: channels[0].bank_account_type || "普通",
        });
        setChannelTags(channels[0].tags || []);
        setChannelCategoryId(channels[0].category_id || "");
        setChannelId(channels[0].id);
        setStreamCategory(channels[0].stream_category || "chat");
        setFortuneFields({
          fortune_arts: channels[0].fortune_arts || "",
          fortune_experience: channels[0].fortune_experience || "",
          fortune_genres: channels[0].fortune_genres || "",
        });
        setFanclubSettings({
          fanclub_enabled: channels[0].fanclub_enabled || false,
          fanclub_monthly_price: channels[0].fanclub_monthly_price || 500,
          fanclub_description: channels[0].fanclub_description || "",
        });

        // フリートライアルメール向け：自動的に通話受付有効化
        const isTrialUser = FREE_TRIAL_EMAILS.includes(u.email);
        const callEnabled = isTrialUser || channels[0].call_enabled;

        setCallSettings({
          call_enabled: callEnabled,
          call_price_15min: channels[0].call_price_15min || 0,
          call_price_30min: channels[0].call_price_30min || 0,
          call_price_45min: channels[0].call_price_45min || 0,
          call_price_60min: channels[0].call_price_60min || 0,
          call_price_75min: channels[0].call_price_75min || 0,
          call_price_90min: channels[0].call_price_90min || 0,
          call_price_105min: channels[0].call_price_105min || 0,
          call_price_120min: channels[0].call_price_120min || 0,
          call_available_dates: channels[0].call_available_dates || "",
          call_theme: channels[0].call_theme || "",
        });

        // 自動保存
        if (isTrialUser && !channels[0].call_enabled) {
          await base44.entities.Channel.update(channels[0].id, { call_enabled: true });
        }
      }
    }).catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      nickname: profile.nickname,
      bio: profile.bio.slice(0, 200),
      address: profile.address,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
    });
    toast.success("プロフィールを保存しました");
    setSaving(false);
  };

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    setSaving(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setProfile({ ...profile, avatar_url: file_url });
    await base44.auth.updateMe({ avatar_url: file_url });
    toast.success("プロフィール画像を更新しました");
    setSaving(false);
  };

  const handleSaveSubscription = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      auto_subscribe_price: subscription.auto_subscribe_price,
      auto_subscribe_enabled: subscription.auto_subscribe_enabled,
    });
    toast.success("サブスク設定を保存しました");
    setSaving(false);
  };

  if (!user) return null;

  // ?onboarding=1 かつ未完了のユーザーのみ必須モーダルを表示
  const urlParams = new URLSearchParams(window.location.search);
  const isOnboarding = urlParams.get("onboarding") === "1";
  if (isOnboarding && user.profile_completed !== true) {
    return (
      <RequiredProfileModal
        user={user}
        onComplete={() => {
          base44.auth.me().then(setUser).catch(() => {});
          // onboarding パラメータを除去して通常のSettings画面へ
          window.history.replaceState({}, "", "/settings");
        }}
      />
    );
  }

  const handleIdentityDocumentUpload = async (file) => {
    if (!file) return;
    setSaving(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setIdentityDocument({ url: file_url, status: "pending" });
    await base44.auth.updateMe({
      identity_document_url: file_url,
      identity_document_status: "pending",
    });
    toast.success("身分証をアップロードしました。審査をお待ちください。");
    setSaving(false);
  };

  const handleSaveBasicInfo = async () => {
    if ((fullNameChanged || addressChanged) && (!verificationDocs.full_name_doc || !verificationDocs.address_doc)) {
      toast.error("氏名または住所を変更する場合は、証明書類の提出が必須です。");
      return;
    }
    setSaving(true);
    await base44.auth.updateMe({
      email: basicInfo.email,
      full_name: basicInfo.full_name,
      address: basicInfo.address,
      phone: basicInfo.phone,
      region: basicInfo.region,
    });
    const nowVerified = !!(basicInfo.full_name && basicInfo.address);
    setIsKycVerified(nowVerified);

    // KYC完了時: チャンネルのbadgesに "verified" を自動付与
    if (nowVerified && channelId) {
      const channels = await base44.entities.Channel.filter({ owner_email: user.email });
      if (channels[0]) {
        const existingBadges = channels[0].badges || [];
        if (!existingBadges.includes("verified")) {
          await base44.entities.Channel.update(channelId, {
            badges: [...existingBadges, "verified"],
          });
        }
      }
    }

    toast.success("基本情報を保存しました");
    setSaving(false);
    setEditingBasicInfo(false);
    setFullNameChanged(false);
    setAddressChanged(false);
    setVerificationDocs({ full_name_doc: null, address_doc: null });
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-8">設定</h1>

      <Tabs defaultValue="basic">
        <TabsList className="bg-secondary mb-4 sm:mb-8 w-full flex flex-wrap gap-2 h-auto p-2 sm:h-10 sm:p-1">
          <TabsTrigger value="basic" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <Lock className="w-4 h-4" /> 基本情報
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <User className="w-4 h-4" /> プロフィール
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <CreditCard className="w-4 h-4" /> サブスク
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <Building className="w-4 h-4" /> 銀行口座
          </TabsTrigger>
          <TabsTrigger value="category" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <Tag className="w-4 h-4" /> 業種タグ
          </TabsTrigger>
          <TabsTrigger value="call" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <PhoneCall className="w-4 h-4" /> 通話設定
          </TabsTrigger>
          <TabsTrigger value="fanclub" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <Crown className="w-4 h-4" /> ファンクラブ
          </TabsTrigger>
          <TabsTrigger value="coins" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <Coins className="w-4 h-4" /> コイン購入
          </TabsTrigger>
          <TabsTrigger value="recovery" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <Key className="w-4 h-4" /> 復旧設定
          </TabsTrigger>
          <TabsTrigger value="speech" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3">
            <Volume2 className="w-4 h-4" /> 読み上げ
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-5">

          {/* KYC済みバッジ or 未確認メリット案内 */}
          {isKycVerified ? (
            <div className="bg-green-500/10 border-2 border-green-500/40 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-black text-green-300">🔵 本人確認済み</p>
                  <span className="text-[10px] bg-green-500/20 border border-green-500/40 text-green-300 px-2 py-0.5 rounded-full font-bold">verified バッジ表示中</span>
                </div>
                <p className="text-xs text-green-300/70">プロフィールに「🔵 本人確認済み」バッジが表示されています。ファンからの信頼度が高まります。</p>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <p className="font-black text-sm">本人確認をするメリット</p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { emoji: "🔵", title: "「本人確認済み」バッジ取得", desc: "プロフィールに青バッジが表示され、ファンからの信頼度がUP" },
                  { emoji: "💰", title: "収益の振込申請が可能に", desc: "本人確認なしでは振込申請ができません" },
                  { emoji: "🔒", title: "アカウントの安全性向上", desc: "不正利用の防止・アカウント復旧がスムーズに" },
                  { emoji: "🏆", title: "特集・上位表示の優遇", desc: "確認済みライバーは検索結果で優先表示される場合があります" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 bg-secondary/50 rounded-xl p-3">
                    <span className="text-xl shrink-0">{item.emoji}</span>
                    <div>
                      <p className="text-xs font-bold text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">↓ 下の「変更する」から氏名・住所・身分証を登録してください</p>
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">氏名・住所の変更には本人確認書類の提出が必須です。</p>
          </div>

          {!editingBasicInfo ? (
            <div className="space-y-4 bg-card rounded-xl border border-border/50 p-5">
              <div>
                <Label className="text-xs text-muted-foreground">メールアドレス</Label>
                <p className="text-sm font-semibold mt-1">{basicInfo.email}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">本名（非公開）</Label>
                <p className="text-sm font-semibold mt-1">{basicInfo.full_name || "未設定"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">住所（非公開）</Label>
                <p className="text-sm font-semibold mt-1">{basicInfo.address || "未設定"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">電話番号（非公開）</Label>
                <p className="text-sm font-semibold mt-1">{basicInfo.phone || "未設定"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">地域（公開）</Label>
                <p className="text-sm font-semibold mt-1">{basicInfo.region || "未設定"}</p>
              </div>
              <Button onClick={() => setEditingBasicInfo(true)} className="w-full gap-2 bg-primary hover:bg-primary/90">
                変更する
              </Button>
            </div>
          ) : (
            <div className="space-y-4 bg-card rounded-xl border border-border/50 p-5">
              <div className="space-y-2">
                <Label>メールアドレス</Label>
                <Input
                  type="email"
                  value={basicInfo.email}
                  onChange={(e) => setBasicInfo({ ...basicInfo, email: e.target.value })}
                  placeholder="user@example.com"
                  className="bg-secondary border-0"
                />
              </div>

              <div className="space-y-3 bg-secondary rounded-xl p-4 border border-border/50">
                <div>
                  <h3 className="font-bold mb-3">身分証による本人確認</h3>
                  <p className="text-xs text-muted-foreground mb-3">運転免許証・パスポート・マイナンバーカードのいずれかをアップロードしてください</p>
                  <label className="flex items-center justify-center h-24 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/60 transition-colors">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      disabled={saving}
                      onChange={(e) => e.target.files?.[0] && handleIdentityDocumentUpload(e.target.files[0])}
                    />
                    <div className="text-center">
                      {identityDocument.url ? (
                        <div className="flex flex-col items-center gap-1">
                          <Check className="w-5 h-5 text-green-400" />
                          <span className="text-xs font-semibold text-green-400">アップロード済み</span>
                          <span className={`text-xs mt-1 ${identityDocument.status === "approved" ? "text-green-400" : identityDocument.status === "rejected" ? "text-red-400" : "text-yellow-400"}`}>
                            {identityDocument.status === "approved" ? "✓ 承認済み" : identityDocument.status === "rejected" ? "✗ 却下" : "⏳ 審査中"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Upload className="w-5 h-5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">クリックしてファイルを選択</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  本名（非公開）
                  {basicInfo.full_name !== user.full_name && <span className="text-xs text-orange-400">※変更</span>}
                </Label>
                <Input
                  value={basicInfo.full_name}
                  onChange={(e) => { setBasicInfo({ ...basicInfo, full_name: e.target.value }); setFullNameChanged(e.target.value !== user.full_name); }}
                  placeholder="山田太郎"
                  className="bg-secondary border-0"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  住所（非公開）
                  {basicInfo.address !== user.address && <span className="text-xs text-orange-400">※変更</span>}
                </Label>
                <Input
                  value={basicInfo.address}
                  onChange={(e) => { setBasicInfo({ ...basicInfo, address: e.target.value }); setAddressChanged(e.target.value !== user.address); }}
                  placeholder="東京都渋谷区"
                  className="bg-secondary border-0"
                />
              </div>

              <div className="space-y-2">
                <Label>電話番号（非公開）</Label>
                <Input
                  type="tel"
                  value={basicInfo.phone}
                  onChange={(e) => setBasicInfo({ ...basicInfo, phone: e.target.value })}
                  placeholder="090-1234-5678"
                  className="bg-secondary border-0"
                />
              </div>

              <div className="space-y-2">
                <Label>地域（公開）</Label>
                <Input
                  value={basicInfo.region}
                  onChange={(e) => setBasicInfo({ ...basicInfo, region: e.target.value })}
                  placeholder="例: 東京、大阪、全国対応"
                  className="bg-secondary border-0"
                />
              </div>

              {(fullNameChanged || addressChanged) && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> 本人確認書類が必要です
                  </p>
                  {fullNameChanged && (
                    <div className="space-y-2">
                      <Label className="text-xs">本名確認書類（運転免許証・パスポート等）</Label>
                      <label className="flex items-center justify-center h-20 border-2 border-dashed border-orange-500/30 rounded-lg cursor-pointer hover:border-orange-500/60 transition-colors">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => setVerificationDocs({ ...verificationDocs, full_name_doc: e.target.files?.[0] || null })}
                        />
                        <div className="text-center">
                          {verificationDocs.full_name_doc ? (
                            <div className="flex items-center justify-center gap-1 text-orange-400">
                              <Check className="w-4 h-4" />
                              <span className="text-xs font-semibold">{verificationDocs.full_name_doc.name}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <Upload className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">ファイルを選択</span>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  )}
                  {addressChanged && (
                    <div className="space-y-2">
                      <Label className="text-xs">住所確認書類（住民票・公共料金領収書等）</Label>
                      <label className="flex items-center justify-center h-20 border-2 border-dashed border-orange-500/30 rounded-lg cursor-pointer hover:border-orange-500/60 transition-colors">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => setVerificationDocs({ ...verificationDocs, address_doc: e.target.files?.[0] || null })}
                        />
                        <div className="text-center">
                          {verificationDocs.address_doc ? (
                            <div className="flex items-center justify-center gap-1 text-orange-400">
                              <Check className="w-4 h-4" />
                              <span className="text-xs font-semibold">{verificationDocs.address_doc.name}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <Upload className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">ファイルを選択</span>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">書類は1営業日以内に確認されます。承認後に変更が反映されます。</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setEditingBasicInfo(false); setFullNameChanged(false); setAddressChanged(false); }} className="flex-1">
                  キャンセル
                </Button>
                <Button
                  onClick={handleSaveBasicInfo}
                  disabled={saving || (fullNameChanged && !verificationDocs.full_name_doc) || (addressChanged && !verificationDocs.address_doc)}
                  className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  保存する
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-5">
          {isKycVerified && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <p className="font-bold text-sm text-green-300">本人確認済み</p>
                <p className="text-xs text-green-300/70 mt-0.5">氏名・住所の確認が完了しています</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>プロフィール画像</Label>
            <label className="cursor-pointer block">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && handleAvatarUpload(e.target.files[0])}
                disabled={saving}
              />
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-dashed border-border hover:border-primary/50 transition-colors">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">クリックして画像を選択</p>
            </label>
          </div>

          <div className="space-y-2">
            <Label>ニックネーム（アカウント名）</Label>
            <Input
              value={profile.nickname}
              onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
              placeholder="表示名を入力"
              className="bg-secondary border-0"
            />
          </div>

          <div className="space-y-2">
            <Label>プロフィールコメント（最大200字）</Label>
            <Textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value.slice(0, 200) })}
              placeholder="自己紹介を入力"
              className="bg-secondary border-0 resize-none"
              rows={4}
            />
            <p className="text-xs text-muted-foreground text-right">{profile.bio.length}/200</p>
          </div>

          <div className="space-y-2">
            <Label>住所</Label>
            <Input
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              placeholder="住所を入力"
              className="bg-secondary border-0"
            />
          </div>

          <div className="space-y-2">
            <Label>電話番号</Label>
            <Input
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="電話番号を入力"
              className="bg-secondary border-0"
              type="tel"
            />
          </div>

          <Button onClick={handleSaveProfile} disabled={saving} className="w-full gap-2 bg-primary hover:bg-primary/90">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存する
          </Button>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-5">
          <div className="bg-card rounded-xl p-5 border border-border/50 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>自動サブスクリプションを有効にする</Label>
                <p className="text-xs text-muted-foreground mt-1">視聴者が月額でサブスクできるようにします</p>
              </div>
              <Switch
                checked={subscription.auto_subscribe_enabled}
                onCheckedChange={(v) => setSubscription({ ...subscription, auto_subscribe_enabled: v })}
              />
            </div>

            {subscription.auto_subscribe_enabled && (
              <div className="space-y-2">
                <Label>月額料金（円）</Label>
                <Input
                  type="number"
                  min={300}
                  step={100}
                  value={subscription.auto_subscribe_price}
                  onChange={(e) => setSubscription({ ...subscription, auto_subscribe_price: parseInt(e.target.value) || 3000 })}
                  className="bg-secondary border-0"
                />
                <p className="text-xs text-muted-foreground">デフォルト: ¥3,000/月</p>
              </div>
            )}
          </div>

          <Button onClick={handleSaveSubscription} disabled={saving} className="w-full gap-2 bg-primary hover:bg-primary/90">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存する
          </Button>
        </TabsContent>

        {/* Bank Tab */}
        <TabsContent value="bank" className="space-y-5">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-400">
            ⚠️ 振込手数料は実費負担となります。正確な口座情報を入力してください。
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>口座名義</Label>
              <Input
                value={bank.bank_account_name}
                onChange={(e) => setBank({ ...bank, bank_account_name: e.target.value })}
                placeholder="カナで入力"
                className="bg-secondary border-0"
              />
            </div>
            <div className="space-y-2">
              <Label>銀行名</Label>
              <Input
                value={bank.bank_name}
                onChange={(e) => setBank({ ...bank, bank_name: e.target.value })}
                placeholder="例: 三菱UFJ銀行"
                className="bg-secondary border-0"
              />
            </div>
            <div className="space-y-2">
              <Label>支店名</Label>
              <Input
                value={bank.bank_branch}
                onChange={(e) => setBank({ ...bank, bank_branch: e.target.value })}
                placeholder="支店名を入力"
                className="bg-secondary border-0"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label>口座種別</Label>
                <select
                  value={bank.bank_account_type}
                  onChange={(e) => setBank({ ...bank, bank_account_type: e.target.value })}
                  className="w-full h-9 rounded-md bg-secondary px-3 text-sm text-foreground border-0"
                >
                  <option value="普通">普通</option>
                  <option value="当座">当座</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>口座番号</Label>
                <Input
                  value={bank.bank_account_number}
                  onChange={(e) => setBank({ ...bank, bank_account_number: e.target.value })}
                  placeholder="7桁"
                  className="bg-secondary border-0"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={async () => {
              setSaving(true);
              // Save bank info to user's channel
              const channels = await base44.entities.Channel.filter({ owner_email: user.email });
              if (channels[0]) {
                await base44.entities.Channel.update(channels[0].id, {
                  bank_account_name: bank.bank_account_name,
                  bank_name: bank.bank_name,
                  bank_branch: bank.bank_branch,
                  bank_account_number: bank.bank_account_number,
                  bank_account_type: bank.bank_account_type,
                });
              }
              toast.success("銀行口座を保存しました");
              setSaving(false);
            }}
            disabled={saving}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存する
          </Button>
        </TabsContent>
        {/* Category/Tags Tab */}
        <TabsContent value="category" className="space-y-5">
          {/* 配信カテゴリ選択 */}
          <div className="bg-card rounded-xl p-5 border border-border/50 space-y-4">
            <div>
              <h3 className="font-bold mb-1">配信カテゴリ</h3>
              <p className="text-xs text-muted-foreground">あなたの配信スタイルを選択してください。カテゴリによって表示が変わります。</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "fortune", label: "🔮 占い", desc: "鑑定・占術系" },
                { value: "chat", label: "💬 雑談", desc: "トーク・交流系" },
                { value: "other", label: "✨ その他", desc: "音楽・趣味など" },
              ].map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setStreamCategory(cat.value)}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all text-center ${
                    streamCategory === cat.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 bg-secondary/50 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <span className="text-lg">{cat.label}</span>
                  <span className="text-[10px]">{cat.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 占い専用フィールド（ふわっと表示） */}
          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              streamCategory === "fortune"
                ? "max-h-[600px] opacity-100"
                : "max-h-0 opacity-0"
            }`}
          >
            <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/30 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔮</span>
                <div>
                  <h3 className="font-bold text-purple-300">占い師専用プロフィール</h3>
                  <p className="text-xs text-purple-300/70">入力した内容はプロフィールページに表示されます</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-purple-300">占術・得意な鑑定方法</Label>
                  <Input
                    value={fortuneFields.fortune_arts}
                    onChange={(e) => setFortuneFields({ ...fortuneFields, fortune_arts: e.target.value })}
                    placeholder="例：タロット・西洋占星術・四柱推命・数秘術"
                    className="bg-purple-500/10 border-purple-500/30 focus:border-purple-500/60"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-purple-300">鑑定実績・資格・経歴</Label>
                  <Textarea
                    value={fortuneFields.fortune_experience}
                    onChange={(e) => setFortuneFields({ ...fortuneFields, fortune_experience: e.target.value })}
                    placeholder="例：鑑定歴10年・延べ3,000名以上・占い師協会認定"
                    className="bg-purple-500/10 border-purple-500/30 focus:border-purple-500/60 resize-none"
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-purple-300">相談ジャンル</Label>
                  <Input
                    value={fortuneFields.fortune_genres}
                    onChange={(e) => setFortuneFields({ ...fortuneFields, fortune_genres: e.target.value })}
                    placeholder="例：恋愛・結婚・仕事・人間関係・転職"
                    className="bg-purple-500/10 border-purple-500/30 focus:border-purple-500/60"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 業種タグ */}
          <div className="bg-card rounded-xl p-5 border border-border/50 space-y-4">
            <div>
              <h3 className="font-bold mb-1">業種・タグ設定</h3>
              <p className="text-xs text-muted-foreground">検索で見つけてもらいやすくなります。</p>
            </div>
            <CategoryTagSelector value={channelTags} onChange={setChannelTags} />
          </div>
          <Button
            onClick={async () => {
              if (!channelId) { toast.error("チャンネルが見つかりません"); return; }
              setSaving(true);
              await base44.entities.Channel.update(channelId, {
                tags: channelTags,
                stream_category: streamCategory,
                // stream_category に連動して service_category を自動設定
                service_category: streamCategory === "fortune" ? "fortune_telling" : "other",
                fortune_arts: fortuneFields.fortune_arts,
                fortune_experience: fortuneFields.fortune_experience,
                fortune_genres: fortuneFields.fortune_genres,
              });
              toast.success("カテゴリ・タグを保存しました");
              setSaving(false);
            }}
            disabled={saving}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存する
          </Button>
        </TabsContent>
        {/* Call Settings Tab */}
        <TabsContent value="call" className="space-y-5">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm space-y-2">
            <p className="font-semibold flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-primary" /> 1対1ビデオ通話設定
            </p>
            <p className="text-xs text-muted-foreground">料金はあなた（配信者）が設定し、申込者が支払います。</p>
            <div className="text-xs space-y-0.5 text-muted-foreground">
              <p>• 料金は <span className="text-primary font-semibold">10分刻み・最大1時間（60分）</span> で設定</p>
              <p>• 最低料金：<span className="text-primary font-semibold">10分 ¥20以上</span>（例：30分=¥60以上、60分=¥120以上）</p>
              <p>• <span className="text-green-400 font-semibold">FREEプラン</span>：収益率 <span className="font-bold">70%</span>（手数料30%）</p>
              <p>• <span className="text-blue-400 font-semibold">BASICプラン</span>：収益率 <span className="font-bold">85%</span>（手数料15%）← <span className="text-yellow-400">推奨</span></p>
            </div>
          </div>

          {/* BASICプラン推奨バナー */}
          {user?.plan !== "basic" && user?.plan !== "call-anser" && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-2">
              <PhoneCall className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-400">BASICプランへのアップグレードを推奨</p>
                <p className="text-xs text-muted-foreground mt-0.5">FREEプランでは収益率70%ですが、BASICプラン（¥3,300/月）では<span className="text-blue-300 font-semibold">収益率85%</span>になります。月収が上がるほどお得です。</p>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl p-5 border border-border/50 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>通話受付を有効にする</Label>
                <p className="text-xs text-muted-foreground mt-0.5">ONにすると申し込みを受け付けます</p>
              </div>
              <Switch
                checked={callSettings.call_enabled}
                onCheckedChange={(v) => setCallSettings({ ...callSettings, call_enabled: v })}
              />
            </div>

            {callSettings.call_enabled && (
              <>
                {/* 10分刻み料金テーブル */}
                <div className="space-y-3 pt-2 border-t border-border/50">
                       <Label className="text-sm font-semibold">通話時間別料金設定（15分単位・最大2時間）</Label>
                       <p className="text-xs text-muted-foreground">最低 <span className="text-primary font-bold">500コイン / 15分</span>（1時間 = 2,000コイン〜）。15分単位のプリペイド自動課金です。</p>
                         <div className="grid grid-cols-2 gap-3">
                           {[15, 30, 45, 60, 75, 90, 105, 120].map((min) => {
                             const minPrice = Math.ceil(min / 15) * 500; // 500コイン/15分
                             const fieldKey = `call_price_${min}min`;
                             const currentVal = callSettings[fieldKey] || 0;
                             const revenueShare = (user?.plan === "basic" || user?.plan === "call-anser") ? 0.85 : 0.70;
                             const isValid = currentVal === 0 || currentVal >= minPrice;
                             return (
                               <div key={min} className="space-y-1">
                                 <Label className="text-xs text-muted-foreground">{min}分（最低{minPrice.toLocaleString()}コイン）</Label>
                                 <Input
                                   type="number"
                                   min={minPrice}
                                   step={50}
                                   value={currentVal || ""}
                                   onChange={(e) => setCallSettings({ ...callSettings, [fieldKey]: parseInt(e.target.value) || 0 })}
                                   placeholder={`${minPrice}〜`}
                                   className={`bg-secondary border-0 text-sm ${!isValid ? "ring-1 ring-destructive" : ""}`}
                                 />
                                 {currentVal > 0 && (
                                   <p className={`text-[10px] ${isValid ? "text-muted-foreground" : "text-destructive font-bold"}`}>
                                     {isValid
                                       ? `受取: ${Math.floor(currentVal * revenueShare).toLocaleString()}コイン（${Math.round(revenueShare * 100)}%）`
                                       : `⚠️ ${minPrice.toLocaleString()}コイン以上が必要`}
                                   </p>
                                 )}
                               </div>
                             );
                           })}
                         </div>
                         <p className="text-xs text-muted-foreground bg-secondary rounded-lg p-2">
                            ※ 空欄の時間帯は申込者が選択できません。 ※ 通話開始時に最初の15分分が即時消費されます。
                         </p>
                     </div>

                <div className="space-y-2 border-t border-border/50 pt-3">
                   <Label>通話テーマ（何の話をするのか）</Label>
                   <Input
                     value={callSettings.call_theme}
                     onChange={(e) => setCallSettings({ ...callSettings, call_theme: e.target.value })}
                     placeholder="例：キャリア相談、ビジネスコーチング、雑談など"
                     className="bg-secondary border-0"
                   />
                   <p className="text-xs text-muted-foreground">ホームページで表示されます。通話で何を相談・話題にするかを簡潔に入力してください。</p>
                 </div>

                <div className="space-y-2 border-t border-border/50 pt-3">
                   <Label>通話可能スケジュール</Label>
                   <Textarea
                     value={callSettings.call_available_dates}
                     onChange={(e) => setCallSettings({ ...callSettings, call_available_dates: e.target.value })}
                     placeholder={"例:\n毎週火・木 19:00〜22:00\n土日 10:00〜18:00\n※2日前までにチャットでご予約ください"}
                     className="bg-secondary border-0 resize-none"
                     rows={4}
                   />
                   <p className="text-xs text-muted-foreground">申込ページに表示されます。</p>
                 </div>
              </>
            )}
          </div>

          <Button
            onClick={async () => {
              if (!channelId) { toast.error("チャンネルが見つかりません"); return; }
              // バリデーション: 500コイン/15分
              const invalidFields = [15,30,45,60,75,90,105,120].filter((min) => {
                const val = callSettings[`call_price_${min}min`] || 0;
                const minPrice = Math.ceil(min / 15) * 500;
                return val > 0 && val < minPrice;
              });
              if (invalidFields.length > 0) {
                toast.error(`${invalidFields.join("分・")}分の料金が最低額（500コイン/15分）を下回っています`);
                return;
              }
              setSaving(true);
              await base44.entities.Channel.update(channelId, {
                call_enabled: callSettings.call_enabled,
                call_price_15min: callSettings.call_price_15min || 0,
                call_price_30min: callSettings.call_price_30min || 0,
                call_price_45min: callSettings.call_price_45min || 0,
                call_price_60min: callSettings.call_price_60min || 0,
                call_price_75min: callSettings.call_price_75min || 0,
                call_price_90min: callSettings.call_price_90min || 0,
                call_price_105min: callSettings.call_price_105min || 0,
                call_price_120min: callSettings.call_price_120min || 0,
                call_available_dates: callSettings.call_available_dates,
                call_theme: callSettings.call_theme,
              });
              toast.success("通話設定を保存しました");
              setSaving(false);
            }}
            disabled={saving}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存する
          </Button>
          </TabsContent>

          {/* Fanclub Tab */}
          <TabsContent value="fanclub" className="space-y-5">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-2">
            <Crown className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-yellow-300">ファンクラブ機能</p>
              <p className="text-xs text-yellow-200/70 mt-0.5">配信者の収益率は<strong>85%</strong>です。ChatMarketが15%を得ます。</p>
            </div>
          </div>

          <div className="space-y-4 bg-card rounded-xl border border-border/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <Label>ファンクラブを有効にする</Label>
                <p className="text-xs text-muted-foreground mt-0.5">ファンに月額メンバーシップを提供</p>
              </div>
              <Switch
                checked={fanclubSettings.fanclub_enabled}
                onCheckedChange={(v) => setFanclubSettings({ ...fanclubSettings, fanclub_enabled: v })}
              />
            </div>

            {fanclubSettings.fanclub_enabled && (
              <>
                <div className="space-y-2">
                  <Label>月額料金（円・税込）</Label>
                  <Input
                    type="number"
                    min={100}
                    step={100}
                    value={fanclubSettings.fanclub_monthly_price}
                    onChange={(e) => setFanclubSettings({ ...fanclubSettings, fanclub_monthly_price: parseInt(e.target.value) || 500 })}
                    className="bg-secondary border-0"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                      <p className="text-muted-foreground">配信者収益 (85%)</p>
                      <p className="font-black text-primary">¥{Math.floor((fanclubSettings.fanclub_monthly_price || 0) * 0.85).toLocaleString()}</p>
                    </div>
                    <div className="bg-secondary rounded-lg px-3 py-2">
                      <p className="text-muted-foreground">ChatMarket (15%)</p>
                      <p className="font-black text-muted-foreground">¥{Math.floor((fanclubSettings.fanclub_monthly_price || 0) * 0.15).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ファンクラブの説明・特典</Label>
                  <Textarea
                    value={fanclubSettings.fanclub_description}
                    onChange={(e) => setFanclubSettings({ ...fanclubSettings, fanclub_description: e.target.value })}
                    placeholder="会員限定生配信、アーカイブ動画見放題、専用チャットなど..."
                    className="bg-secondary border-0 resize-none"
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <Button
            onClick={async () => {
              if (!channelId) { toast.error("チャンネルが見つかりません"); return; }
              setSaving(true);
              await base44.entities.Channel.update(channelId, fanclubSettings);
              toast.success("ファンクラブ設定を保存しました");
              setSaving(false);
            }}
            disabled={saving}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存する
          </Button>
          </TabsContent>

          {/* Coin Purchase Tab */}
          <TabsContent value="coins" className="space-y-5">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-2">
              <Coins className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-yellow-300">エールコインを購入</p>
                <p className="text-xs text-yellow-200/70 mt-0.5">ライブ配信・ビデオ通話の視聴・応援に使えます。</p>
              </div>
            </div>
            <CoinPurchasePanel onSuccess={() => {}} />
          </TabsContent>

          {/* Account Recovery Tab */}
          <TabsContent value="recovery" className="space-y-5">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">メールアドレスやパスワード変更時に、登録した電話番号または予備メールで本人確認を行います。</p>
          </div>

          <div className="space-y-4 bg-card rounded-xl border border-border/50 p-5">
            <div className="space-y-2">
              <Label>予備メールアドレス</Label>
              <Input
                type="email"
                value={recoverySettings.backup_email}
                onChange={(e) => setRecoverySettings({ ...recoverySettings, backup_email: e.target.value })}
                placeholder="backup@example.com"
                className="bg-secondary border-0"
              />
              <p className="text-xs text-muted-foreground">メールアドレス変更時の本人確認に使用します。主メールとは異なるアドレスを推奨します。</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50">
              <Label>復旧用電話番号</Label>
              <Input
                type="tel"
                value={recoverySettings.recovery_phone}
                onChange={(e) => setRecoverySettings({ ...recoverySettings, recovery_phone: e.target.value })}
                placeholder="090-1234-5678"
                className="bg-secondary border-0"
              />
              <p className="text-xs text-muted-foreground">パスワード変更時のSMS確認に使用します。</p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300">
              ⚠️ 登録した連絡先は暗号化して保管されます。安全な環境で登録してください。
            </div>
          </div>

          <Button
            onClick={async () => {
              setSaving(true);
              await base44.auth.updateMe({
                backup_email: recoverySettings.backup_email,
                recovery_phone: recoverySettings.recovery_phone,
              });
              toast.success("アカウント復旧設定を保存しました");
              setSaving(false);
            }}
            disabled={saving}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存する
          </Button>
          </TabsContent>

          {/* Speech Settings Tab */}
          <TabsContent value="speech" className="space-y-5">
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-sm space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-primary" /> 配信中の読み上げ音声
              </p>
              <p className="text-xs text-muted-foreground">チャットとエール通知を読み上げる音声を選択できます（Web Speech API利用・無料）</p>
            </div>

            {voices.length > 0 ? (
              <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="voice-select" className="text-sm font-semibold">
                    音声を選択
                  </Label>
                  <select
                    id="voice-select"
                    value={selectedVoice?.name || ""}
                    onChange={(e) => {
                      const voice = voices.find((v) => v.name === e.target.value);
                      if (voice) setSelectedVoice(voice);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-input focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  >
                    {voices.map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={() => {
                    setTestSpeechLoading(true);
                    speak("これはテスト音声です。この声でチャットとエール通知が読み上げられます。");
                    setTimeout(() => setTestSpeechLoading(false), 3000);
                  }}
                  disabled={testSpeechLoading}
                  variant="outline"
                  className="w-full gap-2"
                >
                  {testSpeechLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      再生中...
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      テスト再生
                    </>
                  )}
                </Button>

                <div className="text-xs text-muted-foreground bg-secondary rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    選択した音声は自動保存されます。配信中のチャットやエール通知がこの声で読み上げられます。ライバーがカメラを見ていても、音で反応できるようになります。
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-300">音声が利用できません</p>
                  <p className="text-xs text-amber-200/70 mt-0.5">お使いのブラウザで利用可能な音声がありません。Chrome、Safari、Firefoxなど別のブラウザをお試しください。</p>
                </div>
              </div>
            )}
          </TabsContent>
          </Tabs>
          </div>
          );
          }