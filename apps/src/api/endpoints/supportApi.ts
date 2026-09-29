import { baseApi } from '../baseApi';

export interface SupportConversation {
    id: string;
    customerId: string;
    assignedAgentId?: string;
    status: 'AI_ACTIVE' | 'WAITING_FOR_AGENT' | 'ASSIGNED' | 'AGENT_ACTIVE' | 'RESOLVED' | 'CLOSED';
    category: string;
    subject: string;
    orderId?: string;
    createdAt: string;
    updatedAt: string;
    lastMessageAt?: string;
    resolvedAt?: string;
    closedAt?: string;
    messages?: SupportMessage[];
}

export interface SupportMessage {
    id: string;
    conversationId: string;
    senderType: 'CUSTOMER' | 'AI' | 'AGENT' | 'SYSTEM';
    senderId?: string;
    senderName: string;
    messageType: 'TEXT' | 'SYSTEM' | 'AI_RESPONSE' | 'AGENT_RESPONSE' | 'ATTACHMENT' | 'ORDER_CONTEXT';
    content: string;
    createdAt: string;
    readAt?: string;
}

export const supportApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getMyConversations: builder.query<SupportConversation[], void>({
            query: () => ({ url: '/api/v1/support/conversations' }),
            providesTags: ['SupportConversation'],
        }),
        createOrGetConversation: builder.mutation<SupportConversation, { category?: string; subject?: string; orderId?: string }>({
            query: (body) => ({
                url: '/api/v1/support/conversations',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['SupportConversation'],
        }),
        escalateConversation: builder.mutation<SupportConversation, string>({
            query: (id) => ({
                url: `/api/v1/support/conversations/${id}/escalate`,
                method: 'POST',
            }),
            invalidatesTags: ['SupportConversation', 'SupportMessage'],
        }),
        getMessages: builder.query<SupportMessage[], string>({
            query: (id) => ({ url: `/api/v1/support/conversations/${id}/messages` }),
            providesTags: (result, error, id) => [{ type: 'SupportMessage', id }],
        }),
        sendMessage: builder.mutation<SupportMessage, { conversationId: string; message: string; senderName?: string; senderType?: string }>({
            query: ({ conversationId, ...body }) => ({
                url: `/api/v1/support/conversations/${conversationId}/messages`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { conversationId }) => [
                { type: 'SupportMessage', id: conversationId },
            ],
        }),
        resolveConversation: builder.mutation<SupportConversation, string>({
            query: (id) => ({
                url: `/api/v1/support/conversations/${id}/resolve`,
                method: 'PUT',
            }),
            invalidatesTags: ['SupportConversation'],
        }),
        syncLegacyChat: builder.mutation<SupportConversation, any>({
            query: (body) => ({
                url: `/api/v1/support/conversations/sync`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['SupportConversation', 'SupportMessage'],
        }),
    }),
});

export const {
    useGetMyConversationsQuery,
    useCreateOrGetConversationMutation,
    useEscalateConversationMutation,
    useGetMessagesQuery,
    useSendMessageMutation,
    useResolveConversationMutation,
    useSyncLegacyChatMutation,
} = supportApi;
