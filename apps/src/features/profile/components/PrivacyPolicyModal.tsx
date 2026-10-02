import React from 'react';
import {
  Modal,
  View,
  ScrollView,
  Pressable,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Text } from 'foodie-shared-rn';
import { Feather } from '@expo/vector-icons';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ visible, onClose }: PrivacyPolicyModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}>
        <SafeAreaView style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '92%',
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 10,
          overflow: 'hidden',
          display: 'flex',
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
            backgroundColor: '#F9FAFB',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: '#DCFCE7',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Feather name="shield" size={20} color="#15803D" />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>
                  Privacy Policy
                </Text>
                <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '600' }}>
                  Delimo Platform
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: pressed ? '#E5E7EB' : '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Feather name="x" size={20} color="#374151" />
            </Pressable>
          </View>

          {/* Scrollable Policy Body */}
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 32,
            }}
            showsVerticalScrollIndicator={true}
          >
            {/* Meta info badge */}
            <View style={{
              backgroundColor: '#F0FDF4',
              borderColor: '#BBF7D0',
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 12, color: '#166534', fontWeight: '700' }}>
                Last Updated: October 2, 2026
              </Text>
            </View>

            {/* Intro */}
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
              Welcome to Delimo.
            </Text>
            <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 12 }}>
              Delimo is a food ordering and delivery platform that allows users to discover restaurants, browse food items, place orders, make payments, and track deliveries.
            </Text>
            <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 12 }}>
              We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains what information Delimo collects, why we collect it, how we use it, when we share it, and the choices available to you.
            </Text>
            <Text style={{ fontSize: 14, color: '#374151', lineHeight: 22, fontWeight: '600', marginBottom: 20 }}>
              By accessing or using the Delimo application, website, or services, you agree to the practices described in this Privacy Policy.
            </Text>

            {/* Section 1 */}
            <SectionHeader title="1. Information We Collect" />
            <SectionParagraph text="When you use Delimo, we may collect the following categories of information." />

            <SubSectionHeader title="1.1 Account Information" />
            <SectionParagraph text="When you create an account, we may collect:" />
            <BulletList items={[
              'Full name',
              'Mobile number',
              'Email address',
              'Password or authentication information',
              'Profile picture, if you choose to provide one',
              'Account preferences',
            ]} />

            <SubSectionHeader title="1.2 Delivery Information" />
            <SectionParagraph text="To complete your food delivery, we may collect:" />
            <BulletList items={[
              'Delivery address',
              'Saved addresses',
              'Landmark or delivery instructions',
              'Location information, where you provide permission',
            ]} />
            <SectionParagraph text="This information is used to help restaurants and delivery partners complete your order." />

            <SubSectionHeader title="1.3 Order Information" />
            <SectionParagraph text="We may collect information related to your orders, including:" />
            <BulletList items={[
              'Restaurants you order from',
              'Food items ordered',
              'Order amount',
              'Order date and time',
              'Order status',
              'Delivery information',
              'Cancellation and refund information',
              'Offers, coupons, or discounts used',
              'Customer support requests related to orders',
            ]} />

            <SubSectionHeader title="1.4 Payment Information" />
            <SectionParagraph text="When you make a payment through Delimo, payment information may be processed by authorized third-party payment service providers." />
            <SectionParagraph text="Depending on the payment method, this may include transaction details, payment status, and billing information." />
            <SectionParagraph text="Delimo does not necessarily store complete card, UPI, or banking credentials on its own servers." />

            <SubSectionHeader title="1.5 Device and Technical Information" />
            <SectionParagraph text="We may automatically collect certain technical information, such as:" />
            <BulletList items={[
              'Device type',
              'Operating system',
              'Application version',
              'IP address',
              'Browser information',
              'Device identifiers',
              'Crash reports',
              'Log information',
              'Date and time of application usage',
            ]} />

            <SubSectionHeader title="1.6 Location Information" />
            <SectionParagraph text="With your permission, Delimo may access your location to:" />
            <BulletList items={[
              'Find restaurants near you',
              'Suggest nearby food options',
              'Set your delivery location',
              'Improve delivery accuracy',
              'Track an active delivery',
              'Provide location-based services',
            ]} />
            <SectionParagraph text="You can manage location permissions through your device settings." />

            {/* Section 2 */}
            <SectionHeader title="2. How We Use Your Information" />
            <SectionParagraph text="Delimo may use your information for the following purposes:" />

            <SubSectionHeader title="Providing Our Services" />
            <SectionParagraph text="We use your information to:" />
            <BulletList items={[
              'Create and manage your account',
              'Display restaurants and food items',
              'Process food orders',
              'Coordinate food preparation',
              'Arrange deliveries',
              'Provide order tracking',
              'Process refunds and cancellations',
              'Provide customer support',
            ]} />

            <SubSectionHeader title="Improving Delimo" />
            <SectionParagraph text="We may use information to:" />
            <BulletList items={[
              'Improve application functionality',
              'Understand user preferences',
              'Improve restaurant recommendations',
              'Identify technical problems',
              'Analyze application performance',
              'Develop new features',
              'Improve customer experience',
            ]} />

            <SubSectionHeader title="Security and Fraud Prevention" />
            <SectionParagraph text="We may process information to:" />
            <BulletList items={[
              'Detect suspicious activity',
              'Prevent fraud',
              'Protect user accounts',
              'Prevent unauthorized transactions',
              'Maintain platform security',
              'Investigate misuse of our services',
            ]} />

            <SubSectionHeader title="Communication" />
            <SectionParagraph text="We may contact you regarding:" />
            <BulletList items={[
              'Order confirmations',
              'Delivery updates',
              'Payment notifications',
              'Account-related information',
              'Security alerts',
              'Customer support requests',
              'Important changes to our services',
            ]} />
            <SectionParagraph text="With appropriate permission, we may also send promotional communications about offers, restaurants, discounts, and other Delimo services." />

            {/* Section 3 */}
            <SectionHeader title="3. Information Sharing" />
            <SectionParagraph text="Delimo may share necessary information with selected third parties to provide and operate our services." />

            <SubSectionHeader title="3.1 Restaurants" />
            <SectionParagraph text="When you place an order, we may share relevant information with the restaurant so that it can prepare and fulfill your order. This may include your name, order details, delivery information, and relevant instructions." />

            <SubSectionHeader title="3.2 Delivery Partners" />
            <SectionParagraph text="Information necessary to complete your delivery may be shared with delivery partners. This may include:" />
            <BulletList items={[
              'Name',
              'Delivery address',
              'Contact information where necessary',
              'Order details',
              'Delivery instructions',
              'Relevant location information',
            ]} />

            <SubSectionHeader title="3.3 Payment Providers" />
            <SectionParagraph text="We may share necessary transaction information with authorized payment gateways and financial service providers to process payments, refunds, and related transactions." />

            <SubSectionHeader title="3.4 Service Providers" />
            <SectionParagraph text="Delimo may use trusted third-party providers for services such as:" />
            <BulletList items={[
              'Cloud hosting',
              'Data storage',
              'Analytics',
              'Customer support',
              'Payment processing',
              'Communication services',
              'Security and fraud prevention',
              'Application monitoring',
            ]} />
            <SectionParagraph text="These providers may process information only as necessary to provide their services to Delimo." />

            <SubSectionHeader title="3.5 Legal Requirements" />
            <SectionParagraph text="We may disclose information when required or permitted by applicable law, legal process, court order, or government request." />
            <SectionParagraph text="We may also disclose information when reasonably necessary to protect the rights, safety, property, users, or security of Delimo." />

            {/* Section 4 */}
            <SectionHeader title="4. Cookies and Similar Technologies" />
            <SectionParagraph text="Delimo may use cookies, device identifiers, pixels, SDKs, and similar technologies. These technologies may help us:" />
            <BulletList items={[
              'Keep you signed in',
              'Remember your preferences',
              'Understand how users interact with Delimo',
              'Improve application performance',
              'Detect security problems',
              'Measure service usage',
              'Personalize certain features and content',
            ]} />
            <SectionParagraph text="You may be able to control certain cookies and permissions through your browser or device settings." />

            {/* Section 5 */}
            <SectionHeader title="5. Data Security" />
            <SectionParagraph text="Delimo takes reasonable technical and organizational measures to protect personal information against unauthorized access, loss, misuse, alteration, disclosure, or destruction." />
            <SectionParagraph text="However, no internet-based service can guarantee that information will always be completely secure. You are also responsible for keeping your account credentials confidential and should notify Delimo if you believe your account has been accessed without authorization." />

            {/* Section 6 */}
            <SectionHeader title="6. Data Retention" />
            <SectionParagraph text="Delimo retains personal information only for as long as reasonably necessary for the purposes described in this Privacy Policy, including providing our services, maintaining order records, processing transactions, resolving disputes, preventing fraud, maintaining security, and complying with legal and regulatory requirements." />
            <SectionParagraph text="When information is no longer required, we may delete, anonymize, or securely dispose of it in accordance with applicable requirements." />

            {/* Section 7 */}
            <SectionHeader title="7. Your Privacy Rights and Choices" />
            <SectionParagraph text="Depending on applicable law, you may have rights regarding your personal information. These may include the ability to:" />
            <BulletList items={[
              'Request access to your personal information',
              'Request correction of inaccurate information',
              'Request deletion of certain information',
              'Withdraw consent where consent is the basis for processing',
              'Manage communication preferences',
              'Manage location permissions',
              'Request information about how your data is processed',
              'Raise a privacy-related complaint',
            ]} />
            <SectionParagraph text="Where processing is based on consent, Delimo will provide an appropriate way to withdraw that consent. India's DPDP framework provides for consent to be clear and informed and for withdrawal to be possible with comparable ease." />
            <SectionParagraph text="Some information may still need to be retained where required or permitted by law." />

            {/* Section 8 */}
            <SectionHeader title="8. Promotional Communications" />
            <SectionParagraph text="Delimo may send promotional communications about restaurant offers, discounts, food recommendations, special events, new features, and promotional campaigns." />
            <SectionParagraph text="You may opt out of promotional communications through the unsubscribe option, notification settings, or other available controls. Please note that you may continue to receive essential service communications, such as order confirmations, delivery updates, payment notifications, and security alerts." />

            {/* Section 9 */}
            <SectionHeader title="9. Children's Privacy" />
            <SectionParagraph text="Delimo is not intended to knowingly collect personal information from children in circumstances where such collection is not permitted by applicable law. If we become aware that personal information has been collected from a child in violation of applicable requirements, we may take reasonable steps to delete the information." />

            {/* Section 10 */}
            <SectionHeader title="10. Third-Party Services" />
            <SectionParagraph text="Delimo may integrate with or provide links to third-party services, including payment providers, mapping services, analytics providers, restaurants, and delivery services. These third parties may have their own privacy policies and terms. Delimo is not responsible for the privacy practices of third-party services that operate independently from Delimo. We recommend reviewing their privacy policies before providing information directly to them." />

            {/* Section 11 */}
            <SectionHeader title="11. Account Deletion" />
            <SectionParagraph text="You may request deletion of your Delimo account through the available account settings or by contacting Delimo support. When an account deletion request is received, we may delete or anonymize applicable personal information, subject to information that must be retained for legal, security, fraud-prevention, dispute-resolution, or other legitimate purposes." />

            {/* Section 12 */}
            <SectionHeader title="12. Data Transfers" />
            <SectionParagraph text="Your information may be processed or stored using service providers located in India or other jurisdictions, subject to applicable laws and contractual or organizational safeguards. We take reasonable steps to ensure that information processed by our service providers is handled appropriately." />

            {/* Section 13 */}
            <SectionHeader title="13. Changes to This Privacy Policy" />
            <SectionParagraph text="Delimo may update this Privacy Policy from time to time. Changes may be made because of new features or services, changes in technology, changes in our business practices, or changes in applicable laws or regulations." />
            <SectionParagraph text="When significant changes are made, we may notify users through the Delimo application, website, email, or another appropriate method. The 'Last Updated' date at the beginning of this Privacy Policy will indicate when the policy was most recently updated." />

            {/* Section 14 */}
            <SectionHeader title="14. Contact Us" />
            <SectionParagraph text="If you have questions, concerns, requests, or complaints regarding this Privacy Policy or the handling of your personal information, you can contact us:" />

            <View style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              padding: 14,
              marginBottom: 16,
              gap: 8,
            }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
                Delimo
              </Text>
              <Text style={{ fontSize: 13, color: '#374151' }}>
                Privacy Email: <Text style={{ fontWeight: '600', color: '#15803D' }}>privacy@delimo.com</Text>
              </Text>
              <Text style={{ fontSize: 13, color: '#374151' }}>
                Customer Support: <Text style={{ fontWeight: '600', color: '#15803D' }}>support@delimo.com</Text>
              </Text>
              <Text style={{ fontSize: 13, color: '#374151' }}>
                Website: <Text style={{ fontWeight: '600', color: '#15803D' }}>https://delimo.com</Text>
              </Text>
              <Text style={{ fontSize: 13, color: '#374151' }}>
                Grievance/Privacy Contact: <Text style={{ fontWeight: '600', color: '#111827' }}>Designated Privacy Officer</Text>
              </Text>
            </View>

            {/* Section 15 */}
            <SectionHeader title="15. Consent" />
            <SectionParagraph text="By using Delimo, you acknowledge that you have read and understood this Privacy Policy. Where applicable, Delimo will request your consent before processing personal information for purposes that require consent under applicable law. You may withdraw consent where applicable through the mechanisms provided by Delimo." />

            {/* Footer Notice */}
            <View style={{
              marginTop: 20,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '500' }}>
                © 2026 Delimo. All rights reserved.
              </Text>
            </View>

            {/* Close action button */}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                marginTop: 20,
                backgroundColor: pressed ? '#166534' : '#15803D',
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                Close
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{
      fontSize: 16,
      fontWeight: '800',
      color: '#14532D',
      marginTop: 16,
      marginBottom: 8,
      letterSpacing: -0.2,
    }}>
      {title}
    </Text>
  );
}

function SubSectionHeader({ title }: { title: string }) {
  return (
    <Text style={{
      fontSize: 14,
      fontWeight: '700',
      color: '#1F2937',
      marginTop: 12,
      marginBottom: 6,
    }}>
      {title}
    </Text>
  );
}

function SectionParagraph({ text }: { text: string }) {
  return (
    <Text style={{
      fontSize: 13,
      color: '#4B5563',
      lineHeight: 20,
      marginBottom: 8,
    }}>
      {text}
    </Text>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={{ marginBottom: 10, paddingLeft: 6, gap: 4 }}>
      {items.map((item, idx) => (
        <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 13, color: '#15803D', marginRight: 8, lineHeight: 20 }}>•</Text>
          <Text style={{ fontSize: 13, color: '#4B5563', lineHeight: 20, flex: 1 }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
