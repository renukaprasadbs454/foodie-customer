import { useEffect } from 'react';
import { userNotificationsTopic } from 'foodie-shared-rn';
import { notificationsApi } from '../../../api/endpoints/notificationsApi';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { selectUserId } from '../../auth/authSlice';
import {
  addWebsocketMessageHandler,
  websocketConnect,
  websocketSubscribe,
  websocketUnsubscribe,
} from '../../../store/websocketMiddleware';
import * as Notifications from 'expo-notifications';

/**
 * Focus-scoped optional `/topic/user/{userCredentialId}/notifications`.
 * On NOTIFICATION, invalidate inbox list (suppress push when subscribed — SD §14.3).
 */
export function useNotificationsSubscription() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);

  useEffect(() => {
    if (!userId) return undefined;

    const destination = userNotificationsTopic(userId);
    dispatch(websocketConnect());

    const remove = addWebsocketMessageHandler(destination, (message) => {
      if (message.type === 'NOTIFICATION') {
        dispatch(
          notificationsApi.util.invalidateTags([
            { type: 'Notification', id: 'LIST' },
          ]),
        );

        // Schedule a local heads-up notification in case the user is outside the notifications screen
        const payload = message.payload as any;
        void Notifications.scheduleNotificationAsync({
          content: {
            title: payload?.title || 'New Notification',
            body: payload?.body || 'You have received a new update from Foodie.',
            data: payload || {},
          },
          trigger: null, // trigger immediately
        });
      }
    });

    dispatch(websocketSubscribe({ destination }));

    return () => {
      remove();
      dispatch(websocketUnsubscribe({ destination }));
    };
  }, [dispatch, userId]);
}
