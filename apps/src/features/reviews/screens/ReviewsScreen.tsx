import React, { useEffect, useState, useRef } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  View,
  StatusBar,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  EmptyState,
  Modal,
  Text,
  TextInput,
  Toast,
  trackAnalyticsEvent,
  useApiErrorHandler,
  useConnectivity,
  useTheme,
} from 'foodie-shared-rn';
import { FontAwesome } from '@expo/vector-icons';
import {
  useGetOrderQuery,
  useGetDeliveryPartnerQuery,
} from '../../../api/endpoints/ordersApi';
import {
  useGetRestaurantQuery,
  useGetRestaurantReviewsQuery,
} from '../../../api/endpoints/restaurantsApi';
import { useSubmitReviewMutation } from '../../../api/endpoints/reviewsApi';
import { toUnwrappedApiError } from '../../auth/apiError';
import { isOrderId } from '../../orders/types';
import { isRestaurantId } from '../../restaurants/types';
import type {
  BrowseStackParamList,
  OrdersStackParamList,
} from '../../../navigation/types';
import { ReviewListItem } from '../components/ReviewListItem';
import { ReviewListSkeleton } from '../components/ReviewListSkeleton';
import {
  MAX_REVIEW_COMMENT_LENGTH,
  validateDeliveryRating,
  validateRestaurantRating,
  validateReviewComment,
} from '../types';

type OrdersProps = NativeStackScreenProps<OrdersStackParamList, 'Reviews'>;
type BrowseProps = NativeStackScreenProps<BrowseStackParamList, 'Reviews'>;
type Props = OrdersProps | BrowseProps;

const RESTAURANT_TAGS = [
  'Delicious Taste 😋',
  'Fresh & Hot 🔥',
  'Generous Portion 🍱',
  'Neat Packaging 📦',
  'Value for Money 💰',
  'Proper Seasoning 🧂',
];

const DELIVERY_TAGS = [
  'Super Fast ⚡',
  'Polite & Courteous 😊',
  'Handled with Care 🛡️',
  'Followed Directions 📍',
  'Contactless Drop 🚪',
];

function getRestaurantDescriptor(rating: number): { text: string; color: string; bg: string } {
  switch (rating) {
    case 5:
      return { text: '⭐ 5.0 — Exceptional taste & food quality!', color: '#047857', bg: '#ECFDF5' };
    case 4:
      return { text: '⭐ 4.0 — Delicious & well prepared', color: '#0D9488', bg: '#F0FDFA' };
    case 3:
      return { text: '⭐ 3.0 — Average taste & portion', color: '#D97706', bg: '#FFFBEB' };
    case 2:
      return { text: '⭐ 2.0 — Below expectations', color: '#EA580C', bg: '#FFF7ED' };
    case 1:
      return { text: '⭐ 1.0 — Poor quality or taste', color: '#DC2626', bg: '#FEF2F2' };
    default:
      return { text: 'Tap stars to rate dining experience', color: '#6B7280', bg: '#F3F4F6' };
  }
}

function getDeliveryDescriptor(rating: number | null): { text: string; color: string; bg: string } {
  if (rating === null) {
    return { text: 'Optional — Tap stars to rate delivery partner', color: '#6B7280', bg: '#F3F4F6' };
  }
  switch (rating) {
    case 5:
      return { text: '⭐ 5.0 — Super fast & polite delivery!', color: '#047857', bg: '#ECFDF5' };
    case 4:
      return { text: '⭐ 4.0 — Quick & courteous handling', color: '#0D9488', bg: '#F0FDFA' };
    case 3:
      return { text: '⭐ 3.0 — On-time arrival', color: '#D97706', bg: '#FFFBEB' };
    case 2:
      return { text: '⭐ 2.0 — Delayed delivery', color: '#EA580C', bg: '#FFF7ED' };
    case 1:
      return { text: '⭐ 1.0 — Rude behavior or damaged package', color: '#DC2626', bg: '#FEF2F2' };
    default:
      return { text: 'Tap stars to rate delivery executive', color: '#6B7280', bg: '#F3F4F6' };
  }
}

export function ReviewsScreen({ navigation, route }: Props) {
  const { tokens } = useTheme();
  const { isConnected } = useConnectivity();
  const mode = route.params.mode;
  const orderId = route.params.orderId;
  const restaurantIdParam = route.params.restaurantId;

  // Separate Restaurant Rating & Feedback State
  const [restaurantRating, setRestaurantRating] = useState(5);
  const [restaurantComment, setRestaurantComment] = useState('');
  const [selectedRestaurantTags, setSelectedRestaurantTags] = useState<string[]>([]);

  // Separate Delivery Rating & Feedback State
  const [deliveryRating, setDeliveryRating] = useState<number | null>(5);
  const [deliveryComment, setDeliveryComment] = useState('');
  const [selectedDeliveryTags, setSelectedDeliveryTags] = useState<string[]>([]);

  const [alreadyExistsVisible, setAlreadyExistsVisible] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);

  const scaleValue = useRef(new Animated.Value(0.95)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  const validOrderId = Boolean(orderId && isOrderId(orderId));
  const orderQuery = useGetOrderQuery(orderId ?? '', {
    skip: mode !== 'submit' || !validOrderId,
  });

  const restaurantId =
    restaurantIdParam && isRestaurantId(restaurantIdParam)
      ? restaurantIdParam
      : orderQuery.data?.restaurantId && isRestaurantId(orderQuery.data.restaurantId)
        ? orderQuery.data.restaurantId
        : undefined;

  const restaurantQuery = useGetRestaurantQuery(restaurantId ?? '', {
    skip: !restaurantId,
  });

  const partnerQuery = useGetDeliveryPartnerQuery(validOrderId ? (orderId ?? '') : '', {
    skip: mode !== 'submit' || !validOrderId,
  });

  const reviewsQuery = useGetRestaurantReviewsQuery(
    { restaurantId: restaurantId ?? '', sort: 'createdAt' },
    { skip: mode !== 'list' || !restaurantId },
  );

  const [submitReview, submitState] = useSubmitReviewMutation();

  const handleError = useApiErrorHandler({
    onToast: (error) => setToast({ message: error.message, variant: 'error' }),
    onModalBlocking: (error) => setToast({ message: error.message, variant: 'error' }),
    onInlineField: (error) => setToast({ message: error.message, variant: 'error' }),
    onFullScreen: (error) => setToast({ message: error.message, variant: 'error' }),
    onGeneric: (error) => setToast({ message: error.message, variant: 'error' }),
  });

  useEffect(() => {
    trackAnalyticsEvent('customer_reviews_viewed', { mode, orderId, restaurantId });
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [mode, orderId, restaurantId]);

  const toggleRestaurantTag = (tag: string) => {
    setSelectedRestaurantTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const toggleDeliveryTag = (tag: string) => {
    setSelectedDeliveryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const onSubmit = async () => {
    if (!validOrderId || !orderId) {
      setToast({ message: 'Invalid order.', variant: 'error' });
      return;
    }
    const ratingResult = validateRestaurantRating(restaurantRating);
    if (!ratingResult.ok) {
      setToast({ message: ratingResult.message, variant: 'error' });
      return;
    }
    const deliveryResult = validateDeliveryRating(deliveryRating);
    if (!deliveryResult.ok) {
      setToast({ message: deliveryResult.message, variant: 'error' });
      return;
    }

    const commentParts: string[] = [];
    const restoDetails: string[] = [];
    if (selectedRestaurantTags.length > 0) {
      restoDetails.push(selectedRestaurantTags.join(', '));
    }
    if (restaurantComment.trim()) {
      restoDetails.push(restaurantComment.trim());
    }
    if (restoDetails.length > 0) {
      commentParts.push(`[Food & Dining]: ${restoDetails.join(' • ')}`);
    }

    const deliveryDetails: string[] = [];
    if (selectedDeliveryTags.length > 0) {
      deliveryDetails.push(selectedDeliveryTags.join(', '));
    }
    if (deliveryComment.trim()) {
      deliveryDetails.push(deliveryComment.trim());
    }
    if (deliveryDetails.length > 0) {
      commentParts.push(`[Delivery Service]: ${deliveryDetails.join(' • ')}`);
    }

    const fullComment = commentParts.join('\n\n');
    const commentResult = validateReviewComment(fullComment);
    if (!commentResult.ok) {
      setToast({ message: commentResult.message, variant: 'error' });
      return;
    }

    if (!isConnected) {
      setToast({ message: 'Connect to the internet to submit a review.', variant: 'warning' });
      return;
    }
    if (orderQuery.data && orderQuery.data.status !== 'DELIVERED') {
      setToast({ message: 'Only delivered orders can be rated.', variant: 'error' });
      return;
    }

    try {
      await submitReview({
        orderId,
        restaurantRating: ratingResult.rating,
        deliveryRating: deliveryResult.rating,
        comment: commentResult.comment,
      }).unwrap();
      trackAnalyticsEvent('review_submitted', { orderId });
      trackAnalyticsEvent('review_created', { orderId });
      setToast({ message: 'Reviews submitted successfully. Thank you!', variant: 'success' });
      if (restaurantId) {
        (navigation as OrdersProps['navigation'] & BrowseProps['navigation']).replace('Reviews', {
          mode: 'list',
          restaurantId,
        });
      } else {
        (navigation as OrdersProps['navigation']).navigate('MyOrders');
      }
    } catch (error) {
      const unwrapped = toUnwrappedApiError(error);
      if (unwrapped.code === 'REVIEW_ALREADY_EXISTS') {
        setAlreadyExistsVisible(true);
        return;
      }
      handleError(unwrapped);
    }
  };

  if (mode === 'list') {
    if (!restaurantId) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#14532D' }}>
          <View style={{ flex: 1, backgroundColor: '#F2F2F7', justifyContent: 'center', padding: 24 }}>
            <EmptyState
              title="Restaurant required"
              description="Open reviews from a restaurant to see public ratings."
              accessibilityLabel="Reviews list missing restaurant"
              actionLabel="Back"
              onAction={() => navigation.goBack()}
            />
          </View>
        </SafeAreaView>
      );
    }

    const items = reviewsQuery.data ?? [];

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#14532D' }}>
        <StatusBar backgroundColor="#14532D" barStyle="light-content" />
        <Animated.View style={{ flex: 1, backgroundColor: '#F2F2F7', opacity: fadeValue, transform: [{ scale: scaleValue }] }}>
          {/* Header Banner */}
          <View style={{
            paddingVertical: 20,
            paddingHorizontal: 20,
            backgroundColor: '#14532D',
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            paddingBottom: 28,
            shadowColor: '#14532D',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 5,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <View>
              <Text style={{ color: '#FCD34D', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 }}>
                Restaurant Reviews
              </Text>
              <Text style={{ color: '#A7F3D0', fontSize: 13, marginTop: 4, fontWeight: '600' }}>
                Customer dining feedback logs
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.goBack()}
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.25)',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Back</Text>
            </Pressable>
          </View>

          <FlatList
            data={items}
            keyExtractor={(item, index) => `${item.createdAt ?? 'review'}-${item.restaurantRating}-${index}`}
            contentContainerStyle={{
              padding: 16,
              gap: 12,
              paddingBottom: 48,
            }}
            refreshControl={
              <RefreshControl
                refreshing={reviewsQuery.isFetching}
                onRefresh={() => { void reviewsQuery.refetch(); }}
                tintColor="#FCD34D"
              />
            }
            ListEmptyComponent={
              reviewsQuery.isLoading ? (
                <ReviewListSkeleton />
              ) : (
                <EmptyState
                  title="No reviews yet"
                  description="Be the first to review after an order."
                  accessibilityLabel="Restaurant reviews empty"
                />
              )
            }
            renderItem={({ item }) => <ReviewListItem review={item} />}
          />
        </Animated.View>
      </SafeAreaView>
    );
  }

  // submit mode
  if (!validOrderId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#14532D' }} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, backgroundColor: '#F2F2F7', justifyContent: 'center', padding: 24 }}>
          <EmptyState
            title="Invalid order"
            description="This review link is not valid."
            accessibilityLabel="Invalid review order"
            actionLabel="Back"
            onAction={() => navigation.goBack()}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (orderQuery.data && orderQuery.data.status !== 'DELIVERED') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#14532D' }} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, backgroundColor: '#F2F2F7', justifyContent: 'center', padding: 24 }}>
          <EmptyState
            title="Order Not Delivered Yet"
            description="Rating will be available once your order has been delivered."
            accessibilityLabel="Order not delivered yet"
            actionLabel="Back to Order"
            onAction={() => navigation.goBack()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const restaurantDescriptor = getRestaurantDescriptor(restaurantRating);
  const deliveryDescriptor = getDeliveryDescriptor(deliveryRating);
  const restaurantName = restaurantQuery.data?.name || 'Restaurant Dining';
  const deliveryPartnerName = partnerQuery.data?.fullName || 'Delivery Partner';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#14532D' }} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#14532D" barStyle="light-content" />
      <Animated.View style={{ flex: 1, backgroundColor: '#F2F2F7', opacity: fadeValue, transform: [{ scale: scaleValue }] }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} bounces={false}>
          {/* Curved top header */}
          <View style={{
            paddingTop: 16,
            paddingBottom: 28,
            paddingHorizontal: 20,
            backgroundColor: '#14532D',
            borderBottomLeftRadius: 36,
            borderBottomRightRadius: 36,
            alignItems: 'center',
            shadowColor: '#14532D',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 5,
          }}>
            <Text style={{ color: '#FCD34D', fontSize: 26, fontWeight: '900', textAlign: 'center' }}>
              Submit Feedback
            </Text>
            <Text style={{ color: '#A7F3D0', fontWeight: '700', fontSize: 14, marginTop: 4 }}>
              Rate your food and delivery experience separately
            </Text>
            {orderQuery.data && (
              <View style={{
                backgroundColor: 'rgba(252, 211, 77, 0.15)',
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                marginTop: 12,
                borderWidth: 1.2,
                borderColor: 'rgba(252, 211, 77, 0.3)',
              }}>
                <Text style={{ color: '#FEF3C7', fontWeight: '800', fontSize: 13 }}>
                  Reference #{orderQuery.data.orderNumber}
                </Text>
              </View>
            )}
          </View>

          {!isConnected && (
            <View style={{ marginHorizontal: 16, marginTop: 12, padding: 12, backgroundColor: '#FEE2E2', borderRadius: 12 }}>
              <Text style={{ color: '#B91C1C', fontWeight: '800', fontSize: 13, textAlign: 'center' }}>
                Offline — submit is blocked
              </Text>
            </View>
          )}

          {/* MAIN CONTAINER FOR SEPARATE CARDS */}
          <View style={{ paddingHorizontal: 16, marginTop: -14, gap: 16 }}>

            {/* CARD 1: RESTAURANT & FOOD EXPERIENCE */}
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 20,
              borderWidth: 1.5,
              borderColor: '#E5E7EB',
              shadowColor: '#14532D',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 10,
              elevation: 3,
              gap: 16,
            }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: '#ECFDF5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#A7F3D0',
                  }}>
                    <FontAwesome name="cutlery" size={20} color="#047857" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>
                      Restaurant & Food
                    </Text>
                    <Text style={{ fontSize: 13, color: '#047857', fontWeight: '700', marginTop: 1 }}>
                      {restaurantName}
                    </Text>
                  </View>
                </View>

                <View style={{
                  backgroundColor: '#DCFCE7',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>
                    Required
                  </Text>
                </View>
              </View>

              {/* Star Rating Controls */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151' }}>
                  Food Quality & Taste Rating:
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isSelected = star <= restaurantRating;
                    return (
                      <Pressable
                        key={star}
                        onPress={() => setRestaurantRating(star)}
                        accessibilityRole="button"
                        accessibilityLabel={`${star} stars for restaurant`}
                        style={({ pressed }) => ({
                          padding: 4,
                          transform: [{ scale: pressed ? 1.25 : isSelected ? 1.08 : 1 }],
                        })}
                      >
                        <FontAwesome
                          name={isSelected ? 'star' : 'star-o'}
                          size={38}
                          color={isSelected ? '#F59E0B' : '#D1D5DB'}
                        />
                      </Pressable>
                    );
                  })}
                </View>

                {/* Rating Descriptor Badge */}
                <View style={{
                  backgroundColor: restaurantDescriptor.bg,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  alignSelf: 'flex-start',
                  marginTop: 2,
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: restaurantDescriptor.color }}>
                    {restaurantDescriptor.text}
                  </Text>
                </View>
              </View>

              {/* Quick Tags */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#4B5563' }}>
                  What did you like about the food?
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {RESTAURANT_TAGS.map((tag) => {
                    const isSelected = selectedRestaurantTags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        onPress={() => toggleRestaurantTag(tag)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 20,
                          backgroundColor: isSelected ? '#ECFDF5' : '#F9FAFB',
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#059669' : '#E5E7EB',
                        }}
                      >
                        <Text style={{
                          fontSize: 12,
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? '#047857' : '#4B5563',
                        }}>
                          {tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Restaurant Notes */}
              <TextInput
                label="Restaurant & Dining Notes"
                value={restaurantComment}
                onChangeText={setRestaurantComment}
                accessibilityLabel="Restaurant feedback notes"
                multiline
                maxLength={MAX_REVIEW_COMMENT_LENGTH}
                placeholder="Share details about flavor, freshness, spices, and preparation..."
                containerStyle={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: '#E5E7EB',
                  height: 85,
                  padding: 12,
                }}
              />
            </View>

            {/* CARD 2: DELIVERY PARTNER EXPERIENCE */}
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 20,
              borderWidth: 1.5,
              borderColor: '#E5E7EB',
              shadowColor: '#14532D',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 10,
              elevation: 3,
              gap: 16,
            }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: '#FEF3C7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#FDE68A',
                  }}>
                    <FontAwesome name="motorcycle" size={20} color="#D97706" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>
                      Delivery Executive
                    </Text>
                    <Text style={{ fontSize: 13, color: '#D97706', fontWeight: '700', marginTop: 1 }}>
                      {deliveryPartnerName}
                    </Text>
                  </View>
                </View>

                <View style={{
                  backgroundColor: deliveryRating !== null ? '#FEF3C7' : '#F3F4F6',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}>
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: deliveryRating !== null ? '#B45309' : '#6B7280',
                  }}>
                    {deliveryRating !== null ? 'Rated' : 'Optional'}
                  </Text>
                </View>
              </View>

              {/* Star Rating Controls */}
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151' }}>
                    Delivery Service Rating:
                  </Text>
                  {deliveryRating !== null && (
                    <Pressable
                      onPress={() => {
                        setDeliveryRating(null);
                        setSelectedDeliveryTags([]);
                      }}
                    >
                      <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '700' }}>
                        Clear rating
                      </Text>
                    </Pressable>
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isSelected = deliveryRating !== null && star <= deliveryRating;
                    return (
                      <Pressable
                        key={star}
                        onPress={() => setDeliveryRating(star)}
                        accessibilityRole="button"
                        accessibilityLabel={`${star} stars for delivery`}
                        style={({ pressed }) => ({
                          padding: 4,
                          transform: [{ scale: pressed ? 1.25 : isSelected ? 1.08 : 1 }],
                        })}
                      >
                        <FontAwesome
                          name={isSelected ? 'star' : 'star-o'}
                          size={38}
                          color={isSelected ? '#F59E0B' : '#D1D5DB'}
                        />
                      </Pressable>
                    );
                  })}
                </View>

                {/* Rating Descriptor Badge */}
                <View style={{
                  backgroundColor: deliveryDescriptor.bg,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  alignSelf: 'flex-start',
                  marginTop: 2,
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: deliveryDescriptor.color }}>
                    {deliveryDescriptor.text}
                  </Text>
                </View>
              </View>

              {/* Quick Tags */}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#4B5563' }}>
                  How was the delivery handling?
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {DELIVERY_TAGS.map((tag) => {
                    const isSelected = selectedDeliveryTags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        onPress={() => toggleDeliveryTag(tag)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 20,
                          backgroundColor: isSelected ? '#FEF3C7' : '#F9FAFB',
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#D97706' : '#E5E7EB',
                        }}
                      >
                        <Text style={{
                          fontSize: 12,
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? '#B45309' : '#4B5563',
                        }}>
                          {tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Delivery Notes */}
              <TextInput
                label="Delivery Experience Notes (Optional)"
                value={deliveryComment}
                onChangeText={setDeliveryComment}
                accessibilityLabel="Delivery feedback notes"
                multiline
                maxLength={MAX_REVIEW_COMMENT_LENGTH}
                placeholder="Share feedback on delivery speed, rider attitude, handling..."
                containerStyle={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: '#E5E7EB',
                  height: 85,
                  padding: 12,
                }}
              />
            </View>

            {/* ACTION BUTTONS */}
            <View style={{ gap: 10, marginTop: 4 }}>
              <Pressable
                disabled={!isConnected || submitState.isLoading}
                onPress={() => { void onSubmit(); }}
                style={({ pressed }) => ({
                  backgroundColor: pressed || !isConnected ? '#0F3E22' : '#14532D',
                  paddingVertical: 16,
                  borderRadius: 14,
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: '#FCD34D',
                  shadowColor: '#14532D',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 4,
                })}
              >
                <Text style={{ color: '#FCD34D', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 }}>
                  {submitState.isLoading ? 'Submitting Feedback...' : 'Submit Feedback'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => navigation.goBack()}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#F3F4F6' : '#FFFFFF',
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: '#E5E7EB',
                })}
              >
                <Text style={{ color: '#4B5563', fontWeight: '800', fontSize: 14 }}>
                  Cancel
                </Text>
              </Pressable>
            </View>

          </View>
        </ScrollView>

        <Modal
          visible={alreadyExistsVisible}
          onRequestClose={() => setAlreadyExistsVisible(false)}
          title="Already reviewed"
          accessibilityLabel="Review already exists"
        >
          <View style={{ gap: tokens.spacing.md, padding: 8 }}>
            <Text style={{ fontSize: 16, color: '#4B5563', marginBottom: 12 }}>
              You already submitted a review for this order.
            </Text>
            <Button
              label="OK"
              accessibilityLabel="Dismiss already reviewed"
              onPress={() => {
                setAlreadyExistsVisible(false);
                navigation.goBack();
              }}
            />
          </View>
        </Modal>

        <Toast
          visible={Boolean(toast)}
          message={toast?.message ?? ''}
          variant={toast?.variant ?? 'info'}
          accessibilityLabel={toast?.message ?? 'Toast'}
          onDismiss={() => setToast(null)}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

