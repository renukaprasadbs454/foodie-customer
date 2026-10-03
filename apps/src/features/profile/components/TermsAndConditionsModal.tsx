import React from 'react';
import {
  Modal,
  View,
  ScrollView,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { Text } from 'foodie-shared-rn';
import { Feather } from '@expo/vector-icons';

interface TermsAndConditionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TermsAndConditionsModal({ visible, onClose }: TermsAndConditionsModalProps) {
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
                <Feather name="file-text" size={20} color="#15803D" />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>
                  Terms & Conditions
                </Text>
                <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '600' }}>
                  Delimo Food Delivery Platform
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
                Last Updated: October 3, 2026
              </Text>
            </View>

            {/* Intro */}
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
              Welcome to Delimo.
            </Text>
            <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 12 }}>
              These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of the Delimo mobile application, website, and food ordering and delivery services (&quot;Services&quot;).
            </Text>
            <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 12 }}>
              Delimo operates as an online marketplace connecting customers with independent restaurant partners and third-party delivery partners to facilitate food discovery, ordering, and delivery.
            </Text>
            <Text style={{ fontSize: 14, color: '#374151', lineHeight: 22, fontWeight: '600', marginBottom: 20 }}>
              By registering an account, placing an order, or using our Services, you confirm that you have read, understood, and agreed to be bound by these Terms and our Privacy Policy.
            </Text>

            {/* Section 1 */}
            <SectionHeader title="1. Eligibility & Account Registration" />
            <SectionParagraph text="To use Delimo, you must create a verified account and adhere to the following guidelines:" />
            <BulletList items={[
              'You must be at least 18 years old or possess legal parental/guardian authorization.',
              'You must provide accurate, current, and complete personal and contact details during registration.',
              'You are responsible for safeguarding your login credentials, OTPs, and account access.',
              'Any activity conducted under your registered account is your sole legal responsibility.',
              'Delimo reserves the right to suspend or terminate accounts that provide fraudulent or misleading information.',
            ]} />

            {/* Section 2 */}
            <SectionHeader title="2. Food Ordering & Marketplace Platform" />
            <SectionParagraph text="Delimo is a technology platform and not a food preparation establishment:" />
            <BulletList items={[
              'Delimo does not cook, prepare, package, or sell food items directly. All food items are prepared and packed exclusively by independent restaurant merchants.',
              'Restaurant menus, item descriptions, prices, special ingredients, and availability are provided and maintained directly by restaurant partners.',
              'Images displayed on the menu are for illustration and representative purposes only. Actual presentation, garnish, portion size, and packaging may vary.',
              'An order placed by you is an offer to purchase from the respective restaurant, which is subject to acceptance and confirmation by the restaurant.',
            ]} />

            {/* Section 3 */}
            <SectionHeader title="3. Pricing, Taxes & Payment" />
            <SectionParagraph text="All transactions on Delimo are processed subject to the following payment rules:" />
            <BulletList items={[
              'Prices for food items are specified by individual restaurants and may differ from dine-in or take-away counter rates.',
              'Total checkout charges include the item prices, applicable government taxes (GST/VAT), delivery fees, packaging fees, platform convenience charges, and optional driver tips.',
              'Payment methods supported include Credit/Debit Cards, UPI, Net Banking, Foodie Wallet, and Cash on Delivery (where eligible).',
              'Once an online payment is confirmed, the transaction cannot be revoked except in accordance with our Cancellation and Refund Policy.',
              'In case of transaction failures where amount is debited, the standard banking refund window is 3 to 7 business days depending on your payment provider.',
            ]} />

            {/* Section 4 */}
            <SectionHeader title="4. Order Cancellation & Modification" />
            <SectionParagraph text="Because food items are perishable and prepared fresh to order, specific cancellation rules apply:" />
            <BulletList items={[
              'You may cancel an order free of charge only before the restaurant partner has accepted or commenced preparation of the order.',
              'Once the restaurant has accepted the order and started cooking or packaging, cancellations cannot be made without incurring full order charges.',
              'Delimo or the restaurant partner reserves the right to cancel an order due to unavailability of items, unexpected restaurant closure, extreme weather conditions, or inability to assign a delivery partner. In such cases, a 100% refund will be issued.',
            ]} />

            {/* Section 5 */}
            <SectionHeader title="5. Deliveries & Drop-off Guidelines" />
            <SectionParagraph text="Deliveries are carried out by independent delivery partners:" />
            <BulletList items={[
              'Estimated delivery times provided in the application are approximate estimates and may fluctuate due to traffic conditions, kitchen rush, weather, or delivery distance.',
              'You agree to provide an accurate delivery address, landmark, and reachable contact number.',
              'When the delivery partner arrives at the designated address, they will attempt to contact you. If you are unreachable for more than 10 minutes, the order will be considered completed with no refund eligible.',
              'For contactless deliveries, the delivery partner will place your package at your doorstep or security gate as per your delivery instructions.',
            ]} />

            {/* Section 6 */}
            <SectionHeader title="6. Food Quality, Hygiene & Allergens" />
            <SectionParagraph text="Please review our allergen and hygiene guidance carefully:" />
            <BulletList items={[
              'The respective restaurant partner is exclusively liable for food hygiene, freshness, taste, cooking quality, packaging standards, and compliance with statutory food safety regulations (e.g. FSSAI / FDA).',
              'If you have specific food allergies (such as nuts, dairy, gluten, shellfish, or eggs), you must communicate this clearly through special instructions and verify directly with the restaurant before consuming.',
              'Delimo does not guarantee that items are allergen-free or prepared in dedicated allergen-free environments.',
            ]} />

            {/* Section 7 */}
            <SectionHeader title="7. Returns, Refunds & Customer Grievances" />
            <SectionParagraph text="If you experience issues with your order, Delimo provides a dedicated resolution mechanism:" />
            <BulletList items={[
              'Claims regarding missing items, wrong items delivered, spilled contents, or spoiled food must be reported via Customer Support within 2 hours of delivery.',
              'Clear photographic proof of the delivered package and items may be required to process your investigation and claims.',
              'Approved refunds will be credited back to your original payment method or Delimo Wallet within 3 to 5 business days.',
              'Delimo reserves the right to deny refunds for repeated unsubstantiated or fraudulent claims.',
            ]} />

            {/* Section 8 */}
            <SectionHeader title="8. User Conduct & Community Guidelines" />
            <SectionParagraph text="To maintain a safe and respectful platform for all, users agree NOT to:" />
            <BulletList items={[
              'Abuse, harass, threaten, or discriminate against restaurant personnel, delivery partners, or Delimo customer care representatives.',
              'Place bogus, experimental, or fraudulent orders with bad-faith intentions.',
              'Attempt to decompile, reverse engineer, scrape, or tamper with the Delimo application, APIs, or infrastructure.',
              'Exploit promotional codes, discount vouchers, or referral rewards through duplicate accounts or falsified devices.',
            ]} />

            {/* Section 9 */}
            <SectionHeader title="9. Limitation of Liability" />
            <SectionParagraph text="To the maximum extent permitted by applicable law, Delimo and its affiliates shall not be liable for any indirect, incidental, punitive, or consequential damages arising out of your access to or inability to use the platform, food quality issues, or delays caused by third parties." />

            {/* Section 10 */}
            <SectionHeader title="10. Changes to These Terms" />
            <SectionParagraph text="Delimo reserves the right to modify or update these Terms and Conditions at any time. When updates are published, the 'Last Updated' date will be updated. Continued use of Delimo after changes are published constitutes your acceptance of the revised terms." />

            {/* Section 11 */}
            <SectionHeader title="11. Contact & Customer Support" />
            <SectionParagraph text="If you have questions, inquiries, or feedback regarding these Terms & Conditions, please contact us through:" />
            <BulletList items={[
              'In-App Support: Profile → Customer Support',
              'Email: support@delimo.com or legal@delimo.com',
              'Platform: Delimo Technologies & Foodie Network',
            ]} />

            {/* Copyright */}
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
