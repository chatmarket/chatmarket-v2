import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * エール受信リスナー + ライバー側の収益即時更新
 * user.email === call.callee_email の場合のみ有効
 */
export function useYellCoinListener({
  user,
  call,
  enabled = true,
  onCoinReceived, // (amount) => {}
}) {
  const unsub = useRef(null);

  useEffect(() => {
    if (!enabled || !user || !call || user.email !== call.callee_email) return;

    unsub.current = base44.entities.YellCoinTransaction.subscribe((ev) => {
      const d = ev.data;
      if (ev.type !== 'create' || d?.channel_owner_email !== user.email) return;

      const amount = d.amount || 0;
      const creatorCoins = Math.floor(amount * 0.85);

      // ★ 即時UI更新（楽観的更新）
      onCoinReceived?.(creatorCoins);

      // ★ DB同期（非同期・バックグラウンド）
      (async () => {
        try {
          const wallet = await base44.entities.YellCoinWallet.filter({ 
            user_email: user.email 
          });
          if (wallet[0]) {
            await base44.entities.YellCoinWallet.update(wallet[0].id, {
              balance: (wallet[0].balance || 0) + creatorCoins,
            });
            console.log(`[YellListener] ✅ Wallet updated: +${creatorCoins} coins`);
          }
        } catch (e) {
          console.error('[YellListener] ❌ Wallet update failed:', e);
        }
      })();
    });

    return () => unsub.current?.();
  }, [enabled, user?.email, call?.callee_email]);
}