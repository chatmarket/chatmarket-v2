/**
 * createChimeMeeting — Amazon Chime SDK Meeting/Attendee 管理（本番版）
 *
 * actions:
 *   create    — 講師が Meeting 作成・参加
 *   join      — 生徒がチケット + invite_code 認可後に参加（7ステップ競合対策）
 *   leave     — 自発的退出（left_at 記録・カウント -1）
 *   heartbeat — last_seen_at 更新（90秒無応答で自動退出）
 *   kick      — 講師/管理者が生徒を強制退出・再入室禁止
 *   delete    — 講師/管理者がクラス終了（SchoolTicket → used）
 *
 * 設計方針:
 *   - participants 配列が唯一の Source of Truth
 *   - chime_attendee_id を participants に保存（kick/rollback で使用）
 *   - 認可チェック完了後に asServiceRole で最小限の操作のみ実施
 *   - AWS 認証情報はレスポンスに絶対含めない
 *   - エラーは error_code（機械判定用）+ message（UI表示用）で返却
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  DeleteMeetingCommand,
  DeleteAttendeeCommand,
  GetMeetingCommand,
} from "npm:@aws-sdk/client-chime-sdk-meetings@3";

const CHIME_REGION = "us-east-1";
const MAX_PARTICIPANTS = 10;        // 講師1 + 生徒9
const HEARTBEAT_TIMEOUT_MS = 90_000; // 90秒無応答 → タイムアウト退出

// ---- AWS クライアント（環境変数のみ・フロント非露出）----
function buildChimeClient() {
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  if (!accessKeyId || !secretAccessKey) throw new Error("aws_config");
  return new ChimeSDKMeetingsClient({
    region: CHIME_REGION,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// ---- エラーレスポンス定義（error_code + message）----
const ERRORS = {
  unauthorized:        { status: 401, code: "unauthorized",        message: "ログインが必要です。" },
  room_not_found:      { status: 404, code: "room_not_found",      message: "クラスルームが見つかりません。" },
  not_host:            { status: 403, code: "not_host",            message: "この操作はホスト（講師）のみ実行できます。" },
  invite_invalid:      { status: 403, code: "invite_invalid",      message: "招待コードが正しくありません。" },
  ticket_required:     { status: 403, code: "ticket_required",     message: "有効なチケットがありません。" },
  blocked:             { status: 403, code: "blocked",             message: "この授業への再入室は制限されています。" },
  room_not_active:     { status: 410, code: "room_not_active",     message: "この授業は終了しています。" },
  meeting_not_started: { status: 425, code: "meeting_not_started", message: "講師がまだ授業を開始していません。しばらくお待ちください。" },
  meeting_ended:       { status: 410, code: "meeting_ended",       message: "この授業は終了しています。" },
  room_full:           { status: 409, code: "room_full",           message: `定員（${MAX_PARTICIPANTS}名）に達しています。` },
  aws_config:          { status: 500, code: "aws_config",          message: "サーバー設定エラーです。管理者にお問い合わせください。" },
  unknown_action:      { status: 400, code: "unknown_action",      message: "不明なアクションです。" },
  internal:            { status: 500, code: "internal",            message: "通話ルームの作成に失敗しました。時間をおいて再試行してください。" },
};

function errRes(key) {
  const e = ERRORS[key] || ERRORS.internal;
  return Response.json({ error_code: e.code, error: e.message }, { status: e.status });
}

// ---- ヘルパー ----
function countActive(participants) {
  return (participants || []).filter((p) => !p.left_at).length;
}

function evictTimedOut(participants) {
  const now = Date.now();
  return (participants || []).map((p) => {
    if (p.left_at) return p;
    const lastSeen = p.last_seen_at
      ? new Date(p.last_seen_at).getTime()
      : new Date(p.joined_at).getTime();
    if (now - lastSeen > HEARTBEAT_TIMEOUT_MS) {
      return { ...p, left_at: new Date().toISOString(), exit_reason: "timeout" };
    }
    return p;
  });
}

// Attendee 削除（失敗しても握り潰す）
async function safeDeleteAttendee(chime, meetingId, attendeeId) {
  if (!meetingId || !attendeeId) return;
  await chime.send(new DeleteAttendeeCommand({ MeetingId: meetingId, AttendeeId: attendeeId })).catch((e) => {
    console.warn("[createChimeMeeting] safeDeleteAttendee:", e.message);
  });
}

// ---- メインハンドラ ----
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return errRes("unauthorized");

    const body = await req.json();
    const { action, roomId, inviteCode, targetEmail } = body;
    if (!roomId) return Response.json({ error_code: "bad_request", error: "roomId が必要です。" }, { status: 400 });

    // ---- ルーム取得 ----
    const rooms = await base44.asServiceRole.entities.ClassRoom.filter({ id: roomId });
    const room = rooms[0];
    if (!room) return errRes("room_not_found");

    const isHost = room.host_user_id === user.id || room.host_email === user.email;
    const isAdmin = user.role === "admin";

    // ---- Chime クライアント（create/join/kick/delete のみ必要）----
    let chime = null;
    if (["create", "join", "kick", "delete"].includes(action)) {
      try { chime = buildChimeClient(); }
      catch (_) { return errRes("aws_config"); }
    }

    // =========================================
    // action: "heartbeat"
    // =========================================
    if (action === "heartbeat") {
      // ended ルームは heartbeat 不要（冪等で無視）
      if (room.status === "ended") return Response.json({ ok: true });

      const now = new Date().toISOString();
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
    // action: "leave"
    // =========================================
    if (action === "leave") {
      // ended ルームの leave は冪等で OK
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
    // action: "create" — Meeting 作成（講師専用）
    // =========================================
    if (action === "create") {
      if (!isHost) return errRes("not_host");

      // 7. status チェック: ended は create 不可
      if (room.status === "ended") return errRes("room_not_active");

      const now = new Date().toISOString();

      // 既存 Meeting が生きているか（再接続対応）
      if (room.chime_meeting_id) {
        try {
          const res = await chime.send(new GetMeetingCommand({ MeetingId: room.chime_meeting_id }));
          if (res.Meeting) {
            const attendeeRes = await chime.send(new CreateAttendeeCommand({
              MeetingId: room.chime_meeting_id,
              ExternalUserId: user.email.slice(0, 64),
            }));
            // 2. participants に chime_attendee_id を保存
            const participants = (room.participants || []).map((p) =>
              p.email === user.email
                ? { ...p, chime_attendee_id: attendeeRes.Attendee.AttendeeId, external_user_id: user.email, last_seen_at: now, left_at: null }
                : p
            );
            await base44.asServiceRole.entities.ClassRoom.update(roomId, {
              participants,
              current_participants_count: countActive(participants),
            });
            return Response.json({ meeting: res.Meeting, attendee: attendeeRes.Attendee });
          }
        } catch (_) { /* Meeting 消滅済み → 新規作成 */ }
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

      const attendeeRes = await chime.send(new CreateAttendeeCommand({
        MeetingId: meeting.MeetingId,
        ExternalUserId: user.email.slice(0, 64),
      }));

      // 2. participants に chime_attendee_id を含めて保存
      const existing = (room.participants || []).filter((p) => p.email !== user.email);
      const hostEntry = {
        email: user.email,
        name: user.full_name || user.email,
        role: "host",
        chime_attendee_id: attendeeRes.Attendee.AttendeeId,
        external_user_id: user.email,
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
    // action: "join" — 生徒が Meeting に参加
    // =========================================
    if (action === "join") {
      // 7. ended ルームは join 不可
      if (room.status === "ended") return errRes("room_not_active");

      // ホスト再入室は join ではなく create を使う
      if (isHost) {
        if (room.status !== "active" || !room.chime_meeting_id) return errRes("meeting_not_started");
        let meeting;
        try {
          const res = await chime.send(new GetMeetingCommand({ MeetingId: room.chime_meeting_id }));
          meeting = res.Meeting;
        } catch (_) { return errRes("meeting_ended"); }
        const attendeeRes = await chime.send(new CreateAttendeeCommand({
          MeetingId: room.chime_meeting_id,
          ExternalUserId: user.email.slice(0, 64),
        }));
        return Response.json({ meeting, attendee: attendeeRes.Attendee });
      }

      // ---- 1. バックエンドで invite_code を必ず検証（生徒のみ）----
      if (room.invite_code && room.invite_code !== inviteCode) {
        return errRes("invite_invalid");
      }

      // ---- 3. kick（再入室禁止）チェック ----
      const blocked = room.blocked_participant_emails || [];
      if (blocked.includes(user.email)) return errRes("blocked");

      // ---- 4. SchoolTicket 認可（asServiceRole で DB 直参照）----
      const tickets = await base44.asServiceRole.entities.SchoolTicket.filter({
        session_id: roomId,
        student_email: user.email,
        status: "active",
      });
      if (!tickets || tickets.length === 0) return errRes("ticket_required");

      // Meeting 存在確認
      if (!room.chime_meeting_id) return errRes("meeting_not_started");
      let meeting;
      try {
        const res = await chime.send(new GetMeetingCommand({ MeetingId: room.chime_meeting_id }));
        meeting = res.Meeting;
      } catch (_) { return errRes("meeting_ended"); }

      // ================================================================
      // 同時入室競合対策（7ステップ）
      // ================================================================
      const now = new Date().toISOString();

      // Step 1: 最新 Room を再取得してタイムアウト退出者をクリーン
      const freshRooms1 = await base44.asServiceRole.entities.ClassRoom.filter({ id: roomId });
      const fresh1 = freshRooms1[0];
      if (!fresh1) return errRes("room_not_found");
      const cleaned = evictTimedOut(fresh1.participants);

      // Step 2: active 人数再計算
      const alreadyActive = cleaned.find((p) => p.email === user.email && !p.left_at);
      const activeCountBefore = countActive(cleaned);

      // Step 3: Attendee 作成前に定員チェック
      if (!alreadyActive && activeCountBefore >= MAX_PARTICIPANTS) return errRes("room_full");

      // Attendee 作成（認可・定員確認完了後）
      const attendeeRes = await chime.send(new CreateAttendeeCommand({
        MeetingId: room.chime_meeting_id,
        ExternalUserId: user.email.slice(0, 64),
      }));
      const attendeeId = attendeeRes.Attendee.AttendeeId;

      // Step 4: DB 更新直前に再取得
      const freshRooms2 = await base44.asServiceRole.entities.ClassRoom.filter({ id: roomId });
      const fresh2 = freshRooms2[0];
      if (!fresh2) {
        await safeDeleteAttendee(chime, room.chime_meeting_id, attendeeId);
        return errRes("room_not_found");
      }
      const cleaned2 = evictTimedOut(fresh2.participants);
      const alreadyActive2 = cleaned2.find((p) => p.email === user.email && !p.left_at);
      const activeCountBefore2 = countActive(cleaned2);

      // Step 5: Attendee 作成後・DB 更新前の定員チェック
      if (!alreadyActive2 && activeCountBefore2 >= MAX_PARTICIPANTS) {
        await safeDeleteAttendee(chime, room.chime_meeting_id, attendeeId);
        return errRes("room_full");
      }

      // Step 6: DB 更新（2. chime_attendee_id を含めて保存）
      const withoutMe = cleaned2.filter((p) => p.email !== user.email);
      const guestEntry = {
        email: user.email,
        name: user.full_name || user.email,
        role: "guest",
        chime_attendee_id: attendeeId,
        external_user_id: user.email,
        joined_at: alreadyActive2?.joined_at || now,
        last_seen_at: now,
        left_at: null,
      };
      const participants = [...withoutMe, guestEntry];
      const newActiveCount = countActive(participants);

      await base44.asServiceRole.entities.ClassRoom.update(roomId, {
        participants,
        current_participants_count: newActiveCount,
      });

      // Step 7: DB 更新後の最終確認
      const freshRooms3 = await base44.asServiceRole.entities.ClassRoom.filter({ id: roomId });
      const fresh3 = freshRooms3[0];
      if (fresh3 && countActive(fresh3.participants) > MAX_PARTICIPANTS) {
        const fixedParticipants = (fresh3.participants || []).map((p) =>
          p.email === user.email && !p.left_at
            ? { ...p, left_at: now, exit_reason: "capacity_rollback" }
            : p
        );
        await base44.asServiceRole.entities.ClassRoom.update(roomId, {
          participants: fixedParticipants,
          current_participants_count: countActive(fixedParticipants),
        });
        await safeDeleteAttendee(chime, room.chime_meeting_id, attendeeId);
        return errRes("room_full");
      }

      // 認可済みユーザーにのみ返却（AWS 認証情報は含まない）
      return Response.json({ meeting, attendee: attendeeRes.Attendee });
    }

    // =========================================
    // action: "kick" — 生徒を強制退出・再入室禁止（講師/Admin専用）
    // =========================================
    if (action === "kick") {
      if (!isHost && !isAdmin) return errRes("not_host");
      if (!targetEmail) return Response.json({ error_code: "bad_request", error: "targetEmail が必要です。" }, { status: 400 });

      const now = new Date().toISOString();

      // 対象参加者を特定して chime_attendee_id を取得
      const target = (room.participants || []).find((p) => p.email === targetEmail && !p.left_at);
      const targetAttendeeId = target?.chime_attendee_id;

      // Chime 側 Attendee を削除
      if (room.chime_meeting_id && targetAttendeeId) {
        await safeDeleteAttendee(chime, room.chime_meeting_id, targetAttendeeId);
      }

      // participants を更新（left_at + exit_reason = "kicked"）
      const updatedParticipants = (room.participants || []).map((p) =>
        p.email === targetEmail && !p.left_at
          ? { ...p, left_at: now, exit_reason: "kicked" }
          : p
      );

      // blocked_participant_emails に追加（重複防止）
      const blocked = room.blocked_participant_emails || [];
      const updatedBlocked = blocked.includes(targetEmail) ? blocked : [...blocked, targetEmail];

      await base44.asServiceRole.entities.ClassRoom.update(roomId, {
        participants: updatedParticipants,
        current_participants_count: countActive(updatedParticipants),
        blocked_participant_emails: updatedBlocked,
      });

      return Response.json({ ok: true, kicked: targetEmail });
    }

    // =========================================
    // action: "delete" — クラス終了（講師/Admin専用）
    // =========================================
    if (action === "delete") {
      if (!isHost && !isAdmin) return errRes("not_host");

      // Chime Meeting を削除
      if (room.chime_meeting_id) {
        try {
          await chime.send(new DeleteMeetingCommand({ MeetingId: room.chime_meeting_id }));
        } catch (e) {
          console.warn("[createChimeMeeting] DeleteMeeting:", e.message);
        }
      }

      // 全員 left 扱い・カウント 0
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

      // 4. 対象 roomId の SchoolTicket を "used" に更新
      const ticketNow = now;
      const activeTickets = await base44.asServiceRole.entities.SchoolTicket.filter({
        session_id: roomId,
        status: "active",
      });
      await Promise.all(
        (activeTickets || []).map((t) =>
          base44.asServiceRole.entities.SchoolTicket.update(t.id, {
            status: "used",
            used_at: ticketNow,
          })
        )
      );

      return Response.json({ ok: true, message: "クラスを終了しました。" });
    }

    return errRes("unknown_action");

  } catch (error) {
    console.error("[createChimeMeeting] Unhandled error:", error);
    return Response.json({ error_code: "internal", error: ERRORS.internal.message }, { status: 500 });
  }
});