/**
 * createChimeMeeting — Amazon Chime SDK Meeting/Attendee 管理
 *
 * POST payload:
 *   { action: "create", roomId }          → Meeting作成 + ホストAttendee追加
 *   { action: "join",   roomId, email }   → 既存MeetingへAttendee追加
 *   { action: "delete", roomId }          → Meeting削除（クラス終了時）
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  DeleteMeetingCommand,
  GetMeetingCommand,
} from "npm:@aws-sdk/client-chime-sdk-meetings@3";

const REGION = "ap-northeast-1"; // Chime がサポートするリージョン

function buildChimeClient() {
  return new ChimeSDKMeetingsClient({
    region: REGION,
    credentials: {
      accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID"),
      secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY"),
    },
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { action, roomId, email } = await req.json();
    if (!roomId) return Response.json({ error: "roomId required" }, { status: 400 });

    // ルーム取得
    const rooms = await base44.entities.ClassRoom.filter({ id: roomId });
    const room = rooms[0];
    if (!room) return Response.json({ error: "Room not found" }, { status: 404 });

    const chime = buildChimeClient();

    // =========================================
    // action: "create" — 新規 Meeting 作成
    // =========================================
    if (action === "create") {
      // ホストのみ作成可能
      if (room.host_email !== user.email) {
        return Response.json({ error: "Only host can create meeting" }, { status: 403 });
      }

      // 既存 Meeting が有効かチェック
      if (room.chime_meeting_id) {
        try {
          const existing = await chime.send(new GetMeetingCommand({ MeetingId: room.chime_meeting_id }));
          if (existing.Meeting) {
            // Attendee を追加（ホスト）
            const attendeeRes = await chime.send(new CreateAttendeeCommand({
              MeetingId: room.chime_meeting_id,
              ExternalUserId: user.email,
            }));
            return Response.json({
              meeting: existing.Meeting,
              attendee: attendeeRes.Attendee,
            });
          }
        } catch (_) {
          // Meeting が存在しない → 新規作成
        }
      }

      // 新規 Meeting 作成
      const meetingRes = await chime.send(new CreateMeetingCommand({
        ClientRequestToken: `${roomId}-${Date.now()}`,
        MediaRegion: REGION,
        ExternalMeetingId: roomId.slice(0, 64),
        MeetingFeatures: {
          Video: {
            MaxResolution: "HD", // 講師用: HD (720p)
          },
          Audio: {
            EchoReduction: "AVAILABLE",
          },
        },
      }));
      const meeting = meetingRes.Meeting;

      // Attendee（ホスト）追加
      const attendeeRes = await chime.send(new CreateAttendeeCommand({
        MeetingId: meeting.MeetingId,
        ExternalUserId: user.email,
      }));

      // DB に Meeting ID を保存
      await base44.asServiceRole.entities.ClassRoom.update(roomId, {
        chime_meeting_id: meeting.MeetingId,
        chime_meeting_info: JSON.stringify(meeting),
        status: "active",
        started_at: new Date().toISOString(),
      });

      return Response.json({
        meeting,
        attendee: attendeeRes.Attendee,
      });
    }

    // =========================================
    // action: "join" — 既存 Meeting に参加
    // =========================================
    if (action === "join") {
      if (!room.chime_meeting_id) {
        return Response.json({ error: "Meeting not started yet. Wait for host." }, { status: 425 });
      }

      const targetEmail = email || user.email;

      // Meeting 情報取得
      let meeting;
      try {
        const res = await chime.send(new GetMeetingCommand({ MeetingId: room.chime_meeting_id }));
        meeting = res.Meeting;
      } catch (_) {
        return Response.json({ error: "Meeting has ended" }, { status: 410 });
      }

      // Attendee 追加
      const attendeeRes = await chime.send(new CreateAttendeeCommand({
        MeetingId: room.chime_meeting_id,
        ExternalUserId: targetEmail,
      }));

      return Response.json({
        meeting,
        attendee: attendeeRes.Attendee,
      });
    }

    // =========================================
    // action: "delete" — Meeting 削除（クラス終了）
    // =========================================
    if (action === "delete") {
      if (room.host_email !== user.email) {
        return Response.json({ error: "Only host can end meeting" }, { status: 403 });
      }
      if (room.chime_meeting_id) {
        await chime.send(new DeleteMeetingCommand({ MeetingId: room.chime_meeting_id })).catch(() => {});
        await base44.asServiceRole.entities.ClassRoom.update(roomId, {
          status: "ended",
          ended_at: new Date().toISOString(),
          chime_meeting_id: null,
        });
      }
      return Response.json({ success: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });

  } catch (error) {
    console.error("[createChimeMeeting] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});