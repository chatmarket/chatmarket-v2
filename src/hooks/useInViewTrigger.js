import { useRef, useEffect, useState } from 'react';

/**
 * Intersection Observer を使用して、要素が画面に入ったときにコールバックを実行するフック
 * @param {Function} onInView - 要素が画面に入ったときのコールバック
 * @param {Object} options - Intersection Observer のオプション（threshold, rootMargin など）
 * @returns {Object} ref とロード状態
 */
export function useInViewTrigger(onInView, options = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const hasTriggered = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // 要素が画面に入って、まだトリガーされていない場合
        if (entry.isIntersecting && !hasTriggered.current) {
          hasTriggered.current = true;
          setIsVisible(true);
          onInView?.();
        }
      },
      {
        threshold: 0.01,
        rootMargin: '100px',
        ...options,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
      observer.disconnect();
    };
  }, [onInView, options]);

  return { ref, isVisible };
}