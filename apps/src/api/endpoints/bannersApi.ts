import { baseApi } from '../baseApi';

export interface PromotionBannerResponse {
    id: string;
    title: string;
    subtitle?: string;
    imageUrl: string;
    ctaText?: string;
    ctaType?: string;
    ctaTarget?: string;
    status: string;
    displayOrder: number;
}

export const bannersApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getActiveBanners: builder.query<PromotionBannerResponse[], void>({
            query: () => '/api/v1/banners/active',
            providesTags: ['Banners' as any],
        }),
    }),
});

export const { useGetActiveBannersQuery } = bannersApi;
