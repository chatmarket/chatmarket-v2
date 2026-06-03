/**
 * createChimeMeeting — Amazon Chime SDK Meeting/Attendee 管理 + 参加者カウント管理
 *
 * POST payload:
 *   { action: "create", roomId }   → ホストが Meeting 作成 + 参加
 *   { action: "join",   roomId }   → 生徒がチケット認可後に参加（定員チェック付き）
 *   { action: "leave",  roomId }   → 退出（left_at 記録・カウント -1）
 *   { action: "heartbeat", roomId }→ last_seen_at 更新（ブラウザ生存確認用）
 *   { action: "delete", roomId }   → ホスト/管理者がクラス終了
 *
 * 【定員管理の設計】
 *  - participants 配列を唯一の真実（Source of Truth）として管理
 *  - 講師1名 + 生徒9名 = 上限10名（MAX_PARTICIPANTS = 10）
 *  - join 時: participants に未登録の場合のみ追加 → 重複防止（6）
 *  - Attendee 作成成功後に DB を更新 → カウントが先走りしない（1）
 *  - current_participants_count は participants 配列の active 件数から都度計算（原子的整合）
 *  - leave/heartbeat タイムアウトで -1（2,4）
 *  - delete 時は全員 left 扱いでカウント 0（7）
 *  - asServiceRole は認可チェック後の最小操作のみ（8）
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  DeleteMeetingCommand,
  GetMeetingCommand,
} from "npm:@aws-sdk/client-chime-sdk-meetings@3";

const CHIME_REGION = "us-east-1"; // Chime SDK Meetings は us-east-1 が必須
const MAX_PARTICIPANTS = 10;      // 講師1 + 生徒9
const HEARTBEAT_TIMEOUT_MS = 90_000; // 90秒応答なし → タイムアウト退出

// ---- AWS Chime クライアント（環境変数のみ・フロント非露出）----
function buildChimeClient() {
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("aws_config");
  }
  return new ChimeSDKMeetingsClient({
    region: CHIME_REGION,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// ---- ユーザー向け日本語エラーメッセージ ----
const MESSAGES = {
  unauthorized:        "ログインが必要です。",
  room_not_found:      "クラスルームが見つかりません。URLを確認してください。",
  not_host:            "この操作はホスト（講師）のみ実行できます。",
  ticket_required:     "このクラスへの参加にはチケットの購入が必要です。",
  meeting_not_started: "講師がまだクラスを開始していません。しばらくお待ちください。",
  meeting_ended:       "このクラスはすでに終了しています。",
  room_full:           `クラスの定員（${MAX_PARTICIPANTS}名）に達しています。`,
  aws_config:          "サーバー設定エラーです。管理者にお問い合わせください。",
  unknown_action:      "不明なアクションです。",
  internal:            "サーバーエラーが発生しました。時間をおいて再試行してください。",
};
const msg = (code) => MESSAGES[code] || MESSAGES.internal;

// ---- participants 配列から active 人数を計算（left_at なし = アクティブ）----
function countActive(participants) {
  return (participants || []).filter((p) => !p.left_at).length;
}

// ---- heartbeat タイムアウト参加者を退出扱いにして配列を返す ----
function evictTimedOut(participants) {
  const now = Date.now();
  return (participants || []).map((p) => {
    if (p.left_at) return p; // すでに退出済み
    const lastSeen = p.last_seen_at ? new Date(p.last_seen_at).getTime() : new Date(p.joined_at).getTime();
    if (now - lastSeen > HEARTBEAT_TIMEOUT_MS) {
      return { ...p, left_at: new Date().toISOString(), exit_reason: "timeout" };
    }
    return p;
  });
}

Deno.serve(async (req) => {
  try {
    // ---- 認証 ----
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: msg("unauthorized") }, { status: 401 });

    const { action, roomId } = await req.json();
    if (!roomId) return Response.json({ error: "roomId が指定されていません。" }, { status: 400 });

    // ---- ルーム取得（asServiceRole は認可後の最小操作のみ）----
    const rooms = await base44.asServiceRole.entities.ClassRoom.filter({ id: roomId });
    const room = rooms[0];
    if (!room) return Response.json({ error: msg("room_not_found") }, { status: 404 });

    const isHost = room.host_user_id === user.id || room.host_email === user.email;
    const isAdmin = user.role === "admin";

    // ---- Chime クライアント（action=heartbeat/leave は Chime 操作不要）----
    let chime = null;
    if (action === "create" || action === "join" || action === "delete") {
      try { chime = buildChimeClient(); }
      catch (_) { return Response.json({ error: msg("aws_config") }, { status: 500 }); }
    }

    // =========================================
    // action: "heartbeat" — last_seen_at 更新
    // =========================================
    if (action === "heartbeat") {
      const now = new Date().toISOString();
      // タイムアウト退出者を先にクリーン
      const cleaned = evictTimedOut(room.participants);
      const updated = cleaned.map((p) =>
        p.email === user.email && !p.left_at ? { ...p, last_seen_at: now } : p
      );
      const activeCount = countActive(updated);
      await base44.asServiceRole.entities.ClassRoom.update(roomId, {
        participants: updated,
        current_participants_count: activeCount,
      });
      return Response.json({ ok: true, current_participants_count: activeCount });
    }

    // =========================================
    // action: "leave" — 退出（カウント -1、left_at 記録）
    // =========================================
    if (action === "leave") {
      const updated = (room.participants || []).map((p) =>
        p.email === user.email && !p.left_at
          ? { ...p, left_at: new Date().toISOString(), exit_reason: "voluntary" }
          : p
      );
      const activeCount = countActive(updated);
      await base44.asServiceRole.entities.ClassRoom.update(roomId, {
        participants: updated,
        current_participants_count: activeCount,
      });
      return Response.json({ ok: true, current_participants_count: activeCount });
    }

    // =========================================
    // action: "create" — Meeting 作成（ホスト専用）
    // =========================================
    if (action === "create") {
      if (!isHost) return Response.json({ error: msg("not_host") }, { status: 403 });

      const now = new Date().toISOString();

      // 既存 Meeting が生きているか確認（再接続対応）
      if (room.chime_meeting_id) {
        try {
          const res = await chime.send(new GetMeetingCommand({ MeetingId: room.chime_meeting_id }));
          if (res.Meeting) {
            const attendeeRes = await chime.send(new CreateAttendeeCommand({
              MeetingId: room.chime_meeting_id,
              ExternalUserId: user.email.slice(0, 64),
            }));
            // ホストの last_seen_at を更新
            const participants = (room.participants || []).map((p) =>
              p.email === user.email ? { ...p, last_seen_at: now, left_at: null } : p
            );
            await base44.asServiceRole.entities.ClassRoom.update(roomId, {
              participants,
              current_participants_count: countActive(participants),
            });
            return Response.json({ meeting: res.Meeting, attendee: attendeeRes.Attendee });
          }
        } catch (_) { /* Meeting 消滅済み → 新規作成へ */ }
      }

      // 新規 Meeting 作成
      const meetingRes = await chime.send(new CreateMeetingCommand({
        ClientRequestToken: `${roomId}-${Date.now()}`,
        MediaRegion: CHIME_REGION,
        ExternalMeetingId: roomId.slice(0, 64),
        MeetingFeatures: {
          Video: { MaxResolution: "HD" },
          Audio: { EchoReduction: "AVAILABLE" },
        },
      }));
      const meeting = meetingRes.Meeting;

      // ホスト Attendee 追加
      const attendeeRes = await chime.send(new CreateAttendeeCommand({
        MeetingId: meeting.MeetingId,
        ExternalUserId: user.email.slice(0, 64),
      }));

      // ホストを participants に登録（重複防止: 6）
      const existing = (room.participants || []).filter((p) => p.email !== user.email);
      const hostEntry = {
        email: user.email,
        name: user.full_name || user.email,
        role: "host",
        joined_at: now,
        last_seen_at: now,
        left_at: null,
      };
      const participants = [...existing, hostEntry];

      await base44.asServiceRole.entities.ClassRoom.update(roomId, {
        chime_meeting_id: meeting.MeetingId,
        status: "active",
        started_at: now,
        participants,
        current_participants_count: countActive(participants),
      });

      return Response.json({ meeting, attendee: attendeeRes.Attendee });
    }

    // =========================================
    // action: "join" — 既存 Meeting に参加（生徒）
    // =========================================
    if (action === "join") {
      // ホスト再入室は join ではなく create と同じパス
      if (isHost) {
        if (!room.chime_meeting_id) return Response.json({ error: msg("meeting_not_started") }, { status: 425 });
        let meeting;
        try {
          const res = await chime.send(new GetMeetingCommand({ MeetingId: room.chime_meeting_id }));
          meeting = res.Meeting;
        } catch (_) { return Response.json({ error: msg("meeting_ended") }, { status: 410 }); }
        const attendeeRes = await chime.send(new CreateAttendeeCommand({
          MeetingId: room.chime_meeting_id,
          ExternalUserId: user.email.slice(0, 64),
        }));
        return Response.json({ meeting, attendee: attendeeRes.Attendee });
      }

      // ---- 4. 生徒チケット認可（認可チェック後に最小限の情報のみ参照）----
      const tickets = await base44.asServiceRole.entities.SchoolTicket.filter({
        session_id: roomId,
        student_email: user.email,
        status: "active",
      });
      if (!tickets || tickets.length === 0) {
        return Response.json({ error: msg("ticket_required") }, { status: 403 });
      }

      // Meeting 存在確認
      if (!room.chime_meeting_id) return Response.json({ error: msg("meeting_not_started") }, { status: 425 });
      let meeting;
      try {
        const res = await chime.send(new GetMeetingCommand({ MeetingId: room.chime_meeting_id }));
        meeting = res.Meeting;
      } catch (_) { return Response.json({ error: msg("meeting_ended") }, { status: 410 }); }

      // ---- タイムアウト退出者を先にクリーン ----
      const cleaned = evictTimedOut(room.participants);

      // ---- 6. 重複チェック（同一ユーザーの既存アクティブエントリを除外して再登録）----
      const alreadyActive = cleaned.find((p) => p.email === user.email && !p.left_at);

      // ---- 5 & 1. 定員チェックは Attendee 作成前に実施（同時入室競合への最善策）----
      // 既存アクティブでなければ人数確認
      if (!alreadyActive) {
        const activeCount = countActive(cleaned);
        if (activeCount >= MAX_PARTICIPANTS) {
          return Response.json({ error: msg("room_full") }, { status: 409 });
        }
      }

      // ---- Attendee 作成（認可完了後）----
      const attendeeRes = await chime.send(new CreateAttendeeCommand({
        MeetingId: room.chime_meeting_id,
        ExternalUserId: user.email.slice(0, 64),
      }));

      // ---- 1. Attendee 作成成功後に DB を更新（カウントが先走りしない）----
      const now = new Date().toISOString();
      const withoutMe = cleaned.filter((p) => p.email !== user.email);
      const guestEntry = {
        email: user.email,
        name: user.full_name || user.email,
        role: "guest",
        joined_at: alreadyActive?.joined_at || now,
        last_seen_at: now,
        left_at: null,
      };
      const participants = [...withoutMe, guestEntry];
      const activeCount = countActive(participants);

      await base44.asServiceRole.entities.ClassRoom.update(roomId, {
        participants,
        current_participants_count: activeCount,
      });

      // 7. 認可済みユーザーにのみ返却（AWS 認証情報は含まない）
      return Response.json({ meeting, attendee: attendeeRes.Attendee });
    }

    // =========================================
    // action: "delete" — Meeting 削除・クラス終了
    // =========================================
    if (action === "delete") {
      if (!isHost && !isAdmin) return Response.json({ error: msg("not_host") }, { status: 403 });

      if (room.chime_meeting_id) {
        try {
          await chime.send(new DeleteMeetingCommand({ MeetingId: room.chime_meeting_id }));
        } catch (e) {
          console.warn("[createChimeMeeting] DeleteMeeting (may already be deleted):", e.message);
        }
      }

      // 7. 全員 left 扱い・カウント 0
      const now = new Date().toISOString();
      const allLeft = (room.participants || []).map((p) =>
        p.left_at ? p : { ...p, left_at: now, exit_reason: "meeting_deleted" }
      );
      await base44.asServiceRole.entities.ClassRoom.update(roomId, {
        status: "ended",
        ended_at: now,
        chime_meeting_id: null,
        participants: allLeft,
        current_participants_count: 0,
      });

      return Response.json({ ok: true, message: "クラスを終了しました。" });
    }

    return Response.json({ error: msg("unknown_action") }, { status: 400 });

  } catch (error) {
    console.error("[createChimeMeeting] Unhandled error:", error);
    return Response.json({ error: msg("internal") }, { status: 500 });
  }
});