import React from 'react';
import { Pressable, View } from 'react-native';
import { Text, useTheme } from 'foodie-shared-rn';
import type { InboxNotification } from '../types';
import { isNotificationUnread } from '../types';

type Props = {
  notification: InboxNotification;
  onPress: () => void;
};

/** Inbox row — UI-API NotificationListItem. */
export function NotificationListItem({ notification, onPress }: Props) {
  const { tokens } = useTheme();
  const unread = isNotificationUnread(notification);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}${unread ? ', unread' : ''}`}
      style={({ pressed }) => ({
        padding: 16,
        borderRadius: 16,
        backgroundColor: '#131F18',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        opacity: pressed ? 0.9 : 1,
        borderWidth: 1.5,
        borderColor: unread ? '#FCD34D' : 'rgba(252, 211, 77, 0.15)',
      })}
    >
      <View style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: unread ? 'rgba(252, 211, 77, 0.2)' : 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: unread ? '#FCD34D' : 'rgba(252, 211, 77, 0.2)'
      }}>
        <Text style={{ fontSize: 20 }}>{notification.title.includes('Order') ? '🛵' : '🔔'}</Text>
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: unread ? '800' : '600' }}>
            {notification.title}
          </Text>
          {unread ? (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FCD34D' }} />
          ) : null}
        </View>
        <Text style={{ color: '#9CA3AF', fontSize: 14, lineHeight: 20 }}>
          {notification.body.includes('is now PICKED_UP.')
            ? notification.body.replace('is now PICKED_UP.', 'collected. It will reach you soon!')
            : notification.body}
        </Text>
        {notification.sentAt ? (
          <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4, fontWeight: '500' }}>
            {new Date(notification.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
