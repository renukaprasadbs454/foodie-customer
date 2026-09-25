import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, ScrollView, Pressable, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { Text, useTheme } from 'foodie-shared-rn';
import { Feather } from '@expo/vector-icons';
import { useGetOrderMessagesQuery, useSendOrderMessageMutation } from '../../../api/endpoints/ordersApi';

type Props = {
    orderId: string;
    senderRole: string;
};

export function OrderChat({ orderId, senderRole }: Props) {
    const { tokens } = useTheme();
    const [message, setMessage] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);

    const { data: messages = [], isLoading } = useGetOrderMessagesQuery(orderId, {
        pollingInterval: 3000,
    });

    const [sendMsg, { isLoading: isSending }] = useSendOrderMessageMutation();

    useEffect(() => {
        if (messages.length > 0 && scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length]);

    const handleSend = async () => {
        if (!message.trim()) return;
        try {
            await sendMsg({ orderId, senderRole, messageText: message.trim() }).unwrap();
            setMessage('');
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F1F5F9' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={{ padding: 16, gap: 12 }}
                style={{ flex: 1 }}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color="#14532D" style={{ marginTop: 20 }} />
                ) : messages.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
                        <Feather name="message-square" size={40} color="#94A3B8" style={{ marginBottom: 12 }} />
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#334155' }}>No messages yet</Text>
                        <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                            Send a message to start the conversation.
                        </Text>
                    </View>
                ) : (
                    messages.map((m: any) => {
                        const isSelf = m.senderRole === senderRole;
                        return (
                            <View key={m.id} style={{ alignSelf: isSelf ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, alignSelf: isSelf ? 'flex-end' : 'flex-start', gap: 6 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: isSelf ? '#14532D' : '#64748B' }}>
                                        {m.senderRole}
                                    </Text>
                                </View>
                                <View style={{
                                    backgroundColor: isSelf ? '#14532D' : '#FFFFFF',
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    borderRadius: 16,
                                    borderTopLeftRadius: isSelf ? 16 : 4,
                                    borderTopRightRadius: isSelf ? 4 : 16,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 2,
                                    elevation: 1,
                                }}>
                                    <Text style={{ fontSize: 14, color: isSelf ? '#FFFFFF' : '#1E293B', lineHeight: 20 }}>
                                        {m.messageText}
                                    </Text>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <View style={{
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderTopWidth: 1,
                borderTopColor: '#E2E8F0',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
            }}>
                <TextInput
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
                    placeholder="Type a message..."
                    placeholderTextColor="#94A3B8"
                    value={message}
                    onChangeText={setMessage}
                    multiline
                />
                <Pressable
                    onPress={handleSend}
                    disabled={isSending || !message.trim()}
                    style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: message.trim() ? '#14532D' : '#94A3B8',
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
        </KeyboardAvoidingView>
    );
}
