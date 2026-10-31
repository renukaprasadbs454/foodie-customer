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
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, Toast, useTheme } from 'foodie-shared-rn';
import { Feather } from '@expo/vector-icons';
import { generateSupportReply, getApiEndpoints, postToBackendSync } from '../supportAiEngine';

import {
  useGetMyConversationsQuery,
  useCreateOrGetConversationMutation,
  useEscalateConversationMutation,
  useSendMessageMutation,
  useGetMessagesQuery,
  useSyncLegacyChatMutation,
} from '../../../api/endpoints/supportApi';



interface CustomerSupportModalProps {
  visible: boolean;
  onClose: () => void;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  activeOrderId?: string;
}

export function CustomerSupportModal({
  visible,
  onClose,
  customerName = 'Customer User',
  customerEmail = 'customer@foodie.com',
  customerPhone = '+91 98765 43210',
  activeOrderId,
}: CustomerSupportModalProps) {
  const { tokens } = useTheme();
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<'CUSTOMER' | 'RESTAURANT' | 'DELIVERY' | 'GENERAL'>('CUSTOMER');
  const [newMessageText, setNewMessageText] = useState('');
  const [newOrderId, setNewOrderId] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Network State
  const { data: activeConversations } = useGetMyConversationsQuery(undefined, { pollingInterval: 3000 });
  const [createConversation] = useCreateOrGetConversationMutation();
  const [escalateConv] = useEscalateConversationMutation();
  const [sendMessage] = useSendMessageMutation();

  const [activeEnquiryId, setActiveEnquiryId] = useState<string | null>(null);
  const [localChatMessages, setLocalChatMessages] = useState<any[]>([]);

  // Resolve active locally if needed
  const activeEnquiry = activeConversations?.find(c => c.id === activeEnquiryId)
    || (activeConversations && activeConversations.length > 0 ? activeConversations[0] : null);

  const { data: messages } = useGetMessagesQuery(activeEnquiry?.id as string, {
    skip: !activeEnquiry?.id,
    pollingInterval: 2000
  });
  useEffect(() => {
    if (activeEnquiry && activeEnquiryId !== activeEnquiry.id) {
      setActiveEnquiryId(activeEnquiry.id);
    }
  }, [activeEnquiry]);

  useEffect(() => {
    // Basic fallback scroll when active ticket mounts
    if (activeEnquiry && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [activeEnquiry?.id]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const showSub = Keyboard.addListener('keyboardDidShow', () => {
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      });
      return () => showSub.remove();
    }
  }, []);

  const handleCreateEnquiry = () => {
    // Exact predefined chat layout
    setLocalChatMessages([
      {
        id: `loc-ai-init`,
        message: 'Hi! How can we help you today with your order or application?',
        senderType: 'AI',
        senderName: '🤖 Foodie Assistant',
        createdAt: new Date().toISOString(),
        actionButtons: [
          { label: '📍 Track Active Order', actionText: 'Where is my order?' },
          { label: '💳 Check Refund Status', actionText: 'Payment or refund issue' },
          { label: '❌ Cancel Order #ORD-9821', actionText: 'I want to cancel my order' },
          { label: '🏷️ Active Offers & Coupons', actionText: 'Offers & Promo Codes' },
        ]
      }
    ]);
    setIsCreatingNew(true);
  };

  const handleSendLocalReply = async (text: string) => {
    if (!text.trim()) return;
    setIsSending(true);

    const newLocalMsgs = [
      ...localChatMessages,
      { id: `loc-${Date.now()}`, message: text.trim(), senderType: 'CUSTOMER', senderName: customerName, createdAt: new Date().toISOString() }
    ];
    setLocalChatMessages(newLocalMsgs);
    setChatInput('');

    setTimeout(() => {
      // Evaluate smart reply to get action buttons
      import('../supportAiEngine').then(({ evaluateSmartSupportReply }) => {
        const aiResult = evaluateSmartSupportReply(text.trim());
        setLocalChatMessages([
          ...newLocalMsgs,
          {
            id: `loc-ai-${Date.now()}`,
            message: aiResult.reply,
            senderType: 'AI',
            senderName: '🤖 Foodie Assistant',
            createdAt: new Date().toISOString(),
            actionButtons: aiResult.actionButtons
          }
        ]);
        setIsSending(false);
      });
    }, 500);
  };

  const handleSendReply = async () => {
    if (isCreatingNew) {
      return handleSendLocalReply(chatInput.trim());
    }

    if (!chatInput.trim() || !activeEnquiry) return;
    setIsSending(true);

    const userText = chatInput.trim();
    try {
      await sendMessage({
        conversationId: activeEnquiry.id,
        message: userText,
        senderType: 'CUSTOMER',
        senderName: customerName,
      }).unwrap();

      const isLiveAgentMode = activeEnquiry.status === 'ASSIGNED' || activeEnquiry.status === 'AGENT_ACTIVE' || activeEnquiry.status === 'WAITING_FOR_AGENT';

      if (!isLiveAgentMode) {
        const aiText = generateSupportReply(userText);
        await sendMessage({
          conversationId: activeEnquiry.id,
          message: aiText,
          senderType: 'AI',
          senderName: 'Foodie AI Support',
        }).unwrap();
      }
    } catch (e) {
      setToast({ message: 'Failed to send message', variant: 'error' });
    }

    setChatInput('');
    setIsSending(false);
  };

  const [syncLegacyChat] = useSyncLegacyChatMutation();

  const handleConnectWithAgent = async () => {
    if (isCreatingNew) {
      setIsSending(true);
      try {
        const firstCustMsg = localChatMessages.find((m) => m.senderType === 'CUSTOMER');
        const subject = firstCustMsg ? firstCustMsg.message.substring(0, 30) + '...' : 'Live Agent Request';
        const res = await syncLegacyChat({
          category: 'CUSTOMER',
          subject,
          senderName: customerName,
          action: 'connect_agent',
          messages: localChatMessages.map(m => ({
            sender: m.senderType === 'CUSTOMER' ? 'customer' : 'admin',
            message: m.message
          }))
        }).unwrap();
        setActiveEnquiryId(res.id);
        setIsCreatingNew(false);
      } catch (e) {
        setToast({ message: 'Failed to connect to agent', variant: 'error' });
      }
      setIsSending(false);
      return;
    }

    if (!activeEnquiry) return;
    try {
      await escalateConv(activeEnquiry.id).unwrap();
    } catch (e) { }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#0A120E' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: '#012B18',
            paddingTop: Platform.OS === 'ios' ? 50 : 20,
            paddingBottom: 16,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            elevation: 4,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(252, 211, 77, 0.25)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {activeEnquiry || isCreatingNew ? (
              <Pressable
                onPress={() => {
                  setActiveEnquiryId(null);
                  setIsCreatingNew(false);
                  setLocalChatMessages([]);
                }}
                style={{ padding: 4, marginRight: 12 }}
              >
                <Feather name="arrow-left" size={24} color="#FCD34D" />
              </Pressable>
            ) : null}
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FCD34D' }}>
                {activeEnquiry
                  ? `Chat: ${activeEnquiry.id}`
                  : 'Foodie Support Desk'}
              </Text>
              <Text style={{ fontSize: 12, color: '#A7F3D0', fontWeight: '500' }}>
                {activeEnquiry
                  ? activeEnquiry.subject
                  : '🟢 Online • 2-Way Desk'}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(252, 211, 77, 0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(252, 211, 77, 0.3)',
            }}
          >
            <Feather name="x" size={20} color="#FCD34D" />
          </Pressable>
        </View>

        {/* BODY 1: Active Live 2-Way Chat View */}
        {activeEnquiry ? (
          <View style={{ flex: 1, backgroundColor: '#0A120E' }}>
            {/* Enquiry Details Card */}
            <View
              style={{
                backgroundColor: '#131F18',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(252, 211, 77, 0.2)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{activeEnquiry.subject}</Text>
                {activeEnquiry.orderId ? (
                  <Text style={{ fontSize: 12, color: '#FCD34D', fontWeight: '600', marginTop: 2 }}>
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
                      ? 'rgba(16, 185, 129, 0.2)'
                      : (activeEnquiry.status === 'WAITING_FOR_AGENT' || activeEnquiry.status === 'ASSIGNED')
                        ? 'rgba(252, 211, 77, 0.2)'
                        : 'rgba(59, 130, 246, 0.2)',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color:
                      activeEnquiry.status === 'RESOLVED'
                        ? '#10B981'
                        : (activeEnquiry.status === 'WAITING_FOR_AGENT' || activeEnquiry.status === 'ASSIGNED')
                          ? '#FCD34D'
                          : '#60A5FA',
                  }}
                >
                  {activeEnquiry.status.replace(/_/g, ' ')}
                </Text>
              </View>
            </View>

            <ScrollView
              ref={scrollViewRef}
              onContentSizeChange={() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              style={{ flex: 1 }}
            >
              {/* Render messages */}
              {(messages || []).map((msg: any) => {
                const isAdmin = msg.senderType === 'AGENT' || msg.senderType === 'AI' || msg.senderType === 'SYSTEM';
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
                            backgroundColor: '#FCD34D',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Feather name="shield" size={10} color="#012B18" />
                        </View>
                      ) : null}
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isAdmin ? '#FCD34D' : '#9CA3AF' }}>
                        {msg.senderName || 'Agent'}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#6B7280' }}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>

                    <View
                      style={{
                        backgroundColor: isAdmin ? '#131F18' : '#053E23',
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 16,
                        borderTopLeftRadius: isAdmin ? 4 : 16,
                        borderTopRightRadius: isAdmin ? 16 : 4,
                        borderWidth: 1,
                        borderColor: isAdmin ? 'rgba(252, 211, 77, 0.2)' : '#FCD34D',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: '#FFFFFF',
                          lineHeight: 20,
                        }}
                      >
                        {msg.content}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Dynamic Live Agent Connect Button */}
              {activeEnquiry.status === 'AI_ACTIVE' && (
                <Pressable
                  onPress={handleConnectWithAgent}
                  style={{
                    alignSelf: 'stretch',
                    backgroundColor: 'rgba(252, 211, 77, 0.15)',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#FCD34D',
                    marginTop: 8,
                    marginBottom: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Feather name="headphones" size={18} color="#FCD34D" />
                  <Text style={{ color: '#FCD34D', fontWeight: '800', fontSize: 13 }}>
                    Connect to Live Support Agent
                  </Text>
                </Pressable>
              )}
            </ScrollView>

            {/* Reply Input Bar */}
            <View
              style={{
                backgroundColor: '#012B18',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderTopWidth: 1,
                borderTopColor: 'rgba(252, 211, 77, 0.2)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <RNTextInput
                style={{
                  flex: 1,
                  backgroundColor: '#131F18',
                  borderWidth: 1,
                  borderColor: 'rgba(252, 211, 77, 0.25)',
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: Platform.OS === 'ios' ? 10 : 8,
                  fontSize: 14,
                  color: '#FFFFFF',
                  maxHeight: 100,
                }}
                placeholder="Type your message to support..."
                placeholderTextColor="#6B7280"
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
                  backgroundColor: chatInput.trim() ? '#FCD34D' : '#131F18',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: chatInput.trim() ? '#FCD34D' : 'rgba(252, 211, 77, 0.2)',
                }}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#012B18" />
                ) : (
                  <Feather name="send" size={18} color={chatInput.trim() ? '#012B18' : '#6B7280'} style={{ marginLeft: 2 }} />
                )}
              </Pressable>
            </View>
          </View>
        ) : isCreatingNew ? (
          /* BODY 2: Local AI Chatbot Form (Replacing Old Form) */
          <View style={{ flex: 1, backgroundColor: '#0A120E' }}>
            <View
              style={{
                backgroundColor: '#131F18',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(252, 211, 77, 0.2)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Select a predefined query or type below</Text>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(252, 211, 77, 0.2)' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FCD34D' }}>AI ACTIVE</Text>
              </View>
            </View>

            <ScrollView
              ref={scrollViewRef}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              style={{ flex: 1 }}
            >
              {/* Quick Help Card at the top */}
              <View style={{ backgroundColor: '#131F18', borderRadius: 16, padding: 20, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(252, 211, 77, 0.2)' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 }}>Hi! Welcome to Foodie Support 👋</Text>
                <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>
                  Recent Order: {activeOrderId ? <><Text style={{ color: '#FCD34D', fontWeight: '800' }}>#{activeOrderId}</Text> • Preparing for Delivery 🚴</> : <Text style={{ color: '#6B7280' }}>No active orders</Text>}
                </Text>

                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FCD34D', letterSpacing: 0.5, marginBottom: 12 }}>QUICK HELP OPTIONS</Text>

                {[
                  { icon: '📍', text: 'Where is my order?' },
                  { icon: '💳', text: 'Payment or refund issue' },
                  { icon: '❌', text: 'I want to cancel my order' },
                  { icon: '🏷️', text: 'Offers & Promo Codes' }
                ].map((opt, i) => (
                  <Pressable key={i} onPress={() => handleSendLocalReply(opt.text)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: pressed ? 'rgba(252, 211, 77, 0.1)' : '#053E23', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(252, 211, 77, 0.25)', marginBottom: 12 })}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 18 }}>{opt.icon}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{opt.text}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#FCD34D" />
                  </Pressable>
                ))}
              </View>

              {localChatMessages.map((msg: any) => {
                const isAdmin = msg.senderType === 'AI';
                return (
                  <View key={msg.id} style={{ alignSelf: isAdmin ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, alignSelf: isAdmin ? 'flex-start' : 'flex-end', gap: 8 }}>
                      {isAdmin ? (
                        <>
                          <View style={{ backgroundColor: 'rgba(252, 211, 77, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(252, 211, 77, 0.3)' }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#FCD34D' }}>{msg.senderName}</Text>
                          </View>
                          <Text style={{ fontSize: 10, color: '#6B7280' }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </>
                      ) : (
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF' }}>
                          {msg.senderName}
                        </Text>
                      )}
                    </View>
                    <View style={{ backgroundColor: isAdmin ? '#131F18' : '#053E23', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderTopLeftRadius: isAdmin ? 4 : 16, borderTopRightRadius: isAdmin ? 16 : 4, borderWidth: 1, borderColor: isAdmin ? 'rgba(252, 211, 77, 0.2)' : '#FCD34D' }}>
                      <Text style={{ fontSize: 14, color: '#FFFFFF', lineHeight: 20 }}>
                        {msg.message}
                      </Text>
                    </View>

                    {/* Render action pills directly under the AI response */}
                    {isAdmin && msg.actionButtons && msg.actionButtons.length > 0 && (
                      <View style={{ gap: 10, marginTop: 12 }}>
                        {msg.actionButtons.map((btn: any, i: number) => (
                          <Pressable
                            key={i}
                            onPress={() => handleSendLocalReply(btn.actionText)}
                            style={({ pressed }) => ({
                              backgroundColor: pressed ? 'rgba(252, 211, 77, 0.2)' : '#131F18',
                              paddingVertical: 12,
                              paddingHorizontal: 16,
                              borderRadius: 24,
                              borderWidth: 1.5,
                              borderColor: '#FCD34D',
                              alignSelf: 'flex-start',
                            })}
                          >
                            <Text style={{ fontSize: 14, color: '#FCD34D', fontWeight: '800' }}>{btn.label}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

              {localChatMessages.length > 0 && (
                <Pressable
                  onPress={handleConnectWithAgent}
                  style={{
                    alignSelf: 'stretch',
                    backgroundColor: 'rgba(252, 211, 77, 0.15)',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#FCD34D',
                    marginTop: 8,
                    marginBottom: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Feather name="headphones" size={18} color="#FCD34D" />
                  <Text style={{ color: '#FCD34D', fontWeight: '800', fontSize: 13 }}>
                    Connect to Live Support Agent
                  </Text>
                </Pressable>
              )}
            </ScrollView>

            {/* Reply Input Bar for Local Chat */}
            <View style={{ backgroundColor: '#012B18', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(252, 211, 77, 0.2)', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <RNTextInput
                style={{ flex: 1, backgroundColor: '#131F18', borderWidth: 1, borderColor: 'rgba(252, 211, 77, 0.25)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 8, fontSize: 14, color: '#FFFFFF', maxHeight: 100 }}
                placeholder="Type your query..."
                placeholderTextColor="#6B7280"
                value={chatInput}
                onChangeText={setChatInput}
                multiline
              />
              <Pressable
                onPress={() => handleSendLocalReply(chatInput)}
                disabled={isSending || !chatInput.trim()}
                style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: chatInput.trim() ? '#FCD34D' : '#131F18', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: chatInput.trim() ? '#FCD34D' : 'rgba(252, 211, 77, 0.2)' }}
              >
                {isSending ? <ActivityIndicator size="small" color="#012B18" /> : <Feather name="send" size={18} color={chatInput.trim() ? '#012B18' : '#6B7280'} style={{ marginLeft: 2 }} />}
              </Pressable>
            </View>
          </View>
        ) : (
          /* BODY 3: List of Enquiries & New Enquiry Launcher */
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Create New Button Header */}
            <Pressable
              onPress={() => setIsCreatingNew(true)}
              style={{
                backgroundColor: '#131F18',
                borderRadius: 16,
                paddingHorizontal: 20,
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24,
                borderWidth: 1.5,
                borderColor: '#FCD34D',
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>Have a question or issue?</Text>
                <Text style={{ fontSize: 13, color: '#FCD34D', marginTop: 2, fontWeight: '600' }}>
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
                <Feather name="plus" size={22} color="#012B18" />
              </View>
            </Pressable>

            <Text
              style={{
                fontSize: 13,
                textTransform: 'uppercase',
                color: '#FCD34D',
                fontWeight: '800',
                letterSpacing: 0.8,
                marginBottom: 12,
              }}
            >
              Your Active Enquiries & Live Chats ({(activeConversations || []).length})
            </Text>

            {!(activeConversations && activeConversations.length > 0) ? (
              <View
                style={{
                  backgroundColor: '#131F18',
                  borderRadius: 16,
                  padding: 32,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(252, 211, 77, 0.2)',
                }}
              >
                <Feather name="message-square" size={40} color="#FCD34D" style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>No support enquiries yet</Text>
                <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 4 }}>
                  Click "Start a live chat enquiry" above to connect with Foodie Admin Support.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {(activeConversations || []).map((item) => {
                  const hasAdminReply = item.messages?.some((m) => m.senderType === 'AGENT') || Boolean(item.lastMessageAt);
                  const lastMessageItem = item.messages && item.messages.length > 0
                    ? item.messages[item.messages.length - 1]
                    : null;
                  const lastMessage = lastMessageItem ? lastMessageItem.content : item.subject;

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setActiveEnquiryId(item.id)}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? 'rgba(252, 211, 77, 0.1)' : '#131F18',
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: hasAdminReply ? '#FCD34D' : 'rgba(252, 211, 77, 0.2)',
                      })}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#FCD34D' }}>{item.id}</Text>
                          {hasAdminReply ? (
                            <View
                              style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 10,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                borderWidth: 1,
                                borderColor: 'rgba(16, 185, 129, 0.3)',
                              }}
                            >
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981' }}>Admin Replied</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>{new Date(item.updatedAt).toLocaleDateString()}</Text>
                      </View>

                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginTop: 8 }}>
                        {item.subject}
                      </Text>

                      <Text
                        numberOfLines={2}
                        style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4, lineHeight: 18 }}
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
                          borderTopColor: 'rgba(252, 211, 77, 0.15)',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#FCD34D' }}>
                          Tap to open two-way chat ›
                        </Text>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 8,
                            backgroundColor:
                              item.status === 'RESOLVED'
                                ? 'rgba(16, 185, 129, 0.2)'
                                : (item.status === 'WAITING_FOR_AGENT' || item.status === 'ASSIGNED')
                                  ? 'rgba(252, 211, 77, 0.2)'
                                  : 'rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '800',
                              color:
                                item.status === 'RESOLVED'
                                  ? '#10B981'
                                  : (item.status === 'WAITING_FOR_AGENT' || item.status === 'ASSIGNED')
                                    ? '#FCD34D'
                                    : '#9CA3AF',
                            }}
                          >
                            {item.status.replace(/_/g, ' ')}
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
