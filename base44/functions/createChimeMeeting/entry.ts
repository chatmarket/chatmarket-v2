/**
 * createChimeMeeting — Amazon Chime SDK Meeting/Attendee 管理
 *
 * POST payload:
 *   { action: "create", roomId }        → ホストが Meeting 作成 + Attendee 追加
 *   { action: "join",   roomId }        → 生徒が既存 Meeting に参加（チケット認可あり）
 *   { action: "delete", roomId }        → ホストが Meeting 削除（クラス終了）
 *
 * 【セキュリティ要件】
 *  1. 認証済みユーザーのみ処理
 *  2. roomId 必須・存在チェック
 *  3. create: host_user_id 一致チェック
 *  4. join:   SchoolTicket (session_id=roomId, status=active, student_email) 確認
 *  5. 未認可 → 403 返却、Attendee 未作成
 *  6. 最大参加人数10名超 → 409 返却
 *  7. Meeting/Attendee 情報は認可済みユーザーにのみ返却
 *  8. AWS 認証情報は環境変数のみ・フロント未露出
 *  9. delete アクションで DeleteMeeting + DB 更新
 * 10. 各エラー時にユーザー向け日本語メッセージを返却
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  DeleteMeetingCommand,
  GetMeetingCommand,
  ListAttendeesCommand,
} from "npm:@aws-sdk/client-chime-sdk-meetings@3";

// ---- Chime がサポートするリージョン（東京 → バージニアへフォールバック）----
// Chime SDK Meetings は現時点で ap-northeast-1 未サポートのため us-east-1 を使用
const CHIME_REGION = "us-east-1";

// ---- AWS クライアント（環境変数のみ使用・フロントへ非露出）----
function buildChimeClient() {
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS認証情報が設定されていません。管理者にお問い合わせください。");
  }
  return new ChimeSDKMeetingsClient({
    region: CHIME_REGION,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// ---- ユーザーフレンドリーなエラーメッセージマッピング ----
function userMessage(code, detail) {
  const map = {
    unauthorized:    "ログインが必要です。",
    room_not_found:  "クラスルームが見つかりません。URLを確認してください。",
    not_host:        "この操作はホスト（講師）のみ実行できます。",
    ticket_required: "このクラスへの参加にはチケットの購入が必要です。",
    meeting_not_started: "講師がまだクラスを開始していません。しばらくお待ちください。",
    meeting_ended:   "このクラスはすでに終了しています。",
    room_full:       "クラスの定員（10名）に達しています。",
    aws_config:      "サーバー設定エラーです。管理者にお問い合わせください。",
    unknown_action:  "不明なアクションです。",
    internal:        `サーバーエラーが発生しました: ${detail || ""}`,
  };
  return map[code] || map.internal;
}

Deno.serve(async (req) => {
  try {
    // ---- 1. 認証済みチェック ----
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: userMessage("unauthorized") }, { status: 401 });
    }

    // ---- 2. リクエストパース + roomId 必須チェック ----
    const body = await req.json();
    const { action, roomId } = body;
    if (!roomId) {
      return Response.json({ error: "roomId が指定されていません。" }, { status: 400 });
    }

    // ---- 2. ルーム存在チェック ----
    const rooms = await base44.asServiceRole.entities.ClassRoom.filter({ id: roomId });
    const room = rooms[0];
    if (!room) {
      return Response.json({ error: userMessage("room_not_found") }, { status: 404 });
    }

    const isHost = room.host_user_id === user.id || room.host_email === user.email;

    // ---- AWS Chime クライアント初期化 ----
    let chime;
    try {
      chime = buildChimeClient();
    } catch (e) {
      return Response.json({ error: userMessage("aws_config") }, { status: 500 });
    }

    // =========================================
    // action: "create" — 新規 Meeting 作成（ホスト専用）
    // =========================================
    if (action === "create") {
      // 3. ホスト認可チェック
      if (!isHost) {
        return Response.json({ error: userMessage("not_host") }, { status: 403 });
      }

      // 既存 Meeting が生きているか確認
      if (room.chime_meeting_id) {
        try {
          const existing = await chime.send(new GetMeetingCommand({ MeetingId: room.chime_meeting_id }));
          if (existing.Meeting) {
            const attendeeRes = await chime.send(new CreateAttendeeCommand({
              MeetingId: room.chime_meeting_id,
              ExternalUserId: user.email.slice(0, 64),
            }));
            return Response.json({ meeting: existing.Meeting, attendee: attendeeRes.Attendee });
          }
        } catch (_) {
          // Meeting 消滅済み → 新規作成へ
        }
      }

      // 新規 Meeting 作成
      const meetingRes = await chime.send(new CreateMeetingCommand({
        ClientRequestToken: `${roomId}-${Date.now()}`,
        MediaRegion: CHIME_REGION,
        ExternalMeetingId: roomId.slice(0, 64),
        MeetingFeatures: {
          Video: { MaxResolution: "HD" },   // 720p
          Audio: { EchoReduction: "AVAILABLE" },
        },
      }));
      const meeting = meetingRes.Meeting;

      // ホスト Attendee 追加
      const attendeeRes = await chime.send(new CreateAttendeeCommand({
        MeetingId: meeting.MeetingId,
        ExternalUserId: user.email.slice(0, 64),
      }));

      // DB に Meeting ID を保存（サービスロール使用）
      await base44.asServiceRole.entities.ClassRoom.update(roomId, {
        chime_meeting_id: meeting.MeetingId,
        status: "active",
        started_at: new Date().toISOString(),
      });

      // 7. 認可済みユーザーにのみ返却（AWS 内部キーは含まない）
      return Response.json({ meeting, attendee: attendeeRes.Attendee });
    }

    // =========================================
    // action: "join" — 既存 Meeting に参加（生徒）
    // =========================================
    if (action === "join") {
      // ホストは create を使う。join はゲスト専用。
      if (isHost) {
        // ホストが再入室する場合は create と同じフローで処理
        if (!room.chime_meeting_id) {
          return Response.json({ error: userMessage("meeting_not_started") }, { status: 425 });
        }
        let meeting;
        try {
          const res = await chime.send(new GetMeetingCommand({ MeetingId: room.chime_meeting_id }));
          meeting = res.Meeting;
        } catch (_) {
          return Response.json({ error: userMessage("meeting_ended") }, { status: 410 });
        }
        const attendeeRes = await chime.send(new CreateAttendeeCommand({
          MeetingId: room.chime_meeting_id,
          ExternalUserId: user.email.slice(0, 64),
        }));
        return Response.json({ meeting, attendee: attendeeRes.Attendee });
      }

      // ---- 4. 生徒: SchoolTicket 購入済みチェック（サービスロールで参照）----
      const tickets = await base44.asServiceRole.entities.SchoolTicket.filter({
        session_id: roomId,
        student_email: user.email,
        status: "active",
      });
      if (!tickets || tickets.length === 0) {
        return Response.json({ error: userMessage("ticket_required") }, { status: 403 });
      }

      // Meeting 存在チェック
      if (!room.chime_meeting_id) {
        return Response.json({ error: userMessage("meeting_not_started") }, { status: 425 });
      }
      let meeting;
      try {
        const res = await chime.send(new GetMeetingCommand({ MeetingId: room.chime_meeting_id }));
        meeting = res.Meeting;
      } catch (_) {
        return Response.json({ error: userMessage("meeting_ended") }, { status: 410 });
      }

      // ---- 6. 最大参加人数チェック（10名上限）----
      const maxParticipants = room.max_participants || 10;
      const currentCount = room.current_participants_count || 0;
      if (currentCount >= maxParticipants) {
        return Response.json({ error: userMessage("room_full") }, { status: 409 });
      }

      // ---- Attendee 追加（認可済み）----
      const attendeeRes = await chime.send(new CreateAttendeeCommand({
        MeetingId: room.chime_meeting_id,
        ExternalUserId: user.email.slice(0, 64),
      }));

      // DB: 参加者カウント更新
      const participants = room.participants || [];
      const alreadyIn = participants.some((p) => p.email === user.email);
      if (!alreadyIn) {
        await base44.asServiceRole.entities.ClassRoom.update(roomId, {
          participants: [
            ...participants,
            { email: user.email, name: user.full_name || user.email, joined_at: new Date().toISOString(), role: "guest" },
          ],
          current_participants_count: currentCount + 1,
        });
      }

      // 7. 認可済みユーザーにのみ返却
      return Response.json({ meeting, attendee: attendeeRes.Attendee });
    }

    // =========================================
    // action: "delete" — Meeting 削除（クラス終了）
    // =========================================
    if (action === "delete") {
      // 9. ホスト + admin のみ許可
      const isAdmin = user.role === "admin";
      if (!isHost && !isAdmin) {
        return Response.json({ error: userMessage("not_host") }, { status: 403 });
      }

      if (room.chime_meeting_id) {
        try {
          await chime.send(new DeleteMeetingCommand({ MeetingId: room.chime_meeting_id }));
        } catch (e) {
          // すでに削除済みなら無視
          console.warn("[createChimeMeeting] DeleteMeeting error (may already be deleted):", e.message);
        }
      }

      await base44.asServiceRole.entities.ClassRoom.update(roomId, {
        status: "ended",
        ended_at: new Date().toISOString(),
        chime_meeting_id: null,
        participants: [],
        current_participants_count: 0,
      });

      return Response.json({ success: true, message: "クラスを終了しました。" });
    }

    // unknown action
    return Response.json({ error: userMessage("unknown_action") }, { status: 400 });

  } catch (error) {
    console.error("[createChimeMeeting] Unhandled error:", error);
    // 10. ユーザー向けメッセージ + 詳細はサーバーログのみ
    return Response.json(
      { error: userMessage("internal", error.name || "") },
      { status: 500 }
    );
  }
});