import { baseApi } from '../baseApi';
import type {
  CustomerProfile,
  ProfileImageUploadResult,
  UpdateProfileRequest,
} from '../../features/profile/types';

/**
 * User profile RTK — P2-CUS-07 (UI-API Profile + API §2.1 / §2.2 / image upload).
 */
export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyProfile: builder.query<CustomerProfile, void>({
      queryFn: async (_arg, _queryApi, _extraOptions, baseQuery) => {
        const result = await baseQuery('/api/v1/users/me');
        if (result.error) {
          return { error: result.error };
        }
        let profile = ((result.data as any)?.data || result.data) as CustomerProfile;
        try {
          // Check Admin BFF for live suspension/control override (for instant cross-app updates)
          const params = new URLSearchParams();
          if (profile?.customerId) params.set('id', profile.customerId);
          if (profile?.email) params.set('email', profile.email);
          if (profile?.phoneNumber) params.set('phone', profile.phoneNumber);
          if (profile?.fullName) params.set('name', profile.fullName);

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2000);
          const res = await fetch(`http://localhost:3100/api/bff/customer/status?${params.toString()}`, {
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (res.ok) {
            const json = await res.json();
            const bffData = json?.data;
            if (bffData) {
              const isSusp = bffData.isSuspended === true || bffData.accountStatus === 'SUSPENDED';
              profile = {
                ...profile,
                accountStatus: isSusp ? 'SUSPENDED' : (bffData.accountStatus || profile.accountStatus || 'ACTIVE'),
                isSuspended: isSusp,
                suspensionReason: bffData.suspensionReason || profile.suspensionReason || (isSusp ? 'Account suspended by security administration' : null),
                isCodDisabled: bffData.isCodDisabled !== undefined ? bffData.isCodDisabled : profile.isCodDisabled,
              };
            }
          }
        } catch {
          // BFF check silent fallback
        }
        return { data: profile };
      },
      providesTags: [{ type: 'User', id: 'ME' }],
      keepUnusedDataFor: 30,
    }),
    updateMyProfile: builder.mutation<CustomerProfile, UpdateProfileRequest>({
      query: (body) => ({
        url: '/api/v1/users/me',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
      invalidatesTags: [{ type: 'User', id: 'ME' }],
    }),
    uploadProfileImage: builder.mutation<
      ProfileImageUploadResult,
      { uri: string; mimeType: string; fileName: string }
    >({
      query: ({ uri, mimeType, fileName }) => {
        const formData = new FormData();
        formData.append('file', {
          uri,
          type: mimeType,
          name: fileName,
        } as unknown as Blob);
        return {
          url: '/api/v1/users/me/profile-image',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: [{ type: 'User', id: 'ME' }],
    }),
  }),
});

export const {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useUploadProfileImageMutation,
} = usersApi;
