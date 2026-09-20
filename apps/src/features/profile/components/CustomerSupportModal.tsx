import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  ScrollView,
  Pressable,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, Toast, useTheme } from 'foodie-shared-rn';
import { Feather } from '@expo/vector-icons';
import { generateSupportReply } from '../supportAiEngine';

export interface ChatMessage {
  id: string;
  enquiryId: string;
  sender: 'customer' | 'admin';
  senderName: string;
  message: string;
  timestamp: string;
}

export interface EnquiryRecord {
  id: string;
  category: 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY' | 'GENERAL';
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  subject: string;
  message: string;
  timestamp: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  replyMessage?: string;
  messages?: ChatMessage[];
  resolvedAt?: string;
  orderId?: string;
}

const STORAGE_KEY = 'foodie_support_enquiries';

const INITIAL_ENQUIRIES: EnquiryRecord[] = [
  {
    id: 'ENQ-901',
    category: 'CUSTOMER',
    senderName: 'Ananya Sharma',
    senderEmail: 'ananya.s@gmail.com',
    senderPhone: '+91 98765 12345',
    subject: 'Delayed Refund for Order #ORD-9821',
    message: "I was debited ₹450 for a cancelled order yesterday but haven't received refund in my bank account.",
    timestamp: '15 mins ago',
    status: 'OPEN',
    priority: 'HIGH',
    orderId: 'ORD-9821',
    messages: [
      {
        id: 'msg-101',
        enquiryId: 'ENQ-901',
        sender: 'customer',
        senderName: 'Ananya Sharma',
        message: "I was debited ₹450 for a cancelled order yesterday but haven't received refund in my bank account.",
        timestamp: '15 mins ago',
      },
    ],
  },
  {
    id: 'ENQ-902',
    category: 'CUSTOMER',
    senderName: 'Vikram Mehta',
    senderEmail: 'vikram.m@yahoo.com',
    senderPhone: '+91 98123 45678',
    subject: 'Unable to apply promo code WELCOME100',
    message: 'The promo code states invalid even though I am placing my first order.',
    timestamp: '40 mins ago',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    replyMessage: 'Our tech team is validating your first order eligibility status.',
    messages: [
      {
        id: 'msg-201',
        enquiryId: 'ENQ-902',
        sender: 'customer',
        senderName: 'Vikram Mehta',
        message: 'The promo code states invalid even though I am placing my first order.',
        timestamp: '40 mins ago',
      },
      {
        id: 'msg-202',
        enquiryId: 'ENQ-902',
        sender: 'admin',
        senderName: 'Admin Support',
        message: 'Our tech team is validating your first order eligibility status.',
        timestamp: '25 mins ago',
      },
    ],
  },
];

interface CustomerSupportModalProps {
  visible: boolean;
  onClose: () => void;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export function CustomerSupportModal({
  visible,
  onClose,
  customerName = 'Customer User',
  customerEmail = 'customer@foodie.com',
  customerPhone = '+91 98765 43210',
}: CustomerSupportModalProps) {
  const { tokens } = useTheme();
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [activeEnquiry, setActiveEnquiry] = useState<EnquiryRecord | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // New enquiry form state
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<'CUSTOMER' | 'RESTAURANT' | 'DELIVERY' | 'GENERAL'>('CUSTOMER');
  const [newMessageText, setNewMessageText] = useState('');
  const [newOrderId, setNewOrderId] = useState('');

  // Active chat reply state
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  // Load enquiries from storage
  const loadEnquiries = async () => {
    try {
      let rawData: string | null = null;
      rawData = await AsyncStorage.getItem(STORAGE_KEY);
      if (!rawData && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        rawData = window.localStorage.getItem(STORAGE_KEY);
      }

      if (rawData) {
        const parsed = JSON.parse(rawData);
        setEnquiries(parsed);
        // Keep active enquiry updated with latest messages
        if (activeEnquiry) {
          const updatedActive = parsed.find((e: EnquiryRecord) => e.id === activeEnquiry.id);
          if (updatedActive) {
            setActiveEnquiry(updatedActive);
          }
        }
      } else {
        setEnquiries(INITIAL_ENQUIRIES);
        await saveEnquiries(INITIAL_ENQUIRIES);
      }
    } catch (e) {
      console.error('Failed to load enquiries', e);
    }
  };

  const saveEnquiries = async (updatedList: EnquiryRecord[]) => {
    try {
      const dataStr = JSON.stringify(updatedList);
      await AsyncStorage.setItem(STORAGE_KEY, dataStr);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, dataStr);
        window.dispatchEvent(new Event('foodie_enquiry_updated'));
      }
      setEnquiries(updatedList);
    } catch (e) {
      console.error('Failed to save enquiries', e);
    }
  };

  useEffect(() => {
    if (visible) {
      loadEnquiries();

      // Set up periodic sync for live two-way chat updates
      const intervalId = setInterval(() => {
        loadEnquiries();
      }, 2500);

      const handleStorageChange = () => {
        loadEnquiries();
      };

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('foodie_enquiry_updated', handleStorageChange);
      }

      return () => {
        clearInterval(intervalId);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.removeEventListener('storage', handleStorageChange);
          window.removeEventListener('foodie_enquiry_updated', handleStorageChange);
        }
      };
    }
  }, [visible, activeEnquiry?.id]);

  useEffect(() => {
    // Scroll chat to bottom when messages update
    if (activeEnquiry && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [activeEnquiry?.messages?.length]);

  const handleCreateEnquiry = async () => {
    if (!newSubject.trim() || !newMessageText.trim()) {
      setToast({ message: 'Please enter a subject and message.', variant: 'error' });
      return;
    }

    const randomNum = Math.floor(100 + Math.random() * 900);
    const newId = `ENQ-${randomNum}`;
    const timestampStr = 'Just now';

    const newChatMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      enquiryId: newId,
      sender: 'customer',
      senderName: customerName,
      message: newMessageText.trim(),
      timestamp: timestampStr,
    };

    const newRecord: EnquiryRecord = {
      id: newId,
      category: newCategory,
      senderName: customerName,
      senderEmail: customerEmail,
      senderPhone: customerPhone,
      subject: newSubject.trim(),
      message: newMessageText.trim(),
      timestamp: timestampStr,
      status: 'OPEN',
      priority: 'MEDIUM',
      orderId: newOrderId.trim() || undefined,
      messages: [newChatMsg],
    };

    const updated = [newRecord, ...enquiries];
    await saveEnquiries(updated);

    // POST to online backend API
    try {
      void fetch('https://api.foodie.kwiko.org/api/v1/admin/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId,
          category: newCategory,
          senderName: customerName,
          senderEmail: customerEmail,
          senderPhone: customerPhone,
          subject: newSubject.trim(),
          message: newMessageText.trim(),
        }),
      }).catch(() => {});
    } catch (e) {}

    // Reset form & open chat view
    setNewSubject('');
    setNewMessageText('');
    setNewOrderId('');
    setIsCreatingNew(false);
    setActiveEnquiry(newRecord);
    setToast({ message: `Enquiry #${newId} created! Support will reply shortly.`, variant: 'success' });
  };

  const handleSendReply = async () => {
    if (!chatInput.trim() || !activeEnquiry) return;
    setIsSending(true);

    const userText = chatInput.trim();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      enquiryId: activeEnquiry.id,
      sender: 'customer',
      senderName: customerName,
      message: userText,
      timestamp: nowStr,
    };

    // Generate smart AI response specific to customer's actual message
    const aiText = generateSupportReply(userText);
    const aiMsg: ChatMessage = {
      id: `msg-ai-${Date.now() + 1}`,
      enquiryId: activeEnquiry.id,
      sender: 'admin',
      senderName: 'Foodie AI Support',
      message: aiText,
      timestamp: nowStr,
    };

    const existingMsgs = activeEnquiry.messages || [
      {
        id: `msg-orig-${activeEnquiry.id}`,
        enquiryId: activeEnquiry.id,
        sender: 'customer' as const,
        senderName: activeEnquiry.senderName,
        message: activeEnquiry.message,
        timestamp: activeEnquiry.timestamp,
      },
    ];

    const updatedMessages = [...existingMsgs, newMsg, aiMsg];
    const updatedRecord: EnquiryRecord = {
      ...activeEnquiry,
      messages: updatedMessages,
      replyMessage: aiText,
      status: activeEnquiry.status === 'RESOLVED' ? 'IN_PROGRESS' : activeEnquiry.status,
    };

    const updatedList = enquiries.map((item) => (item.id === activeEnquiry.id ? updatedRecord : item));

    await saveEnquiries(updatedList);
    setActiveEnquiry(updatedRecord);
    setChatInput('');
    setIsSending(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#F8FAFC' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: '#14532D',
            paddingTop: Platform.OS === 'ios' ? 50 : 20,
            paddingBottom: 16,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {activeEnquiry || isCreatingNew ? (
              <Pressable
                onPress={() => {
                  setActiveEnquiry(null);
                  setIsCreatingNew(false);
                }}
                style={{ padding: 4, marginRight: 12 }}
              >
                <Feather name="arrow-left" size={24} color="#FFFFFF" />
              </Pressable>
            ) : null}
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>
                {activeEnquiry
                  ? `Chat: ${activeEnquiry.id}`
                  : isCreatingNew
                  ? 'New Support Enquiry'
                  : 'Help & Customer Support'}
              </Text>
              <Text style={{ fontSize: 12, color: '#A7F3D0', fontWeight: '500' }}>
                {activeEnquiry
                  ? activeEnquiry.subject
                  : isCreatingNew
                  ? 'We reply within 5-10 minutes'
                  : 'Real-time 2-Way Support Desk'}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.2)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Feather name="x" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* BODY 1: Active Live 2-Way Chat View */}
        {activeEnquiry ? (
          <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
            {/* Enquiry Details Card */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#E2E8F0',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>{activeEnquiry.subject}</Text>
                {activeEnquiry.orderId ? (
                  <Text style={{ fontSize: 12, color: '#047857', fontWeight: '600', marginTop: 2 }}>
                    Order Ref: #{activeEnquiry.orderId}
                  </Text>
                ) : null}
              </View>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor:
                    activeEnquiry.status === 'RESOLVED'
                      ? '#DEF7EC'
                      : activeEnquiry.status === 'IN_PROGRESS'
                      ? '#FEF3C7'
                      : '#E0E7FF',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color:
                      activeEnquiry.status === 'RESOLVED'
                        ? '#03543F'
                        : activeEnquiry.status === 'IN_PROGRESS'
                        ? '#92400E'
                        : '#3730A3',
                  }}
                >
                  {activeEnquiry.status.replace('_', ' ')}
                </Text>
              </View>
            </View>

            {/* Chat Thread Messages */}
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              style={{ flex: 1 }}
            >
              {/* Render messages */}
              {(activeEnquiry.messages && activeEnquiry.messages.length > 0
                ? activeEnquiry.messages
                : [
                    {
                      id: `orig-${activeEnquiry.id}`,
                      enquiryId: activeEnquiry.id,
                      sender: 'customer' as const,
                      senderName: activeEnquiry.senderName,
                      message: activeEnquiry.message,
                      timestamp: activeEnquiry.timestamp,
                    },
                    ...(activeEnquiry.replyMessage
                      ? [
                          {
                            id: `reply-${activeEnquiry.id}`,
                            enquiryId: activeEnquiry.id,
                            sender: 'admin' as const,
                            senderName: 'Admin Support',
                            message: activeEnquiry.replyMessage,
                            timestamp: 'Recently',
                          },
                        ]
                      : []),
                  ]
              ).map((msg) => {
                const isAdmin = msg.sender === 'admin';
                return (
                  <View
                    key={msg.id}
                    style={{
                      alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                      maxWidth: '85%',
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 4,
                        alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                        gap: 6,
                      }}
                    >
                      {isAdmin ? (
                        <View
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            backgroundColor: '#14532D',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Feather name="shield" size={10} color="#FFFFFF" />
                        </View>
                      ) : null}
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isAdmin ? '#14532D' : '#64748B' }}>
                        {msg.senderName}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#94A3B8' }}>{msg.timestamp}</Text>
                    </View>

                    <View
                      style={{
                        backgroundColor: isAdmin ? '#FFFFFF' : '#14532D',
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 16,
                        borderTopLeftRadius: isAdmin ? 4 : 16,
                        borderTopRightRadius: isAdmin ? 16 : 4,
                        borderWidth: isAdmin ? 1 : 0,
                        borderColor: '#E2E8F0',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: isAdmin ? '#1E293B' : '#FFFFFF',
                          lineHeight: 20,
                        }}
                      >
                        {msg.message}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Reply Input Bar */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderTopWidth: 1,
                borderTopColor: '#E2E8F0',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <RNTextInput
                style={{
                  flex: 1,
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: Platform.OS === 'ios' ? 10 : 8,
                  fontSize: 14,
                  color: '#0F172A',
                  maxHeight: 100,
                }}
                placeholder="Type your message to support..."
                placeholderTextColor="#94A3B8"
                value={chatInput}
                onChangeText={setChatInput}
                multiline
              />
              <Pressable
                onPress={handleSendReply}
                disabled={isSending || !chatInput.trim()}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: chatInput.trim() ? '#14532D' : '#94A3B8',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="send" size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
                )}
              </Pressable>
            </View>
          </View>
        ) : isCreatingNew ? (
          /* BODY 2: Create New Enquiry Form */
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 }}>
              Submit a Support Ticket
            </Text>

            {/* Category Selector */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>CATEGORY</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {(['CUSTOMER', 'RESTAURANT', 'DELIVERY', 'GENERAL'] as const).map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setNewCategory(cat)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: newCategory === cat ? '#14532D' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: newCategory === cat ? '#14532D' : '#CBD5E1',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: newCategory === cat ? '#FFFFFF' : '#475569',
                    }}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Subject Input */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>SUBJECT</Text>
            <RNTextInput
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 14,
                color: '#0F172A',
                marginBottom: 16,
              }}
              placeholder="e.g. Refund issue for order, promo code help"
              placeholderTextColor="#94A3B8"
              value={newSubject}
              onChangeText={setNewSubject}
            />

            {/* Optional Order ID */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
              ORDER ID (OPTIONAL)
            </Text>
            <RNTextInput
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 14,
                color: '#0F172A',
                marginBottom: 16,
              }}
              placeholder="e.g. ORD-9821"
              placeholderTextColor="#94A3B8"
              value={newOrderId}
              onChangeText={setNewOrderId}
            />

            {/* Detailed Message */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>MESSAGE</Text>
            <RNTextInput
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                color: '#0F172A',
                height: 120,
                textAlignVertical: 'top',
                marginBottom: 24,
              }}
              placeholder="Describe your issue in detail so our admin support team can assist you..."
              placeholderTextColor="#94A3B8"
              value={newMessageText}
              onChangeText={setNewMessageText}
              multiline
            />

            {/* Submit Button */}
            <Pressable
              onPress={handleCreateEnquiry}
              style={{
                backgroundColor: '#14532D',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                shadowColor: '#14532D',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>Send Support Enquiry</Text>
            </Pressable>
          </ScrollView>
        ) : (
          /* BODY 3: List of Enquiries & New Enquiry Launcher */
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Create New Button Header */}
            <Pressable
              onPress={() => setIsCreatingNew(true)}
              style={{
                backgroundColor: '#14532D',
                borderRadius: 16,
                paddingHorizontal: 20,
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24,
                shadowColor: '#14532D',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>Have a question or issue?</Text>
                <Text style={{ fontSize: 13, color: '#A7F3D0', marginTop: 2 }}>
                  Start a live chat enquiry with Admin Support
                </Text>
              </View>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#FCD34D',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Feather name="plus" size={22} color="#14532D" />
              </View>
            </Pressable>

            <Text
              style={{
                fontSize: 13,
                textTransform: 'uppercase',
                color: '#14532D',
                fontWeight: '800',
                letterSpacing: 0.8,
                marginBottom: 12,
              }}
            >
              Your Active Enquiries & Live Chats ({enquiries.length})
            </Text>

            {enquiries.length === 0 ? (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 32,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <Feather name="message-square" size={40} color="#94A3B8" style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#334155' }}>No support enquiries yet</Text>
                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                  Click "Start a live chat enquiry" above to connect with Foodie Admin Support.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {enquiries.map((item) => {
                  const hasAdminReply = item.messages?.some((m) => m.sender === 'admin') || Boolean(item.replyMessage);
                  const lastMessage = item.messages && item.messages.length > 0
                    ? item.messages[item.messages.length - 1].message
                    : item.replyMessage || item.message;

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setActiveEnquiry(item)}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? '#F8FAFC' : '#FFFFFF',
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: hasAdminReply ? '#86EFAC' : '#E2E8F0',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.04,
                        shadowRadius: 4,
                        elevation: 2,
                      })}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#14532D' }}>{item.id}</Text>
                          {hasAdminReply ? (
                            <View
                              style={{
                                backgroundColor: '#DCFCE7',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 10,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' }} />
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>Admin Replied</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={{ fontSize: 11, color: '#94A3B8' }}>{item.timestamp}</Text>
                      </View>

                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginTop: 8 }}>
                        {item.subject}
                      </Text>

                      <Text
                        numberOfLines={2}
                        style={{ fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 18 }}
                      >
                        {lastMessage}
                      </Text>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 12,
                          paddingTop: 10,
                          borderTopWidth: 1,
                          borderTopColor: '#F1F5F9',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857' }}>
                          Tap to open two-way chat ›
                        </Text>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 8,
                            backgroundColor:
                              item.status === 'RESOLVED'
                                ? '#DEF7EC'
                                : item.status === 'IN_PROGRESS'
                                ? '#FEF3C7'
                                : '#F3F4F6',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '800',
                              color:
                                item.status === 'RESOLVED'
                                  ? '#03543F'
                                  : item.status === 'IN_PROGRESS'
                                  ? '#92400E'
                                  : '#4B5563',
                            }}
                          >
                            {item.status.replace('_', ' ')}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}

        <Toast
          visible={Boolean(toast)}
          message={toast?.message ?? ''}
          variant={toast?.variant ?? 'info'}
          accessibilityLabel={toast?.message ?? 'Toast'}
          onDismiss={() => setToast(null)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}
