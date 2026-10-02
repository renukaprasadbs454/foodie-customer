import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Pressable,
  StatusBar,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text, Toast } from 'foodie-shared-rn';
import { Feather } from '@expo/vector-icons';
import type { OrdersStackParamList } from '../../../navigation/types';
import { useGetOrderQuery } from '../../../api/endpoints/ordersApi';
import { formatMoney } from '../../menu/types';
import { CustomerSupportModal } from '../../profile/components/CustomerSupportModal';

type Props = NativeStackScreenProps<OrdersStackParamList, 'RefundStatus'>;

export type RefundApprovalState = 'PENDING_ADMIN' | 'IN_PROCESS' | 'DONE' | 'FAILED';

export function RefundStatusScreen({ navigation, route }: Props) {
  const { orderId, orderNumber, totalAmount, placedAt } = route.params;
  const orderQuery = useGetOrderQuery(orderId, { skip: !orderId });
  const order = orderQuery.data;

  // Defaults to 'IN_PROCESS' (Admin Approved) with live selector to view all states
  const [refundStatus, setRefundStatus] = useState<RefundApprovalState>('IN_PROCESS');
  const [toast, setToast] = useState<{ message: string; variant: 'info' | 'success' | 'error' } | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  const displayOrderNum = orderNumber || order?.orderNumber || (orderId ? orderId.substring(0, 8).toUpperCase() : 'FD-20261002');
  const numericAmount = Number(totalAmount || order?.totalAmount || 393);
  const displayPlacedDate = placedAt || order?.placedAt || new Date().toISOString();

  const formattedDate = new Date(displayPlacedDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const arnNumber = `ARN-${displayOrderNum.replace(/[^0-9]/g, '') || '98234710294'}`;
  const refundId = `RF-${orderId ? orderId.substring(0, 8).toUpperCase() : '91827364'}`;

  const copyToClipboard = (text: string, label: string) => {
    try {
      Clipboard.setString(text);
      setToast({ message: `${label} copied to clipboard!`, variant: 'success' });
    } catch {
      setToast({ message: `Copied ${text}`, variant: 'info' });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#14532D' }} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#14532D" barStyle="light-content" />

      {/* Curved Header Banner */}
      <View style={{
        paddingTop: 16,
        paddingBottom: 24,
        paddingHorizontal: 20,
        backgroundColor: '#14532D',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        shadowColor: '#14532D',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: pressed ? '#0F3E22' : 'rgba(255, 255, 255, 0.15)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              gap: 4,
            })}
          >
            <Feather name="arrow-left" size={18} color="#FCD34D" />
            <Text style={{ color: '#FCD34D', fontWeight: '800', fontSize: 13 }}>
              My Orders
            </Text>
          </Pressable>
        </View>

        <Text style={{ color: '#FCD34D', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>
          Refund Status
        </Text>
        <Text style={{ color: '#A7F3D0', fontSize: 13, marginTop: 4, fontWeight: '600' }}>
          Reference #{displayOrderNum} • {formattedDate}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#F2F2F7' }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}
      >
        {/* Interactive State Selector Bar */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 6,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          flexDirection: 'row',
          gap: 4,
        }}>
          <Pressable
            onPress={() => setRefundStatus('PENDING_ADMIN')}
            style={{
              flex: 1,
              paddingVertical: 7,
              borderRadius: 10,
              backgroundColor: refundStatus === 'PENDING_ADMIN' ? '#FEF3C7' : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={{
              fontSize: 11,
              fontWeight: '800',
              color: refundStatus === 'PENDING_ADMIN' ? '#B45309' : '#6B7280',
            }}>
              ⏳ Admin Review
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setRefundStatus('IN_PROCESS')}
            style={{
              flex: 1,
              paddingVertical: 7,
              borderRadius: 10,
              backgroundColor: refundStatus === 'IN_PROCESS' ? '#DBEAFE' : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={{
              fontSize: 11,
              fontWeight: '800',
              color: refundStatus === 'IN_PROCESS' ? '#1D4ED8' : '#6B7280',
            }}>
              🛡️ Approved (In Process)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setRefundStatus('DONE')}
            style={{
              flex: 1,
              paddingVertical: 7,
              borderRadius: 10,
              backgroundColor: refundStatus === 'DONE' ? '#DCFCE7' : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={{
              fontSize: 11,
              fontWeight: '800',
              color: refundStatus === 'DONE' ? '#15803D' : '#6B7280',
            }}>
              ✓ Done (Credited)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setRefundStatus('FAILED')}
            style={{
              flex: 1,
              paddingVertical: 7,
              borderRadius: 10,
              backgroundColor: refundStatus === 'FAILED' ? '#FEE2E2' : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={{
              fontSize: 11,
              fontWeight: '800',
              color: refundStatus === 'FAILED' ? '#B91C1C' : '#6B7280',
            }}>
              ✕ Not Done
            </Text>
          </Pressable>
        </View>

        {/* Primary Hero Status Card */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 20,
          borderWidth: 1.5,
          borderColor:
            refundStatus === 'DONE' ? '#10B981' :
            refundStatus === 'IN_PROCESS' ? '#3B82F6' :
            refundStatus === 'PENDING_ADMIN' ? '#F59E0B' : '#EF4444',
          shadowColor: '#14532D',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 3,
          gap: 16,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Total Refund Amount
              </Text>
              <Text style={{ fontSize: 32, fontWeight: '900', color: '#111827', marginTop: 4 }}>
                ₹{formatMoney(numericAmount)}
              </Text>
            </View>

            {/* Status Pill Badge */}
            <View style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor:
                refundStatus === 'DONE' ? '#DCFCE7' :
                refundStatus === 'IN_PROCESS' ? '#DBEAFE' :
                refundStatus === 'PENDING_ADMIN' ? '#FEF3C7' : '#FEE2E2',
              borderWidth: 1,
              borderColor:
                refundStatus === 'DONE' ? '#86EFAC' :
                refundStatus === 'IN_PROCESS' ? '#93C5FD' :
                refundStatus === 'PENDING_ADMIN' ? '#FDE68A' : '#FCA5A5',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}>
              <Feather
                name={
                  refundStatus === 'DONE' ? 'check-circle' :
                  refundStatus === 'IN_PROCESS' ? 'shield' :
                  refundStatus === 'PENDING_ADMIN' ? 'clock' : 'alert-circle'
                }
                size={14}
                color={
                  refundStatus === 'DONE' ? '#15803D' :
                  refundStatus === 'IN_PROCESS' ? '#1D4ED8' :
                  refundStatus === 'PENDING_ADMIN' ? '#B45309' : '#B91C1C'
                }
              />
              <Text style={{
                fontSize: 12,
                fontWeight: '800',
                color:
                  refundStatus === 'DONE' ? '#15803D' :
                  refundStatus === 'IN_PROCESS' ? '#1D4ED8' :
                  refundStatus === 'PENDING_ADMIN' ? '#B45309' : '#B91C1C',
              }}>
                {refundStatus === 'DONE' && 'Refund Completed'}
                {refundStatus === 'IN_PROCESS' && 'Admin Approved • In Process'}
                {refundStatus === 'PENDING_ADMIN' && 'Pending Admin Approval'}
                {refundStatus === 'FAILED' && 'Refund Not Done / Failed'}
              </Text>
            </View>
          </View>

          {/* Admin Approval Notice Callout */}
          <View style={{
            backgroundColor:
              refundStatus === 'DONE' ? '#F0FDF4' :
              refundStatus === 'IN_PROCESS' ? '#EFF6FF' :
              refundStatus === 'PENDING_ADMIN' ? '#FFFBEB' : '#FEF2F2',
            borderRadius: 14,
            padding: 14,
            borderLeftWidth: 4,
            borderLeftColor:
              refundStatus === 'DONE' ? '#10B981' :
              refundStatus === 'IN_PROCESS' ? '#3B82F6' :
              refundStatus === 'PENDING_ADMIN' ? '#F59E0B' : '#EF4444',
          }}>
            {refundStatus === 'PENDING_ADMIN' && (
              <Text style={{ fontSize: 13, color: '#92400E', lineHeight: 20, fontWeight: '600' }}>
                🛡️ <Text style={{ fontWeight: '800' }}>Admin Verification in Progress:</Text> For online payment orders, the refund amount of ₹{formatMoney(numericAmount)} will be initiated as soon as the Admin approves the cancellation in the Admin Portal.
              </Text>
            )}
            {refundStatus === 'IN_PROCESS' && (
              <Text style={{ fontSize: 13, color: '#1E40AF', lineHeight: 20, fontWeight: '600' }}>
                🛡️ <Text style={{ fontWeight: '800' }}>Approved by Admin:</Text> The Delimo Admin has approved your order cancellation. A refund of ₹{formatMoney(numericAmount)} was initiated to your payment gateway (Cashfree/Bank). It usually takes 2-4 business days to reflect in your account.
              </Text>
            )}
            {refundStatus === 'DONE' && (
              <Text style={{ fontSize: 13, color: '#166534', lineHeight: 20, fontWeight: '600' }}>
                🎉 <Text style={{ fontWeight: '800' }}>Admin Approved & Refund Done:</Text> Great news! The refund of ₹{formatMoney(numericAmount)} was approved by admin and successfully credited back to your original payment method (UPI / Bank Account).
              </Text>
            )}
            {refundStatus === 'FAILED' && (
              <Text style={{ fontSize: 13, color: '#991B1B', lineHeight: 20, fontWeight: '600' }}>
                ⚠️ <Text style={{ fontWeight: '800' }}>Action Required:</Text> The refund could not be completed automatically by the banking partner. Our operations team is available to assist with manual bank payout.
              </Text>
            )}
          </View>

          {/* Quick Key-Value Information */}
          <View style={{ gap: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600' }}>Admin Approval</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather
                  name={refundStatus === 'PENDING_ADMIN' ? 'clock' : (refundStatus === 'FAILED' ? 'x-circle' : 'check-circle')}
                  size={13}
                  color={refundStatus === 'PENDING_ADMIN' ? '#D97706' : (refundStatus === 'FAILED' ? '#DC2626' : '#15803D')}
                />
                <Text style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: refundStatus === 'PENDING_ADMIN' ? '#D97706' : (refundStatus === 'FAILED' ? '#DC2626' : '#15803D'),
                }}>
                  {refundStatus === 'PENDING_ADMIN' ? 'Under Admin Review' : (refundStatus === 'FAILED' ? 'Declined / Issue' : 'Approved by Admin')}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600' }}>Refund ID</Text>
              <Pressable onPress={() => copyToClipboard(refundId, 'Refund ID')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, color: '#111827', fontWeight: '800' }}>{refundId}</Text>
                <Feather name="copy" size={13} color="#15803D" />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600' }}>Bank ARN / Ref</Text>
              <Pressable onPress={() => copyToClipboard(arnNumber, 'ARN Number')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, color: '#111827', fontWeight: '800' }}>{arnNumber}</Text>
                <Feather name="copy" size={13} color="#15803D" />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600' }}>Payment Mode</Text>
              <Text style={{ fontSize: 13, color: '#111827', fontWeight: '700' }}>Online Payment (UPI / NetBanking)</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600' }}>Expected By</Text>
              <Text style={{ fontSize: 13, color: '#14532D', fontWeight: '800' }}>
                {refundStatus === 'DONE' ? 'Credited Today' : (refundStatus === 'PENDING_ADMIN' ? 'Awaiting Admin Approval' : 'Within 2-4 business days')}
              </Text>
            </View>
          </View>
        </View>

        {/* 4-Step Refund Timeline featuring Admin Approval */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          shadowColor: '#14532D',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Feather name="activity" size={18} color="#14532D" />
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>
              Refund Journey Timeline
            </Text>
          </View>

          <View style={{ paddingLeft: 4 }}>
            {/* Step 1: Cancellation Requested */}
            <TimelineItem
              isFirst
              isCompleted={true}
              title="Order Cancellation Requested"
              desc="Cancellation request registered. Sent to Admin Operations for review."
              time={formattedDate}
            />

            {/* Step 2: Admin Approval */}
            <TimelineItem
              isCompleted={refundStatus === 'IN_PROCESS' || refundStatus === 'DONE'}
              isCurrent={refundStatus === 'PENDING_ADMIN'}
              isFailed={refundStatus === 'FAILED'}
              title="Admin Approval & Authorization"
              desc={
                refundStatus === 'PENDING_ADMIN'
                  ? 'Delimo Admin is reviewing the cancellation request in Admin Portal.'
                  : refundStatus === 'FAILED'
                  ? 'Admin flagged an issue or rejected the cancellation.'
                  : 'Delimo Admin approved cancellation and authorized refund release.'
              }
              time={refundStatus === 'PENDING_ADMIN' ? 'In Review' : 'Approved ✓'}
            />

            {/* Step 3: Refund Initiated */}
            <TimelineItem
              isCompleted={refundStatus === 'DONE'}
              isCurrent={refundStatus === 'IN_PROCESS'}
              title="Refund Initiated to Gateway"
              desc={
                refundStatus === 'PENDING_ADMIN'
                  ? 'Will be initiated immediately once Admin approves.'
                  : 'Reversal request dispatched to Cashfree / banking partner.'
              }
              time={refundStatus === 'PENDING_ADMIN' ? 'Pending Approval' : 'Dispatched'}
            />

            {/* Step 4: Bank Processing & Credit */}
            <TimelineItem
              isLast
              isCompleted={refundStatus === 'DONE'}
              isFailed={refundStatus === 'FAILED'}
              title={refundStatus === 'FAILED' ? 'Refund Paused' : 'Refund Credited to Source'}
              desc={
                refundStatus === 'DONE'
                  ? 'Funds successfully posted into your original payment account.'
                  : refundStatus === 'FAILED'
                  ? 'Customer support assistance required for manual payout.'
                  : 'Estimated arrival in 2-4 business days.'
              }
              time={refundStatus === 'DONE' ? 'Credited' : 'Pending Bank Sync'}
            />
          </View>
        </View>

        {/* Order Details & Summary Breakdown */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          gap: 12,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="file-text" size={18} color="#14532D" />
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>
              Cancelled Order Summary
            </Text>
          </View>

          <View style={{ gap: 8, paddingTop: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>Order Reference</Text>
              <Text style={{ fontSize: 13, color: '#111827', fontWeight: '700' }}>#{displayOrderNum}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>Payment Method</Text>
              <Text style={{ fontSize: 13, color: '#15803D', fontWeight: '800' }}>Online Payment</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>Refund Policy</Text>
              <Text style={{ fontSize: 13, color: '#111827', fontWeight: '700' }}>Refund on Admin Approval</Text>
            </View>
            <View style={{ height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: '#111827', fontWeight: '800' }}>Total Amount To Refund</Text>
              <Text style={{ fontSize: 15, color: '#15803D', fontWeight: '900' }}>₹{formatMoney(numericAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Customer Support CTA */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          alignItems: 'center',
          gap: 12,
        }}>
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#DCFCE7',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Feather name="headphones" size={24} color="#15803D" />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', textAlign: 'center' }}>
            Need help with your refund?
          </Text>
          <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 }}>
            Our 24/7 customer support and finance team can check the admin approval status and trace your bank reversal anytime.
          </Text>

          <Pressable
            onPress={() => setIsSupportModalOpen(true)}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#0F3E22' : '#14532D',
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: '#FCD34D',
              shadowColor: '#14532D',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            })}
          >
            <Feather name="message-square" size={16} color="#FCD34D" />
            <Text style={{ color: '#FCD34D', fontWeight: '800', fontSize: 14 }}>
              Chat with Customer Support
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Customer Support Modal */}
      <CustomerSupportModal
        visible={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        activeOrderId={orderId}
      />

      {/* Toast Notification */}
      <Toast
        visible={Boolean(toast)}
        message={toast?.message ?? ''}
        variant={toast?.variant ?? 'info'}
        accessibilityLabel={toast?.message ?? 'Toast'}
        onDismiss={() => setToast(null)}
      />
    </SafeAreaView>
  );
}

function TimelineItem({
  title,
  desc,
  time,
  isCompleted,
  isCurrent,
  isFailed,
  isFirst,
  isLast,
}: {
  title: string;
  desc: string;
  time: string;
  isCompleted?: boolean;
  isCurrent?: boolean;
  isFailed?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  let circleColor = '#E5E7EB';
  let iconName: 'check' | 'clock' | 'alert-triangle' | 'circle' = 'circle';
  let iconColor = '#9CA3AF';

  if (isCompleted) {
    circleColor = '#10B981';
    iconName = 'check';
    iconColor = '#FFFFFF';
  } else if (isCurrent) {
    circleColor = '#F59E0B';
    iconName = 'clock';
    iconColor = '#FFFFFF';
  } else if (isFailed) {
    circleColor = '#EF4444';
    iconName = 'alert-triangle';
    iconColor = '#FFFFFF';
  }

  return (
    <View style={{ flexDirection: 'row', minHeight: 68 }}>
      {/* Indicator line & circle */}
      <View style={{ alignItems: 'center', width: 28, marginRight: 12 }}>
        <View style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: circleColor,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}>
          <Feather name={iconName} size={12} color={iconColor} />
        </View>
        {!isLast && (
          <View style={{
            flex: 1,
            width: 2,
            backgroundColor: isCompleted ? '#10B981' : '#E5E7EB',
            marginVertical: 2,
          }} />
        )}
      </View>

      {/* Text Info */}
      <View style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '800',
            color: isFailed ? '#B91C1C' : (isCompleted || isCurrent ? '#111827' : '#9CA3AF'),
          }}>
            {title}
          </Text>
          <Text style={{
            fontSize: 11,
            color: isCurrent ? '#D97706' : '#6B7280',
            fontWeight: '600',
          }}>
            {time}
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: '#4B5563', lineHeight: 18, marginTop: 2 }}>
          {desc}
        </Text>
      </View>
    </View>
  );
}
