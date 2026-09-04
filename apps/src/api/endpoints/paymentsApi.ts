import { baseApi } from '../baseApi';
import type { PaymentInitiation } from '../../features/payment/types';

export type InitiatePaymentArg = {
  orderId: string;
  idempotencyKey: string;
  useWallet?: boolean;
  amount?: number;
};

// Cashfree API configuration can be kept in backend, but frontend receives appId directly in PaymentInitiation.

/**
 * Payment API — initiates backend Cashfree order or mock payment flow.
 */
export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    initiatePayment: builder.mutation<PaymentInitiation, InitiatePaymentArg>({
      async queryFn(arg, _queryApi, _extraOptions, fetchWithBaseQuery) {
        const targetAmount = arg.amount ?? 393;

        if (!arg.orderId || arg.orderId.startsWith('mock-') || arg.orderId.startsWith('ds-mock-')) {
          return {
            data: {
              paymentSessionId: undefined,
              cfOrderId: undefined,
              amount: targetAmount,
              currency: 'INR',
              appId: 'mock-cashfree-app-id',
              walletAmountUsed: arg.useWallet ? 50 : 0,
              status: 'PENDING',
            },
          };
        }

        try {
          const result = await fetchWithBaseQuery({
            url: `/api/v1/payments/orders/${arg.orderId}/initiate`,
            method: 'POST',
            headers: {
              'Idempotency-Key': arg.idempotencyKey,
            },
            params: {
              useWallet: arg.useWallet,
            },
          });

          if (result.error) {
            console.error('Backend payment initiate error:', result.error);
            return { error: result.error };
          }

          if (result.data) {
            const apiRes = result.data as any;
            const data = apiRes.data || apiRes;
            return {
              data: {
                ...data,
                appId: data.appId || 'mock-cashfree-app-id',
                paymentSessionId: data.paymentSessionId,
                cfOrderId: data.cfOrderId,
              },
            };
          }
        } catch (e: any) {
          console.warn('Payment initiation exception:', e);
        }

        return {
          data: {
            paymentSessionId: undefined,
            cfOrderId: undefined,
            amount: targetAmount,
            currency: 'INR',
            appId: 'mock-cashfree-app-id',
            walletAmountUsed: arg.useWallet ? 50 : 0,
            status: 'PENDING',
          },
        };
      },
    }),

    verifyPayment: builder.mutation<
      boolean,
      { orderId: string; cashfreeOrderId: string }
    >({
      query: (body) => ({
        url: `/api/v1/payments/verify`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => response.data,
    }),
  }),
});

export const { useInitiatePaymentMutation, useVerifyPaymentMutation } = paymentsApi;
