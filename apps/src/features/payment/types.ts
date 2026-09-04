/**
 * P2-CUS-05 Payment — UI-API Payment + API §7.1 initiation DTO.
 */

export type PaymentInitiation = {
  paymentSessionId?: string | null; // optional — omit for mock/simple payment mode
  cfOrderId?: string | null;
  amount: number | string;
  currency: string;
  appId: string;
  walletAmountUsed?: number | string;
  status?: string;
};

export const ORDER_STATUS_CONFIRMED = 'CONFIRMED';
export const ORDER_STATUS_PLACED = 'PLACED';

/** Terminal failure-ish statuses while awaiting payment confirmation. */
export const ORDER_PAYMENT_FAILED_STATUSES = [
  'CANCELLED',
  'REJECTED',
] as const;

export function isConfirmedStatus(status: string | undefined): boolean {
  return status === ORDER_STATUS_CONFIRMED;
}

export function isPaymentFailedStatus(status: string | undefined): boolean {
  if (!status) return false;
  return (ORDER_PAYMENT_FAILED_STATUSES as readonly string[]).includes(status);
}
