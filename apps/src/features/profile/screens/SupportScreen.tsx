import React, { useState } from 'react';
import {
  View,
  StatusBar,
  ScrollView,
  Pressable,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Text, useTheme } from 'foodie-shared-rn';
import { CustomerSupportModal } from '../components/CustomerSupportModal';
import { useGetMyProfileQuery } from '../../../api/endpoints/usersApi';
import { useGetMyConversationsQuery } from '../../../api/endpoints/supportApi';

const FAQ_ITEMS = [
  {
    question: 'How do I track my active order?',
    answer: 'Go to the Orders tab in the bottom bar and tap on your live order to view rider location, cooking status, and estimated delivery time.',
  },
  {
    question: 'How does refund processing work?',
    answer: 'Once an order cancellation is approved, online refunds are processed instantly back to your source account or Foodie Wallet within 2-4 hours.',
  },
  {
    question: 'Can I change my delivery address?',
    answer: 'Yes! Tap on the location header on the Home screen to select another saved address or add a new delivery pin.',
  },
  {
    question: 'What is Foodie Wallet?',
    answer: 'Your Foodie Wallet stores instant cashback, refunds, and credits that can be automatically applied with one tap at checkout.',
  },
];

export function SupportScreen({ navigation }: any) {
  const { tokens } = useTheme();
  const { data: userProfile } = useGetMyProfileQuery();
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const { data: conversations, isLoading } = useGetMyConversationsQuery(undefined, {
    pollingInterval: 5000,
  });

  const activeTickets = conversations?.filter((c) => c.status !== 'CLOSED') || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#012B18' }} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#012B18" barStyle="light-content" />

      {/* Curved Header */}
      <LinearGradient
        colors={['#012B18', '#053E23', '#0A4D2E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: 20,
          paddingBottom: 24,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          borderBottomWidth: 1.2,
          borderBottomColor: 'rgba(252, 211, 77, 0.25)',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
          elevation: 6,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: '#FCD34D', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>
              Help & Support
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4, fontWeight: '600' }}>
              24×7 Instant customer assistance
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#10B981',
              gap: 5,
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
            <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800' }}>ONLINE</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#0A120E' }}
        contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 18 }}
      >
        {/* Live Support Banner */}
        <LinearGradient
          colors={['#053E23', '#0A4D2E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 22,
            padding: 20,
            borderWidth: 1.2,
            borderColor: 'rgba(252, 211, 77, 0.35)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(252, 211, 77, 0.15)',
                borderWidth: 1,
                borderColor: '#FCD34D',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Feather name="headphones" size={24} color="#FCD34D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '900' }}>
                Need Help With An Order?
              </Text>
              <Text style={{ color: '#D1FAE5', fontSize: 12, marginTop: 2 }}>
                Chat live with our dedicated support agents
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => setSupportModalVisible(true)}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#EAB308' : '#FCD34D',
              paddingVertical: 14,
              borderRadius: 14,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              marginTop: 4,
              shadowColor: '#FCD34D',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
              elevation: 3,
            })}
          >
            <Feather name="message-square" size={17} color="#022414" />
            <Text style={{ color: '#022414', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 }}>
              Start Live Chat ➔
            </Text>
          </Pressable>
        </LinearGradient>

        {/* Quick Contact Options */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() => {
              Linking.openURL('tel:18001234567').catch(() => {});
            }}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: '#131F18',
              borderRadius: 18,
              padding: 16,
              borderWidth: 1.2,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              alignItems: 'center',
              gap: 8,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(252, 211, 77, 0.12)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Feather name="phone-call" size={18} color="#FCD34D" />
            </View>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Call Support</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 11 }}>Toll-Free 24×7</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Linking.openURL('mailto:support@foodie.com?subject=Customer%20Support%20Enquiry').catch(() => {});
            }}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: '#131F18',
              borderRadius: 18,
              padding: 16,
              borderWidth: 1.2,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              alignItems: 'center',
              gap: 8,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Feather name="mail" size={18} color="#10B981" />
            </View>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Email Us</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 11 }}>Fast reply inbox</Text>
          </Pressable>
        </View>

        {/* Active Support Tickets */}
        {activeTickets.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={{ color: '#FCD34D', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 }}>
              Your Active Enquiries ({activeTickets.length})
            </Text>
            {activeTickets.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setSupportModalVisible(true)}
                style={{
                  backgroundColor: '#131F18',
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1.2,
                  borderColor: 'rgba(252, 211, 77, 0.25)',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>{t.subject}</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>Ticket #{t.id}</Text>
                </View>
                <View
                  style={{
                    backgroundColor: 'rgba(252, 211, 77, 0.15)',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: '#FCD34D', fontSize: 11, fontWeight: '800' }}>{t.status}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Frequently Asked Questions */}
        <View style={{ gap: 12, marginTop: 4 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.3 }}>
            Frequently Asked Questions
          </Text>

          {FAQ_ITEMS.map((faq, index) => {
            const isExpanded = expandedFaq === index;
            return (
              <Pressable
                key={faq.question}
                onPress={() => setExpandedFaq(isExpanded ? null : index)}
                style={{
                  backgroundColor: '#131F18',
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1.2,
                  borderColor: isExpanded ? 'rgba(252, 211, 77, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14, flex: 1, marginRight: 8 }}>
                    {faq.question}
                  </Text>
                  <Feather
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#FCD34D"
                  />
                </View>
                {isExpanded && (
                  <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 10, lineHeight: 18 }}>
                    {faq.answer}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Embedded Live 2-Way Chat Modal */}
      <CustomerSupportModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
        customerName={userProfile?.fullName || 'Customer'}
        customerEmail={userProfile?.email || 'customer@foodie.com'}
        customerPhone={userProfile?.phoneNumber || '+91 98765 43210'}
      />
    </SafeAreaView>
  );
}
