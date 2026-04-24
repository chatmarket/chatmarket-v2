import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Radio, Users, Settings, Play, Square } from "lucide-react";

export default function LiveStreamTest() {
  const { streamId } = useParams();
  const [user, setUser] = useState(null);
  const [stream, setStream] = useState(null);
  const [role, setRole] = useState("broadcaster"); // broadcaster | viewer
  const [meeting, setMeeting] = useState(null);
  const [attendee, setAttendee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streamStatus, setStreamStatus] = useState("scheduled"); // scheduled | live | ended
  const [errorDetail, setErrorDetail] = useState(null); // 詳細エラー表示用

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  useEffect(() => {
    if (!streamId) return;
    base44.entities.LiveStream.filter({ id: streamId }).then(res => {
      if (res[0]) {
        setStream(res[0]);
        setStreamStatus(res[0].status || "scheduled");
      }
    });
  }, [streamId]);

  const handleCreateMeeting = async () => {
    if (!streamId) { toast.error("Stream ID required"); return; }
    setLoading(true);
    setErrorDetail(null);
    try {
      const res = await base44.functions.invoke('createLiveStreamChimeMeeting', {
        streamId,
        role,
      });
      // base44 SDK は {data} にラップする場合がある
      const data = res?.data || res;
      if (data?.error) {
        throw new Error(data.error);
      }
      setMeeting(data.Meeting);
      setAttendee(data.Attendee);
      toast.success(`✅ ${role === 'broadcaster' ? '配信者' : '視聴者'}として入室完了`);
      console.log(`[Test] Meeting created:`, data);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || String(err);
      setErrorDetail(msg);
      toast.error(`エラー: ${msg}`);
      console.error('[Test] Meeting creation failed:', msg, err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinAttendee = async () => {
    if (!streamId || !attendee) return;
    setLoading(true);
    try {
      await base44.functions.invoke('liveStreamAttendeeManager', {
        stream_id: streamId,
        action: 'join',
        attendee_id: attendee.AttendeeId,
        attendee_email: user?.email,
        attendee_name: user?.full_name,
      });
      toast.success("✅ Attendee joined");
    } catch (err) {
      toast.error(`エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveAttendee = async () => {
    if (!streamId || !attendee) return;
    setLoading(true);
    try {
      await base44.functions.invoke('liveStreamAttendeeManager', {
        stream_id: streamId,
        action: 'leave',
        attendee_id: attendee.AttendeeId,
      });
      toast.success("✅ Attendee left");
    } catch (err) {
      toast.error(`エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartLive = async () => {
    if (!streamId) return;
    setLoading(true);
    try {
      await base44.entities.LiveStream.update(streamId, {
        status: 'live',
        live_started_at: new Date().toISOString(),
      });
      setStreamStatus('live');
      toast.success("✅ 配信をスタート");
    } catch (err) {
      toast.error(`エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEndLive = async () => {
    if (!streamId) return;
    setLoading(true);
    try {
      await base44.entities.LiveStream.update(streamId, {
        status: 'ended',
        live_ended_at: new Date().toISOString(),
      });
      setStreamStatus('ended');
      toast.success("✅ 配信を終了");
    } catch (err) {
      toast.error(`エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="text-center py-8">ロード中...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="border border-border rounded-xl p-6 bg-card space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Radio className="w-6 h-6 text-primary" /> ライブ配信テスト
        </h1>

        {/* 配信情報 */}
        {stream && (
          <div className="bg-secondary rounded-lg p-4 space-y-2 text-sm">
            <p><strong>配信ID:</strong> {streamId}</p>
            <p><strong>タイトル:</strong> {stream.title}</p>
            <p>
              <strong>ステータス:</strong>
              <span className={`ml-2 font-bold ${streamStatus === 'live' ? 'text-red-400' : streamStatus === 'ended' ? 'text-gray-400' : 'text-yellow-400'}`}>
                {streamStatus}
              </span>
            </p>
            {stream.chime_meeting_id && <p><strong>Meeting ID:</strong> {stream.chime_meeting_id}</p>}
            {stream.viewer_count > 0 && <p><strong>視聴者数:</strong> {stream.viewer_count}</p>}
          </div>
        )}

        {/* ユーザー情報 */}
        <div className="bg-secondary rounded-lg p-4 space-y-2 text-sm">
          <p><strong>ユーザー:</strong> {user.email}</p>
          <p><strong>名前:</strong> {user.full_name}</p>
        </div>

        {/* ロール選択 */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">ロール選択</label>
          <div className="flex gap-2">
            {['broadcaster', 'viewer'].map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                  role === r
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:border-primary/40'
                } border`}
              >
                {r === 'broadcaster' ? '🎥 配信者' : '👁️ 視聴者'}
              </button>
            ))}
          </div>
        </div>

        {/* Meeting作成 */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">ステップ 1: Meeting & Attendee作成</label>
          <Button
            onClick={handleCreateMeeting}
            disabled={loading || !streamId}
            className="w-full bg-primary hover:bg-primary/90 gap-2"
          >
            <Settings className="w-4 h-4" />
            {loading ? "作成中..." : "Meeting作成 + Attendee登録"}
          </Button>
        </div>

        {/* エラー詳細表示 */}
        {errorDetail && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 space-y-1 text-sm">
            <p className="font-bold text-red-400">❌ エラー詳細:</p>
            <pre className="text-red-300 text-xs whitespace-pre-wrap break-all">{errorDetail}</pre>
          </div>
        )}

        {/* Meeting情報表示 */}
        {meeting && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-2 text-sm">
            <p><strong>✅ Meeting ID:</strong> {meeting.MeetingId}</p>
            <p><strong>Attendee ID:</strong> {attendee?.AttendeeId}</p>
            <p><strong>外部ユーザーID:</strong> {attendee?.ExternalUserId}</p>
          </div>
        )}

        {/* 入退室管理 */}
        {attendee && (
          <div className="space-y-2">
            <label className="text-sm font-semibold">ステップ 2: 入退室管理</label>
            <div className="flex gap-2">
              <Button
                onClick={handleJoinAttendee}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
              >
                <Users className="w-4 h-4" /> 入室
              </Button>
              <Button
                onClick={handleLeaveAttendee}
                disabled={loading}
                variant="destructive"
                className="flex-1 gap-2"
              >
                入室停止
              </Button>
            </div>
          </div>
        )}

        {/* 配信制御 */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">ステップ 3: 配信制御</label>
          <div className="flex gap-2">
            <Button
              onClick={handleStartLive}
              disabled={loading || streamStatus === 'live'}
              className="flex-1 bg-red-600 hover:bg-red-700 gap-2"
            >
              <Play className="w-4 h-4" /> 配信開始
            </Button>
            <Button
              onClick={handleEndLive}
              disabled={loading || streamStatus !== 'live'}
              variant="destructive"
              className="flex-1 gap-2"
            >
              <Square className="w-4 h-4" /> 配信終了
            </Button>
          </div>
        </div>

        {/* テストガイド */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-xs space-y-2 text-blue-200">
          <p className="font-bold">📋 テスト手順：</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>配信者ロール選択 → Meeting作成</li>
            <li>別タブで視聴者ロール選択 → Meeting作成</li>
            <li>配信開始ボタンをクリック</li>
            <li>入室/入室停止で視聴者数の更新確認</li>
            <li>配信終了ボタンをクリック</li>
          </ol>
        </div>
      </div>
    </div>
  );
}