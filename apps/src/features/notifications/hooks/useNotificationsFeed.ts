import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGetNotificationsQuery } from '../../../api/endpoints/notificationsApi';
import type { InboxNotification } from '../types';
import {
  DEFAULT_NOTIFICATIONS_PAGE_SIZE,
  hasMoreNotificationPages,
} from '../types';

/** Page-accumulated notifications feed with unreadOnly filter. */
export function useNotificationsFeed(unreadOnly: boolean) {
  const size = DEFAULT_NOTIFICATIONS_PAGE_SIZE;
  const filterKey = useMemo(
    () => JSON.stringify({ unreadOnly, size }),
    [unreadOnly, size],
  );

  const [page, setPage] = useState(0);
  const [items, setItems] = useState<InboxNotification[]>([]);

  useEffect(() => {
    setPage(0);
    setItems([]);
  }, [filterKey]);

  const query = useGetNotificationsQuery({
    unreadOnly,
    page,
    size,
  });

  useEffect(() => {
    if (query.isSuccess && query.data) {
      setItems((prev) => {
        if (page === 0) return query.data;
        const existingIds = new Set(prev.map((i) => i.notificationLogId));
        const newItems = query.data.filter(
          (i) => !existingIds.has(i.notificationLogId),
        );
        return [...prev, ...newItems].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      });
    }
  }, [page, query.data, query.isSuccess]);

  const hasMore = hasMoreNotificationPages(query.data, size);

  const onLoadMore = useCallback(() => {
    if (hasMore && !query.isFetching) {
      setPage((p) => p + 1);
    }
  }, [hasMore, query.isFetching]);

  const onRefresh = useCallback(async () => {
    setPage(0);
    await query.refetch();
  }, [query]);

  const patchLocalRead = useCallback(
    (notificationLogId: string, readAt: string) => {
      setItems((prev) => {
        if (unreadOnly) {
          return prev.filter((n) => n.notificationLogId !== notificationLogId);
        }
        return prev.map((n) =>
          n.notificationLogId === notificationLogId ? { ...n, readAt } : n,
        );
      });
    },
    [unreadOnly],
  );

  const rollbackLocal = useCallback((snapshot: InboxNotification[]) => {
    setItems(snapshot);
  }, []);

  return {
    items,
    isLoading: query.isLoading && items.length === 0,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: onRefresh,
    onLoadMore,
    hasMore,
    patchLocalRead,
    rollbackLocal,
  };
}
