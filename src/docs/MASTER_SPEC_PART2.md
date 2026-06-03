# ChatMarket マスター仕様書 v1.0 - PART2: 全フロー詳細
> 生成日: 2026-06-03 | PART1（エンティティ・プラン・コイン）の続き

---

# 1. 1対1ビデオ通話フロー（完全版）

## インフラ
```
映像・音声:   WebRTC P2P（ブラウザ直接接続）★ Chime不使用
シグナリング: Base44 Entities（VideoCall）リアルタイム購読 + 500msポーリング
ICE(STUN):   Google STUN x2（stun.l.google.com:19302, stun1.l.google.com:19302）
ICE(TURN):   Twilio NTS（getTwilioIceServers → TTL 86400秒）
  Twilio APIへのPOST: POST /2010-04-01/Accounts/{SID}/Tokens.json  body: Ttl=86400
  → { ice_servers: [...] } から turn: で始まるサーバーのみ抽出して使用
  失敗時フォールバック: Google STUNのみ（FALLBACK_ICE_SERVERS）
```

## RTCPeerConnection設定（確定・変更禁止）

```javascript
new RTCPeerConnection({
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    ...twilioServers.filter(s => s.urls.toString().startsWith("turn:")),
  ],
  iceTransportPolicy: "all",        // P2P優先・TURN自動フォールバック
  bundlePolicy:       "max-bundle", // 帯域効率化
  rtcpMuxPolicy:      "require",    // RTCP多重化
  iceCandidatePoolSize: 10,
})
```

## タイムアウト定数（変更禁止）

```
ICE_GATHER_TIMEOUT_MS    = 8000   ICE収集待機（モバイル考慮）
CALLEE_READY_TIMEOUT_MS  = 15000  Callee ready待機
ANSWER_TIMEOUT_MS        = 30000  Answer待機
OFFER_TIMEOUT_MS         = 30000  Offer待機
POLL_INTERVAL_MS         = 500    ポーリング間隔
MAX_RETRIES              = 3      最大リトライ回数
リトライ遅延              = 試行番号 × 2000ms（2秒/4秒/6秒）
```

## VideoCall ステータス遷移

```
pending    申し込み直後
accepted   ライバー承諾 or AUTO_ACCEPT
active     WebRTC接続開始・課金開始
ended      正常終了 / 残高不足 / 時間切れ
declined   ライバー拒否
cancelled  発信者キャンセル
```

## Phase 1: 通話申し込み

```
発信者が /call-request/:channelId へ
  Channel.call_enabled === false → 申し込み不可

時間決定（getEffectiveDuration）優先順:
  1. ミリオネア期間（2026-04-01〜2026-06-30）→ 強制15分
  2. channel.default_call_duration_minutes > 0 → ライバー設定値
  3. プラン別デフォルト（free/basic/call-anser 全て15分）

VideoCall.create({
  caller_email, caller_name,
  callee_email, callee_name, callee_channel_id,
  call_mode: "video" | "audio_only",
  duration_minutes, coin_price_per_15min,
  recording_option,  // trueなら通話終了時+100コイン
  status: "pending"
})
```

## Phase 2: 承諾

```
【MANUALモード（default）】
  ライバーが着信を確認（VideoCall.subscribe or 3秒ポーリング）
  承諾: VideoCall.update({ status: "accepted" })
  拒否: VideoCall.update({ status: "declined" }) → navigate(-1)

【AUTO_ACCEPTモード】
  フロントが autoAcceptCall({ call_id }) を呼び出し
  バックエンド(autoAcceptCall):
    Channel.filter({ owner_email: call.callee_email })
    channel.incoming_call_mode === "AUTO_ACCEPT"
    → VideoCall.update({ status: "accepted" })
  フロント: accepted 確認後 → VideoCall.update({ status:"active" }) → refetch

発信者(Caller)が accepted を検知（countdownStartedRef.current === false）:
  VideoCall.update({ status:"active" })
  countdown 3→2→1→null（3秒カウントダウン表示）
```

## Phase 3: WebRTC接続（useWebRtcCall）

```
★ call.status === "active" かつ localStream あり かつ user ありの場合に起動

【発信者（Caller）のフロー】

A. シグナリングデータをリセット（再試行に備える）
   VideoCall.update({
     webrtc_offer:null, webrtc_answer:null,
     webrtc_ice_candidates_broadcaster:null,
     webrtc_ice_candidates_viewer:null,
     webrtc_callee_ready:null
   })

B. Callee の ready フラグを待つ（最大15秒）
   3種の並列監視:
     1. 即時チェック: VideoCall.filter({ id }) で webrtc_callee_ready 確認
     2. リアルタイム購読: VideoCall.subscribe → webrtc_callee_ready をリッスン
     3. ポーリング: 500ms間隔でVideoCall.filterを繰り返す
   いずれかで ready確認 or 15秒タイムアウト → 次へ（タイムアウトでも継続）

C. ICEサーバー取得（並列実行済み）
   fetchTwilioIceServers() → base44.functions.invoke("getTwilioIceServers", {})
   失敗 → FALLBACK_ICE_SERVERS（Google STUNのみ）

D. RTCPeerConnection 作成（上記設定）

E. ローカルトラックを追加
   call_mode === "audio_only": localStream.getAudioTracks() のみ
   通常: localStream.getTracks() 全て
   tracks.forEach(track => pc.addTrack(track, localStream))

F. Offer作成
   pc.createOffer({ offerToReceiveAudio:true, offerToReceiveVideo:true })
   pc.setLocalDescription(offer)
   waitForIceGathering(pc):
     pc.iceGatheringState === "complete" → resolve
     icegatheringstatechange で "complete" → resolve
     8秒タイムアウト → resolve（収集済み候補で進む）
   SDP内の a=candidate 件数をログ（0件なら警告）

G. Offer送信
   VideoCall.update({ webrtc_offer: JSON.stringify(pc.localDescription) })

H. Answer待ち（最大30秒）
   リアルタイム購読 + 500msポーリング の並列監視
   Answer受信: pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(answer)))
   30秒タイムアウト: scheduleRetry(attemptNum, "Answer timeout")

---

【着信者（Callee）のフロー】

A. readyフラグと既存Offerを並列取得
   Promise.all([
     VideoCall.update({ webrtc_callee_ready: true }),
     VideoCall.filter({ id: call.id })
   ])

B. 既にOfferが存在する → 即座にhandleOffer実行（待機ゼロ）

C. Offerがない → リアルタイム購読 + 500msポーリング で最大30秒待機

D. handleOffer（Offer受信時）
   pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerJson)))
   pc.createAnswer()
   pc.setLocalDescription(answer)
   waitForIceGathering(pc)（最大8秒）
   VideoCall.update({ webrtc_answer: JSON.stringify(pc.localDescription) })

---

【接続失敗時のリトライ（scheduleRetry）】
  cleanedUpRef.current === true → リトライしない
  next = lastAttempt + 1
  next > 3 → reportStatus("give_up") → onReconnectFailed() → toast.error
  next <= 3 → setTimeout(attemptConnection(next), next × 2000ms)

【接続状態コールバック（pc.onconnectionstatechange）】
  "connected"    → onReconnected()
  "failed"       → onReconnecting() → scheduleRetry
  "disconnected" → onReconnecting()（一時的・回復待ち）
```

## Phase 4: 音声・映像の再生

```
リモートトラック受信（pc.ontrack）:
  audio: track.enabled = true（強制ON）
  video + audio: event.streams[0] を videoEl.srcObject にセット
  streams[0] の全audioTrackを enabled=true

playRemoteVideo(videoEl):
  Step1: muted=false, volume=1.0 で play() 試行（PC Chrome等）
  Step2: 失敗（iOS Safari autoplay制限）→ muted=true で play()
         500ms後 → muted=false, volume=1.0

リモート音声ガード（1秒間隔 setInterval）:
  stream.getAudioTracks().forEach: !track.enabled → track.enabled=true
  videoEl.muted === true → muted=false, volume=1.0

AudioContext自動復旧:
  ctx.state === "suspended" → ctx.resume()
  visibilitychange → "visible" → ctx.resume()
  ctx.statechange → "suspended" → ctx.resume()

無音検知アラート（ローカルマイク監視）:
  AudioContext + AnalyserNode（fftSize:256）で localStream 監視
  5秒間（約300フレーム）連続ゼロレベル → showMicAlert=true
  ユーザークリック → ctx.resume() → silenceCountRef=0

ミュート状態DB同期（500ms デバウンス）:
  micOn変化 → setTimeout(500ms) → VideoCall.update({
    caller_muted: !micOn  // 発信者
    callee_muted: !micOn  // 着信者
  })
  → 相手画面の RemoteMuteIndicator に即時反映
```

## Phase 5: 課金フロー（videoCallBilling）

```
フロントから action:"tick" を毎分呼び出す（通話中・発信者のみ）

【課金プラン判定（getCallerPlanConfig）- tick毎に動的実行】
  PlanSubscription.filter({ user_email:callerEmail, status:"active" })
  basic or call-anser あり
    → { plan:"basic", min_coins:150, creator_rate:0.85, platform_rate:0.15 }
  それ以外
    → { plan:"free",  min_coins:200, creator_rate:0.70, platform_rate:0.30 }

【action:"tick" - 初回（billing_started_at === null）】
  getCallerPlanConfig → planCfg
  YellCoinWallet.filter({ user_email:caller_email }) → wallet
  wallet.balance < planCfg.min_coins:
    VideoCall.update({ auto_disconnected:true, status:"ended" })
    → { success:false, reason:"insufficient_balance", auto_disconnected:true }
  充足 → chargeOneUnit(base44, call, wallet, unitNumber=1, now, planCfg):
    coinsToCharge = planCfg.min_coins         // 150 or 200
    creatorCoins  = floor(min_coins × creator_rate) // 127 or 140
    platformCoins = min_coins - creatorCoins         // 23 or 60
    nextBillingAt = now + 15分
    
    YellCoinWallet.update({
      balance:    wallet.balance - coinsToCharge,
      total_sent: wallet.total_sent + coinsToCharge,
    })
    YellCoinTransaction.create({
      user_email:caller_email, type:"send", service_type:"direct_chat",
      service_id:call.id, amount:coinsToCharge,
      target_name:call.callee_name, channel_id:call.callee_channel_id,
      message:"1対1ビデオ通話（第1ユニット）ライバー85% / Admin15% [basicプラン]"
    })
    Channel.monthly_revenue_coins += coinsToCharge  // ミリオネア集計
  
  VideoCall.update({
    billing_started_at:now.toISOString(),
    next_billing_at:nextBillingAt.toISOString(),
    billing_interval_count:1,
    coins_consumed:coinsToCharge,
    platform_revenue_coins:platformCoins,
    creator_revenue_coins:creatorCoins,
  })
  → { success:true, billed:true, unit:1, next_billing_at, balance_after }

【action:"tick" - 次回課金タイムチェック】
  next_billing_at > now → billed:false（課金なし）

【action:"tick" - 15分経過（next_billing_at <= now）】
  残高チェック:
    不足: VideoCall.update({ auto_disconnected:true, status:"ended", ... })
    充足: chargeOneUnit（同じ処理・unitNumber=billing_interval_count+1）
    VideoCall.update({
      next_billing_at:newNextBillingAt.toISOString(),
      billing_interval_count:unitNumber,
      coins_consumed:旧+coinsToCharge,
      creator_revenue_coins:旧+creatorCoins,
      platform_revenue_coins:旧+platformCoins,
    })

【action:"end" - 通話終了】
  billingStart から actualMinutes = ceil((now - billing_started_at) / 60000)
  consumedCoins = call.coins_consumed

  録画オプション処理（recording_option === true）:
    追加コスト = 100コイン（固定・変更禁止）
    callerWallet.balance >= 100:
      YellCoinWallet.update({ balance-=100, total_sent+=100 })
      YellCoinTransaction.create({ amount:100, message:"録画オプション追加料金: 100コイン" })
      consumedCoins += 100
      VideoCall.update({ recording_infra_cost_yen:100, recording_option_price:100 })
    < 100: 残高不足 → スキップ（警告ログのみ）

  収益分配確定（getCalleePlanConfig で終了時のプランで計算）:
    creatorRevenueCoins  = floor(consumedCoins × creator_rate)
    platformRevenueCoins = consumedCoins - creatorRevenueCoins
    commCostYen = ceil(actualMinutes × 2（TURN_COST_PER_MIN）× 0.20（1-P2P_SUCCESS_RATE）)
    platformProfitYen = platformRevenueCoins - commCostYen

  VideoCall.update({
    status:"ended", actual_duration_minutes:actualMinutes,
    comm_cost_yen:commCostYen, platform_profit_yen:profitYen,
    platform_revenue_coins, creator_revenue_coins, coins_consumed,
  })

【action:"check_next" - 残高確認（課金なし）】
  getCallerPlanConfig → planCfg
  YellCoinWallet.filter({ user_email:caller_email }) → balance
  → { balance, plan, next_unit_cost:planCfg.min_coins, has_enough:balance>=min_coins }

【フロントの残高警告タイミング（毎秒 setInterval）】
  secs <= 180 かつ > 60 かつ 未警告: check_next → has_enough=false → 警告トースト
  secs <= 60 かつ 未警告: "次の課金まで1分前" トースト
  secs === 0: chargeAlertShownRef=false（リセット）
```

## Phase 6: 通話終了

```
発信者が終了ボタン:
  videoCallBilling({ call_id, action:"end" })
  localStream.getTracks().forEach(t => t.stop())
  navigate(-1)

着信者が終了:
  VideoCall.update({ status:"ended" })
  extension_request_status === "accepted" → ReconnectionNotification 表示

時間切れ（remainingSeconds === 0）:
  loss_time_buffer_until チェック:
    Date.now() < bufferUntil → タイマー継続（延長決済待機中）
  バッファなし or 期限切れ → handleEndCall(true)

残高不足自動切断（auto_disconnected=true）:
  showInsufficientModal=true（コインチャージ誘導モーダル）

WebRTC切断クリーンアップ:
  pc.getSenders() の全sender を removeTrack
  pc.close()
  ★ Twilioのトラフィック課金を防ぐ（ICEセッション解放）

アイドルカテゴリ かつ ライバー（callee）が終了:
  ChekiCallEndBanner を表示（デジタルチェキ購入促進）
```

## 通話延長フロー

```
1. ライバー（callee）が延長リクエスト
   requestCallExtension({ callId, extensionMinutes, extensionCoins })
   バックエンド:
     callee === user.email 確認（403）
     VideoCall.update({
       extension_request_minutes:extensionMinutes,
       extension_request_coins:extensionCoins,
       extension_request_status:"pending",
       extension_requested_at:now,
     })

2. 発信者（caller）がモーダルで承諾
   extension_request_status==="pending" を VideoCallポーリングで検知
   acceptCallExtension({ call_id })
   → コイン残高チェック + 仮押さえ
   → VideoCall.update({ extension_request_status:"accepted", extension_accepted_at:now,
                         loss_time_buffer_until:now+バッファ })

3. ライバー（callee）が確定
   extension_request_status==="accepted" を検知
   confirmCallExtension({ call_id })
   → VideoCall.update({
       duration_minutes: 既存+extension_request_minutes,
       extension_request_status:"confirmed",
       extension_confirmed_at:now,
     })
   → フロント: callStartTime=Date.now()でタイマーリセット
```

---

# 2. ライブ配信フロー（完全版）

## IVSチャンネルプロビジョニング（provisionChannelStreamKey）

```
呼び出し条件: チャンネルオーナー or admin（以外は403）
既にキー設定済み → 既存キーをそのまま返す（is_new:false）

初回プロビジョニング:
  Step1: AWS IVS CreateChannelCommand({
    name: "channel-{channel_id}-{timestamp}",
    type: "STANDARD", latencyMode: "LOW"
  })
  → { arn:channelArn, ingestEndpoint, playbackUrl }

  Step2: ListStreamKeysCommand({ channelArn })
       → streamKeys[0].arn
       → GetStreamKeyCommand({ arn }) → streamKey.value

  Step3: Channel.update({
    ivs_channel_arn:channelArn, ivs_stream_key:streamKey,
    ivs_ingest_endpoint:ingestEndpoint, ivs_playback_url:playbackUrl,
    ivs_provisioned_at:now,
  })

  返却: { stream_key, ingest_endpoint, playback_url, is_new:true,
          rtmps_url:"rtmps://{ingestEndpoint}:443/app/{streamKey}" }
  ★ AWS認証情報（accessKeyId等）は絶対に返さない
```

## 配信開始フロー

```
クリエイターが /go-live にアクセス
→ createLiveStream({ title, price, stream_type:"ivs", channel_id })
→ LiveStream.create({ status:"scheduled", ... })

OBSまたはブラウザで RTMPS配信開始:
  接続先: rtmps://{ivs_ingest_endpoint}:443/app/{ivs_stream_key}

ivsSessionWebhook（IVS → バックエンド）:
  IVS_WEBHOOK_SECRET でHMAC署名検証
  stream_start: LiveStream.update({ status:"live", started_at:now })
               Channel.update({ is_live:true })
  stream_end:   LiveStream.update({ status:"ended", ended_at:now })
               Channel.update({ is_live:false })

detectIvsStreamStart（定期ポーリング）:
  IVS GetStream APIでストリーム状態を確認（Webhook漏れ補完）

zombieStreamKiller（定期実行）:
  LiveStream.status==="live" かつ ended_atから一定時間経過
  → is_live:false に強制更新
```

## 有料ライブ視聴フロー

```
1. 視聴者が有料ライブページへ
2. LivePreviewLockout（30秒プレビュー・変更禁止コンポーネント）
3. プレビュー終了 → チケット購入モーダル
4. createLiveTicketCheckout → Stripe Checkout
5. liveTicketWebhook:
   LiveStream.ticket_purchases に追加
   LiveStream.ticket_total_revenue_yen += price_yen
6. 購入確認 → getIvsPlaybackUrl → 視聴開始
7. consumeCoinsForViewing（15分毎）:
   残高 < price → 402 → 視聴停止
   充足:
     YellCoinWallet.update({ balance-=price, total_sent+=price })
     YellCoinTransaction.create({ service_type:"live_viewing", service_id:stream_id })
   ★ テストアカウント（ono@onestep-corp.com）は自動スキップ
```

## 配信料金・画質連動ルール

```
コイン/15分    画質     
15〜54        480p SD  （MIN_COINS_PER_15MIN=15）
55〜149       720p HD
150〜         1080p FHD

トップライバー（cumulative_revenue >= 1000万円）:
  最低価格: 200コイン/15分（TOP_LIVER_MIN_COINS_PER_15MIN=200）
```

---

# 3. VOD動画販売フロー（完全版）

## アップロードフロー

```
Step1: checkUsageLimit → allowed:false で中断（2時間超）

Step2: uploadVideoToS3({ fileName, fileSize, channelId })
  S3キー: channels/{channelId}/{timestamp}-{fileName}
  Presigned PUT URL（有効期限15分）
  CloudFront URL: https://{CLOUDFRONT_DOMAIN}/{s3_key}
  → { presigned_url, s3_key, playback_url }

Step3: フロントが Presigned URLに直接 PUT
  fetch(presigned_url, { method:"PUT", body:videoFile,
                         headers:{ "Content-Type":file.type } })

Step4: サムネイル
  base44.integrations.Core.UploadFile({ file:thumbnailFile }) → { file_url }

Step5: Video.create({
  title, description, video_url:playback_url, thumbnail_url,
  channel_id, price, is_free, category, duration,
  moderation_status: "pending",  ← ★審査待ち・公開されない
})

Step6: 管理者が /admin/video-moderation で審査
  pending → approved: 公開（視聴・検索可能）
  pending → rejected: 非公開（moderation_noteに却下理由）
```

## 再生フロー

```
Video.filter({ id }) → moderation_status !== "approved" → 非表示

無料動画（is_free=true or price=0）:
  getSignedVideoUrl({ videoKey, expirationHours:6 }):
    policy = JSON.stringify({
      Statement:[{ Resource:"https://{CLOUDFRONT_DOMAIN}/{videoKey}",
                   Condition:{ DateLessThan:{ "AWS:EpochTime":now+6時間 } } }]
    })
    policy_b64 = base64url(policy)
    signature  = RSASSA-PKCS1-v1_5 / SHA-1（CLOUDFRONT_PRIVATE_KEY使用）
    URL = "https://{CLOUDFRONT_DOMAIN}/{videoKey}?Policy={}&Signature={}&Key-Pair-Id={}"
  → videoタグで再生

有料動画（未購入）:
  30秒プレビュー（usePreview30SecLock）:
    video.currentTime >= 30 → video.pause() → PaywallOverlay 表示
    "SAMPLE"ウォーターマーク常時
  Preview30SecPaywallModal: コイン購入 or Stripe決済に誘導

有料動画（購入済み）:
  Purchase.filter({ item_type:"video", item_id, buyer_email, status:"completed" })
  → 存在 → getSignedVideoUrl（6時間有効）→ 再生

視聴カウント:
  WatchHistory.create, Video.update({ view_count+1 })（debounce処理）
```

---

# 4. クラス配信フロー（1対9・完全版）

## 設計原則
```
最大参加者: 10名（講師1 + 生徒9）← 絶対変更禁止
インフラ: AWS Chime SDK Meetings（us-east-1）
認可: SchoolTicket（session_id=roomId・status=active）+ invite_code（6桁）
ハートビート: 30秒毎・90秒無応答で自動退出
チケット消費: クラス終了時（action:"delete"）→ status:"active" → "used"
```

## クラス作成（講師）

```
/classroom/create にアクセス
→ ClassRoom.create({
     room_name, host_user_id, host_email, host_name, channel_id,
     status:"waiting", max_participants:10,
     invite_code: ランダム6桁英数字
   })
→ 招待リンク: /classroom/{id}?code={invite_code}
```

## Meeting作成（講師入室・action:"create"）

```
バックエンド認証:
  base44.auth.me() → なければ401
  ClassRoom.filter({ id:roomId }) → なければ404
  isHost = host_user_id===user.id or host_email===user.email（以外は403）
  status==="ended" → 410 room_not_active

既存chime_meeting_idの再接続確認:
  GetMeetingCommand → 生存: 既存Meeting + CreateAttendee → participants更新 → 返却
  消滅（例外）: 新規Meeting作成へ

新規Meeting作成:
  CreateMeetingCommand({
    ClientRequestToken:"{roomId}-{Date.now()}",
    MediaRegion:"us-east-1",
    ExternalMeetingId:roomId（先頭64文字）,
    MeetingFeatures:{
      Video:{ MaxResolution:"HD" },
      Audio:{ EchoReduction:"AVAILABLE" }
    }
  })
  CreateAttendeeCommand({ MeetingId, ExternalUserId:user.email（先頭64文字）})

ClassRoom.update({
  chime_meeting_id:meeting.MeetingId, status:"active", started_at:now,
  participants:[{ email, name, role:"host", chime_attendee_id:attendee.AttendeeId,
                  external_user_id:user.email, joined_at:now, last_seen_at:now, left_at:null }],
  current_participants_count:1,
})

返却: { meeting, attendee }（★AWS認証情報は絶対に含めない）
```

## 生徒入室（action:"join"）- 7ステップ競合対策

```
【フロント事前チェック（補助的）】
  認証確認: base44.auth.isAuthenticated() → false → redirectToLogin()
  ClassRoom取得 → なければ room_not_found 画面
  status==="ended" → room_not_active 画面
  invite_code !== URL.code → invite_invalid 画面
  blocked_participant_emails.includes(user.email) → blocked 画面
  SchoolTicket.filter({ session_id:roomId, student_email, status:"active" })
  → なし → ticketRequired 画面（/school-tickets へ誘導）

【バックエンド（createChimeMeeting action:"join"）】
  ★ バックエンドで全て再検証（フロントは補助に過ぎない）
  
  0. 認証確認（なければ401）
  1. status==="ended" → 410 room_not_active
  2. isHost の場合 → 再接続処理（GetMeeting → CreateAttendee → 返却）
  
  生徒の場合:
  3. invite_code 再検証（バックエンドで必ず実施）
     room.invite_code あり かつ !== inviteCode → 403 invite_invalid
  4. blocked_participant_emails.includes(user.email) → 403 blocked
  5. SchoolTicket 認可（asServiceRole で DB直参照）
     filter({ session_id:roomId, student_email:user.email, status:"active" })
     → なし → 403 ticket_required
  6. chime_meeting_id なし → 425 meeting_not_started
  7. GetMeetingCommand で Meeting存在確認
     → 存在しない → 410 meeting_ended

  evictTimedOut(participants):
    left_at なし かつ (now - last_seen_at > 90000ms)
    → { ...p, left_at:now, exit_reason:"timeout" }
  
  countActive(participants):
    participants.filter(p => !p.left_at).length

  【7ステップ競合対策】
  Step1: ClassRoom再取得（fresh1）
         cleaned = evictTimedOut(fresh1.participants)
         
  Step2: active人数計算 + 自分が既にいるか確認
         alreadyActive = cleaned.find(p => p.email===user.email && !p.left_at)
         activeCountBefore = countActive(cleaned)
         
  Step3: Attendee作成前の定員チェック
         !alreadyActive && activeCountBefore >= 10 → 409 room_full
         
  Step4: CreateAttendeeCommand（認可・定員確認後に実行）
         attendeeId = attendee.AttendeeId
  
  Step5: DB更新直前に再取得（並行入室対策）
         fresh2 = 再取得
         cleaned2 = evictTimedOut(fresh2.participants)
         alreadyActive2 = cleaned2.find(...)
         activeCountBefore2 = countActive(cleaned2)
         !alreadyActive2 && activeCountBefore2 >= 10
           → safeDeleteAttendee(chime, meetingId, attendeeId)
           → 409 room_full

  Step6: DB更新（chime_attendee_id を必ず含める）
         participants = [...cleaned2.filter(p => p.email!==user.email), {
           email, name, role:"guest",
           chime_attendee_id:attendeeId,
           external_user_id:user.email,
           joined_at:alreadyActive2?.joined_at || now,
           last_seen_at:now, left_at:null,
         }]
         ClassRoom.update({ participants, current_participants_count:countActive(participants) })

  Step7: DB更新後の最終確認
         fresh3 = 再取得
         countActive(fresh3.participants) > 10:
           fixedParticipants = fresh3.participants.map:
             p.email===user.email && !p.left_at → left_at:now, exit_reason:"capacity_rollback"
           ClassRoom.update({ fixedParticipants })
           safeDeleteAttendee(chime, meetingId, attendeeId)
           → 409 room_full

  返却: { meeting, attendee }（AWS認証情報は含めない）
```

## ハートビート処理（action:"heartbeat"）

```
フロントから30秒毎に呼び出し（beforeunloadで leave も送信）
status==="ended" → 冪等でok:trueを返す

  cleaned = evictTimedOut(room.participants)
  updated = cleaned.map: p.email===user.email && !p.left_at → { ...p, last_seen_at:now }
  ClassRoom.update({ participants:updated, current_participants_count:countActive(updated) })
```

## 強制退出（action:"kick"）・クラス終了（action:"delete"）

```
【kick（ホスト/Admin専用）】
  isHost or isAdmin 確認（以外403）
  target = participants.find({ email:targetEmail, left_at:null })
  safeDeleteAttendee(chime, meetingId, target.chime_attendee_id)（失敗は握り潰し）
  participants: p.email===targetEmail && !p.left_at → left_at:now, exit_reason:"kicked"
  blocked_participant_emails に targetEmail を追加（重複防止）
  ClassRoom.update({ participants, current_participants_count, blocked_participant_emails })

【delete（ホスト/Admin専用）】
  DeleteMeetingCommand({ MeetingId:chime_meeting_id })（失敗は警告ログのみ）
  全参加者: left_at:now, exit_reason:"meeting_deleted"
  ClassRoom.update({
    status:"ended", ended_at:now, chime_meeting_id:null,
    participants:allLeft, current_participants_count:0,
  })
  SchoolTicket処理:
    filter({ session_id:roomId, status:"active" }) → 全件
    → update({ status:"used", used_at:now })
```

---

# 5. チャット鑑定フロー（占い師向け・完全版）

```
2往復4通で自動クローズ
試し（1往復）: 無料・試し返信はマスク表示（60文字プレビュー）
本番（2往復目）: channel.fortune_chat_price コイン（デフォルト500コイン）

Step1: /fortune-chat/:channelId にアクセス
  FortuneChatThread.filter({ channel_id, user_email })
  初回: create({ status:"trial", message_count:0, ticket_price_coins:500 })

Step2: ユーザーが最初のメッセージ
  FortuneChatMessage.create({ role:"user", is_trial_reply:false, is_masked:false })
  FortuneChatThread.update({ message_count:1 })

Step3: 占い師が試し返信
  FortuneChatMessage.create({
    role:"fortune_teller",
    is_trial_reply:true,   ← マスク対象フラグ
    is_masked:true,         ← 未購入時は●●●●●表示（60文字プレビュー）
    preview_chars:60,
  })
  FortuneChatThread.update({ message_count:2 })

Step4: ユーザーがチケット購入（続きを読む）
  残高チェック >= ticket_price_coins（500）
  不足 → コインチャージ誘導
  充足:
    YellCoinWallet.update({ balance-=500, total_sent+=500 })
    YellCoinTransaction.create({ type:"send", amount:500, service_type:"fortune_chat" })
    FortuneChatThread.update({ ticket_purchased:true, status:"active", ticket_purchased_at:now })
    → is_trial_reply=true のメッセージの is_masked が false に → 全文表示

Step5: 残り1往復（2メッセージ）
  ユーザー返信: message_count → 3
  占い師返信: message_count → 4 → status:"closed"（自動クローズ）

Step6: 終了後レビュー（任意）
  FortuneReview.create({ rating:1〜5, comment, tags[] })
  Channel.update({ avg_rating:(avg×count+rating)/(count+1), review_count+1 })
```

---

# 6. Stripe決済フロー（完全版）

## 決済種別マトリクス

| 用途 | 関数 | Webhook関数 | Secret |
|------|------|------------|--------|
| コイン購入 | createCoinCheckoutSession | stripeWebhook | STRIPE_WEBHOOK_SECRET |
| 動画購入 | createCheckoutSession | stripeWebhook | STRIPE_WEBHOOK_SECRET |
| ライブチケット | createLiveTicketCheckout | liveTicketWebhook | STRIPE_WEBHOOK_SECRET |
| イベントチケット | createEventTicketCheckout | eventTicketWebhook | STRIPE_WEBHOOK_SECRET |
| ファンクラブ定期 | createFanclubCheckout | fanclubWebhook | STRIPE_FANCLUB_WEBHOOK_SECRET |
| グッズ・デジタル商品 | createProductCheckout | productWebhook | STRIPE_WEBHOOK_SECRET |
| デジタルチェキ | createProductCheckout | productWebhook | STRIPE_WEBHOOK_SECRET |
| クラウドファンディング | createCrowdfundingCheckoutV2 | crowdfundingDonationWebhook | STRIPE_WEBHOOK_SECRET |
| KYC手数料 | createKycFeeCheckout | stripeWebhook | STRIPE_WEBHOOK_SECRET |

## Stripe Webhook 署名検証（2種類）

```javascript
// 方式1: HMAC-SHA256 手動検証（stripeWebhook）
// ★ Deno の WebCrypto は非同期のため crypto.subtle を使用
const parts = signature.split(",")
const timestampPart = parts[0].split("=")[1]
const signaturePart = parts[1].split("=")[1]
const signedData = `${timestampPart}.${body}`
const key = await crypto.subtle.importKey("raw", encoder.encode(webhookSecret),
  { name:"HMAC", hash:"SHA-256" }, false, ["verify"])
const sigBytes = new Uint8Array(signaturePart.match(/.{1,2}/g).map(b => parseInt(b,16)))
const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(signedData))
// isValid === false → 401

// 方式2: Stripe SDK（fanclubWebhook, productWebhook, liveTicketWebhook）
import Stripe from 'npm:stripe@14.21.0'
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"))
// ★ Deno は非同期なので constructEventAsync を使う（constructEvent は同期でDenoで動かない）
const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
```

## ファンクラブ Webhook（fanclubWebhook）

```
STRIPE_FANCLUB_WEBHOOK_SECRET で Stripe SDK 署名検証

customer.subscription.created / updated:
  metadata: { base44_user_email, channel_id, tier }
  PlanSubscription.filter({ user_email, plan_id:"sanctum_{channel_id}" })
  → なし: create({ plan_id:"sanctum_{channel_id}", plan_name:"sanctum_{tier}", status:"active" })
  → あり: update({ plan_name, status, stripe_subscription_id, end_date })

customer.subscription.deleted:
  → PlanSubscription.update({ status:"cancelled", end_date:now })
```

## 商品購入 Webhook（productWebhook）

```
checkout.session.completed:
  metadata: { order_id, product_id, buyer_email, is_digital, delivery_mode }

  deliveryStatus:
    is_digital !== "1"              → "not_applicable"（物理商品）
    delivery_mode === "custom_order"→ "pending_delivery"（手動納品待ち）
    else                            → "not_applicable"（instant: file_url既存）

  ProductOrder.update(order_id, {
    status:"completed",
    delivery_status:deliveryStatus,
    download_expires_at: (is_digital && !custom_order) ? now+1年 : null,
  })
  Product.sold_count += 1
  LINE Notify通知（LINE_NOTIFY_TOKEN があれば）: グッズ購入通知
```

## ライブチケット Webhook（liveTicketWebhook）

```
checkout.session.completed:
  metadata: { stream_id, user_email, duration_minutes, price_yen }
  LiveStream.ticket_purchases に追加
  LiveStream.ticket_total_revenue_yen += price_yen
```

---

# 7. バックエンド関数完全一覧

| 関数名 | 認証 | 用途 |
|--------|------|------|
| onUserRegistered | EntityAutomation | 新規登録時初期化 |
| videoCallBilling | user | 通話課金（tick/end/check_next）|
| createChimeMeeting | user | Chime Meeting管理（クラス配信専用）|
| cleanupTimedOutParticipants | scheduler | クラス参加者タイムアウト退出 |
| uploadVideoToS3 | user | S3 Presigned PUT URL生成 |
| getSignedVideoUrl | user | CloudFront署名付きURL（VOD再生）|
| generateSignedCloudFrontUrl | user | CloudFront署名付きURL（録画再生）|
| generateCloudFrontUrl | user | CloudFront署名付きURL（汎用）|
| checkUsageLimit | user | 日次2時間利用制限チェック |
| checkUploadEligibility | user | アップロード資格チェック |
| addCoinsToUser | admin | コイン付与 |
| stripeWebhook | Stripe署名 | Stripe一般Webhook処理 |
| createCoinCheckoutSession | user | コイン購入Checkout |
| createCheckoutSession | user | 動画購入Checkout |
| createFanclubCheckout | user | ファンクラブCheckout |
| fanclubWebhook | Stripe署名（SDK）| ファンクラブWebhook |
| createFanclubPortal | user | Stripe Billing Portal |
| createProductCheckout | user | 商品購入Checkout |
| productWebhook | Stripe署名（SDK）| 商品Webhook + LINE通知 |
| createEventTicketCheckout | user | イベントチケットCheckout |
| eventTicketWebhook | Stripe署名 | イベントチケットWebhook |
| createLiveTicketCheckout | user | ライブチケットCheckout |
| liveTicketWebhook | Stripe署名（SDK）| ライブチケットWebhook |
| createCrowdfundingCheckoutV2 | user | クラウドファンディング決済 |
| crowdfundingDonationWebhook | Stripe署名 | クラウドファンディングWebhook |
| createConnectAccount | user | Stripe Connect口座作成 |
| stripeConnectWebhook | Stripe署名 | Stripe ConnectWebhook |
| verifyTicket | user | チケットQRコード検証 |
| getProductDownloadUrl | user | デジタル商品DLリンク生成（S3署名）|
| consumeCoinsForViewing | user | ライブ視聴コイン消費 |
| provisionChannelStreamKey | user/admin | IVSチャンネル・ストリームキー発行 |
| ivsSessionWebhook | IVS署名 | IVSセッション開始/終了Webhook |
| detectIvsStreamStart | scheduler | IVSストリーム状態ポーリング |
| checkIvsStreamStatus | user | IVSストリーム状態確認 |
| healthCheckIvsChannel | scheduler | IVSチャンネルヘルスチェック |
| forceReprovisionIvsChannel | admin | IVSチャンネル強制再作成 |
| refreshIvsStreamKey | admin | IVSストリームキー更新 |
| enableIvsAutoArchive | admin | IVS自動アーカイブ有効化 |
| createLiveStream | user | ライブ配信セッション作成 |
| zombieStreamKiller | scheduler | ゾンビLiveStream強制終了 |
| cleanupStaleIvsChannels | scheduler | 古いIVSチャンネル削除 |
| getIvsPlaybackUrl | user | IVS再生URL取得 |
| liveStreamCostTracker | scheduler | ライブ配信コスト集計 |
| getTwilioIceServers | user | Twilio NTS ICEサーバー取得（WebRTC用）|
| processPurchase | user | 購入処理・支払い計算 |
| updateProgressiveRates | scheduler/admin | プログレッシブ還元率更新（月次）|
| calcMonthlyRevenueRate | scheduler | 月間収益率計算 |
| resetDailyFreeCallQuota | scheduler | 無料通話枠日次リセット |
| autoAcceptCall | user | 通話自動承諾（AUTO_ACCEPTモード）|
| requestCallExtension | user（callee）| 通話延長申請 |
| acceptCallExtension | user（caller）| 通話延長承諾 |
| confirmCallExtension | user（callee）| 通話延長確定 |
| filterCommentNgWord | user | チャットNGワードフィルタ |
| moderateContent | system | コンテンツモデレーション（AI）|
| notifyFollowers | system | フォロワー通知 |
| notifyAdminNewUser | system | 管理者通知（新規登録）|
| notifyLineAdminSale | system | LINE管理者通知（販売）|
| notifyFortuneRepeatListeners | system | 占い師リピート通知 |
| appointmentReminder | scheduler | 予約リマインダー |
| sendEventReminder | scheduler | イベントリマインダー |
| campaignAutoGrant | scheduler | CampaignLiveGrantee自動付与 |
| detectGiantKilling | scheduler | ミリオネア上位ライバー検知 |
| expireYellCoins | scheduler | 期限切れエールコイン処理 |
| grantBasicPlanForFortune | admin | 占い師向けBasicプラン付与 |
| forumPost | user | フォーラム投稿処理 |
| adminGetAllUsers | admin | 全ユーザー一覧取得 |
| grantAdminAccess | admin | 管理者権限付与 |
| setAdminRole | admin | ユーザーロール変更 |
| trackLogs | system | ログ記録 |
| generateSitemap | scheduler | サイトマップ生成 |
| generateSitemapDynamic | scheduler | 動的サイトマップ生成 |
| getChannelInfo | user | チャンネル情報取得 |
| minorSafetyAlert | system | 未成年安全アラート |
| setupGeminiLiveWaiting | system | Gemini Live待機セットアップ |
| loadTestBot | admin | 負荷テストBot |
| createKycFeeCheckout | user | KYC手数料Checkout |
| createTestPaymentSession | admin | テスト決済セッション |
| getStripeBalance | admin | Stripe残高確認 |
| checkTwilioCostAlert | scheduler | TwilioコストアラートCheck |

---

*PART1とPART2を合わせてChatMarketの完全仕様書です。*  
*コードに変更があった場合は必ず本文書を更新してください。*
*生成日: 2026-06-03 コードベースから直接生成*