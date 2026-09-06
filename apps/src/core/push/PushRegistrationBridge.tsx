import { useEffect } from 'react';
import {
  selectAuthStatus,
  selectUserId,
} from '../../features/auth/authSlice';
import { ensureLocalPushRegistration } from '../../features/notifications/pushRegistration';
import { useAppSelector } from '../../store/hooks';
import { useRegisterDeviceTokenMutation } from '../../api/endpoints/notificationsApi';

export function PushRegistrationBridge() {
  const authStatus = useAppSelector(selectAuthStatus);
  const userId = useAppSelector(selectUserId);
  const [registerToken] = useRegisterDeviceTokenMutation();

  useEffect(() => {
    if (authStatus !== 'authenticated' || !userId) {
      return;
    }

    ensureLocalPushRegistration(userId).then(reg => {
      if (reg.deviceToken) {
        registerToken(reg.deviceToken).catch(() => { });
      }
    }).catch(() => { });
  }, [authStatus, userId, registerToken]);

  return null;
}
