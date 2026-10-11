import React from 'react';
import { View } from 'react-native';
import { Text } from 'foodie-shared-rn';
import type { RestaurantReview } from '../../restaurants/types';
import { FontAwesome } from '@expo/vector-icons';

type Props = {
  review: RestaurantReview;
};

export function ReviewListItem({ review }: Props) {
  const rating = Number(review.restaurantRating) || 5;

  const renderComment = (comment: string) => {
    const hasStructuredFeedback =
      comment.includes('[Food & Dining]:') ||
      comment.includes('[Delivery Service]:') ||
      comment.includes('[Restaurant]:') ||
      comment.includes('[Delivery]:');

    if (!hasStructuredFeedback) {
      return (
        <Text style={{ fontSize: 14, color: '#111827', fontWeight: '600', marginTop: 4, lineHeight: 20 }}>
          "{comment}"
        </Text>
      );
    }

    const sections = comment.split('\n\n').filter(Boolean);
    return (
      <View style={{ gap: 8, marginTop: 4 }}>
        {sections.map((section, idx) => {
          const isFood =
            section.startsWith('[Food & Dining]:') || section.startsWith('[Restaurant]:');
          const isDelivery =
            section.startsWith('[Delivery Service]:') || section.startsWith('[Delivery]:');

          const cleanText = section
            .replace(/^\[(Food & Dining|Restaurant|Delivery Service|Delivery)\]:\s*/, '')
            .trim();

          return (
            <View
              key={idx}
              style={{
                backgroundColor: isFood ? '#F0FDF4' : isDelivery ? '#FFFBEB' : '#F9FAFB',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                borderLeftWidth: 3.5,
                borderLeftColor: isFood ? '#059669' : isDelivery ? '#D97706' : '#9CA3AF',
                gap: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FontAwesome
                  name={isFood ? 'cutlery' : isDelivery ? 'motorcycle' : 'comment-o'}
                  size={12}
                  color={isFood ? '#047857' : isDelivery ? '#B45309' : '#6B7280'}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: isFood ? '#047857' : isDelivery ? '#B45309' : '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {isFood ? 'Food & Dining' : isDelivery ? 'Delivery Partner' : 'Note'}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: '#1F2937', fontWeight: '600', lineHeight: 18 }}>
                {cleanText}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        gap: 8,
        shadowColor: '#14532D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
      }}
      accessibilityLabel={`Review ${review.restaurantRating} stars`}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <FontAwesome
              key={star}
              name={star <= rating ? 'star' : 'star-o'}
              size={18}
              color={star <= rating ? '#FCD34D' : '#9CA3AF'}
            />
          ))}
        </View>
        {review.createdAt ? (
          <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>
            {new Date(review.createdAt).toLocaleDateString()}
          </Text>
        ) : null}
      </View>

      {review.deliveryRating != null && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 13, color: '#4B5563', fontWeight: '600' }}>Delivery Service:</Text>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <FontAwesome
                key={star}
                name={star <= (review.deliveryRating || 0) ? 'star' : 'star-o'}
                size={12}
                color={star <= (review.deliveryRating || 0) ? '#FCD34D' : '#9CA3AF'}
              />
            ))}
          </View>
        </View>
      )}

      {review.comment ? renderComment(review.comment) : null}
    </View>
  );
}

