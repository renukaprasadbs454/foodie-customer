import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import { Button, Card, Text, useTheme } from 'foodie-shared-rn';
import { useGetOrderMessagesQuery, useSendOrderMessageMutation } from '../../../api/endpoints/ordersApi';

type Props = {
    orderId: string;
    senderRole: string;
};

export function OrderChat({ orderId, senderRole }: Props) {
    const { tokens } = useTheme();
    const [message, setMessage] = useState('');

    const { data: messages = [], isLoading } = useGetOrderMessagesQuery(orderId, {
        pollingInterval: 10000,
    });

    const [sendMsg, { isLoading: isSending }] = useSendOrderMessageMutation();

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
        <Card style={{ padding: tokens.spacing.md, gap: tokens.spacing.sm, borderRadius: 14 }}>
            <Text variant="heading2" style={{ color: '#14532D', fontSize: 17 }}>
                Live Discussion
            </Text>

            <View style={{ height: 200, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 8, gap: 8 }}>
                {isLoading ? (
                    <Text variant="caption">Loading messages...</Text>
                ) : messages.length === 0 ? (
                    <Text variant="caption" color={tokens.color.textSecondary}>No messages yet.</Text>
                ) : (
                    messages.map((m: any) => (
                        <View key={m.id} style={{
                            alignSelf: m.senderRole === senderRole ? 'flex-end' : 'flex-start',
                            backgroundColor: m.senderRole === senderRole ? '#DCFCE7' : '#E2E8F0',
                            padding: 8,
                            borderRadius: 8,
                            maxWidth: '80%'
                        }}>
                            <Text variant="caption" style={{ fontWeight: 'bold' }}>{m.senderRole}</Text>
                            <Text variant="body">{m.messageText}</Text>
                        </View>
                    ))
                )}
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                    style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: tokens.color.border,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        height: 44,
                    }}
                    placeholder="Type a message..."
                    value={message}
                    onChangeText={setMessage}
                />
                <Button
                    label="Send"
                    accessibilityLabel="Send Message"
                    style={{ paddingHorizontal: 16, height: 44 }}
                    loading={isSending}
                    onPress={handleSend}
                />
            </View>
        </Card>
    );
}
