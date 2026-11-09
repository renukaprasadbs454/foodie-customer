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
          // Check Admin BFF strictly by customerId, phone, and email (unique identifiers)
          const params = new URLSearchParams();
          if (profile?.customerId) params.set('id', String(profile.customerId));
          if (profile?.phoneNumber) params.set('phone', String(profile.phoneNumber));
          if (profile?.email) params.set('email', String(profile.email));

          const endpoints = [
            `http://localhost:3100/api/bff/customer/status?${params.toString()}`,
            `http://localhost:8082/api/v1/admin/customers/status-check?${params.toString()}`,
            `http://localhost:3000/api/bff/customer/status?${params.toString()}`,
          ];

          for (const ep of endpoints) {
            try {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 1200);
              const res = await fetch(ep, { signal: controller.signal });
              clearTimeout(timer);
              if (res.ok) {
                const json = await res.json();
                const bffData = json?.data;
                if (bffData) {
                  const isSusp = bffData.isSuspended === true || bffData.accountStatus === 'SUSPENDED';
                  profile = {
                    ...profile,
                    accountStatus: isSusp ? 'SUSPENDED' : 'ACTIVE',
                    isSuspended: isSusp,
                    suspensionReason: isSusp ? (bffData.suspensionReason || profile.suspensionReason || 'Account suspended by security administration') : null,
                    isCodDisabled: bffData.isCodDisabled !== undefined ? Boolean(bffData.isCodDisabled) : Boolean(profile.isCodDisabled),
                  };
                  break;
                }
              }
            } catch {}
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
