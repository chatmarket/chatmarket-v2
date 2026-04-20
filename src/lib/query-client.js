import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// ページ遷移時にキャッシュを再利用（5分間は再フェッチしない）
			staleTime: 5 * 60 * 1000,       // 5分: この間はキャッシュをそのまま使う
			gcTime: 15 * 60 * 1000,          // 15分: メモリ上にキャッシュを保持
			refetchOnMount: false,           // マウント時の自動再フェッチを抑制
		},
	},
});