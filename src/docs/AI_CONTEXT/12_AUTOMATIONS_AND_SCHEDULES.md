# 12_AUTOMATIONS_AND_SCHEDULES.md
> **Document Name**: Automations and Schedules  
> **Generated At**: 2026-06-04T14:00:00+09:00  
> **Status**: authoritative  
> **Primary Source**: list_automations API から直接抽出（2026-06-04時点）  

---

## 稼働中 Scheduled Automations

| 名前 | 間隔 | 関数 | 最終実行 | 成功率 | 備考 |
|-----|-----|------|--------|-------|-----|
| ClassRoomタイムアウト参加者クリーンアップ | 5分毎 | cleanupTimedOutParticipants | 2026-06-04 | 347/348 | 稼働中 |
| Twilio Cost Monitor（毎日9時） | 毎日0:00 JST | checkTwilioCostAlert | 2026-06-04 | 24/24 | 稼働中 |
| 予約15分前リマインダー（5分ごと） | 5分毎 | appointmentReminder | 2026-06-04 | 8173/8177 | 稼働中 |

---

## 停止中・失敗中 Scheduled Automations

| 名前 | 状態 | 関数 | 失敗数 | 対応 |
|-----|-----|------|-------|-----|
| イベント開始15分前リマインダー | **停止（is_active=false）** | sendEventReminder | 5/5（全失敗） | 要調査・修正 |

---

## 稼働中 Entity Automations

| 名前 | エンティティ | イベント | 条件 | 関数 |
|-----|-----------|--------|-----|-----|
| 新規ユーザー登録 → 管理者にメール+アプリ内通知 | YellCoinWallet | create | — | notifyAdminNewUser |
| 占いカテゴリ選択時にBasicプラン自動付与 | Channel | create, update | data.stream_category="fortune" | grantBasicPlanForFortune |
| ライブ開始 → フォロワー即時通知 | LiveStream | update | data.status="live", changed_fields contains "status" | notifyFollowers |
| 占い師ライブ開始 → リピーターに通知 | LiveStream | update | data.status="live", changed_fields contains "status" | notifyFortuneRepeatListeners |

---

## その他 Automation（リストで確認済み・詳細省略）

onUserRegistered は User エンティティ create イベントで起動（list_automationsで確認）

---

## Automation 失敗時の影響

| Automation | 失敗時の影響 |
|-----------|------------|
| cleanupTimedOutParticipants | クラスルームに幽霊参加者が残り定員に影響 |
| appointmentReminder | 予約のリマインドメールが届かない |
| sendEventReminder（停止中） | イベント開始通知が送信されない |
| notifyFollowers | ライブ開始時のフォロワー通知が送信されない |
| grantBasicPlanForFortune | 占い師のBasicプラン自動付与が行われない |
| onUserRegistered | 新規ユーザーの初期化処理が実行されない（コイン・プラン付与なし）|

---

## スケジュール詳細（コードから確認済み関数）

### updateProgressiveRates
- 実行タイミング: 毎月1日 0:00 JST（スケジューラ設定未確認）
- 処理: 全チャンネルの前月収益からプログレッシブ還元率を計算・更新
- 影響: Channel.progressive_rate / monthly_revenue_coins / rate_applied_month

### resetDailyFreeCallQuota  
- 実行タイミング: 毎日 0:00 JST（スケジューラ設定未確認）
- 処理: call-anser プランユーザーの free_call_reset_date を today に更新
- フロント側: created_date >= today でカウントするため自動的にリセット扱い

### expireYellCoins
- 実行タイミング: 未確認（定期実行の設定を確認要）
- 処理: 購入日から180日超のエールコインを失効処理
- 未確認: 購入単位別失効か、一括残高管理か

### zombieStreamKiller
- 実行タイミング: 未確認
- 処理: status='live' だが長時間更新がない LiveStream を 'ended' に強制更新

---

## 注意事項

```
スケジュール時刻はユーザーのタイムゾーン（Asia/Tokyo）で設定。
Base44 内部では UTC に変換して保存。
JST 0:00 = UTC 15:00（前日）

Automationが失敗した場合:
  - 連続失敗数（consecutive_failures）が増加
  - 一定数連続失敗で自動停止（Base44の仕様）
  - ダッシュボードで確認・手動再起動が必要
``