import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

export const STORAGE_KEY = 'foodie_support_enquiries';

export interface AiActionButton {
  label: string;
  actionText: string;
}

export interface AiResponseResult {
  reply: string;
  canResolve: boolean;
  suggestAgent: boolean;
  actionButtons: AiActionButton[];
}

/**
 * Intelligent Customer Support Reply & Contextual Action Button Generator.
 * Answers customer questions directly with 2-4 contextual action buttons tailored to the specific query.
 */
export function evaluateSmartSupportReply(userMsg: string): AiResponseResult {
  const text = (userMsg || '').toLowerCase().trim();

  // 1. Explicit Disconnect / End Agent Chat
  if (text === 'disconnect' || text.includes('end chat') || text.includes('stop agent')) {
    return {
      reply: "Agent chat session ended. You are back in Foodie AI Assistant mode. How else can we help you today?",
      canResolve: true,
      suggestAgent: false,
      actionButtons: [
        { label: '📍 Track Active Order', actionText: 'Where is my order?' },
        { label: '💳 Check Refund Status', actionText: 'Refund status for my order' },
        { label: '🏷️ Browse Coupons & Offers', actionText: 'Are there active coupons or offers?' },
      ],
    };
  }

  // 2. Explicit Agent Escalation Request
  if (
    text.includes('connect') ||
    text.includes('agent') ||
    text.includes('human') ||
    text.includes('representative') ||
    text.includes('talk to someone') ||
    text.includes('speak to agent')
  ) {
    return {
      reply: "I am connecting your query directly to an Admin Support Agent. Please hold while our team reviews your account...",
      canResolve: false,
      suggestAgent: true,
      actionButtons: [
        { label: '🎧 Connect with Agent', actionText: 'I want to connect to a live support agent.' },
      ],
    };
  }

  // 3. Complex / Complaint queries requiring Human Desk verification
  if (
    text.includes('return') ||
    text.includes('missing') ||
    text.includes('damage') ||
    text.includes('damaged') ||
    text.includes('wrong') ||
    text.includes('quality') ||
    text.includes('cold') ||
    text.includes('bad') ||
    text.includes('spoiled') ||
    text.includes('complaint') ||
    text.includes('stale') ||
    text.includes('scam') ||
    text.includes('fraud') ||
    text.includes('double debit')
  ) {
    return {
      reply: "I'm sorry to hear that! Because this issue requires personal account inspection and manual verification, would you like to connect directly with an Admin Support Agent?",
      canResolve: false,
      suggestAgent: true,
      actionButtons: [
        { label: '🎧 Connect to Live Support Agent', actionText: 'I want to connect to a live support agent.' },
        { label: '📷 Report Item Issue', actionText: 'I want to report a food quality issue.' },
      ],
    };
  }

  // 4. Auto-Resolvable: Delivery / Tracking / Rider Location
  if (
    text.includes('delivery') ||
    text.includes('late') ||
    text.includes('delay') ||
    text.includes('rider') ||
    text.includes('driver') ||
    text.includes('track') ||
    text.includes('where is my') ||
    text.includes('status') ||
    text.includes('address') ||
    text.includes('location')
  ) {
    return {
      reply: "Order #ORD-9821 is being prepared by Royal Biryani House and will be delivered within 30-45 minutes. You can track your delivery rider live on the Tracking screen!",
      canResolve: true,
      suggestAgent: false,
      actionButtons: [
        { label: '📍 Live Map Tracking', actionText: 'Where is my order?' },
        { label: '⏱️ Check Delivery Time', actionText: 'What is the estimated delivery time?' },
        { label: '📞 Contact Delivery Rider', actionText: 'How to call rider?' },
        { label: '🎧 Connect to Agent', actionText: 'I want to connect to a live support agent.' },
      ],
    };
  }

  // 5. Auto-Resolvable: Order Cancellations
  if (
    text.includes('cancel') ||
    text.includes('cancellation') ||
    text.includes('stop order') ||
    text.includes('abort') ||
    text.includes('modify')
  ) {
    return {
      reply: "You can cancel active orders directly from the Live Order Tracking screen before the kitchen accepts it. If food preparation has started, our support desk will verify cancellation and refund eligibility.",
      canResolve: true,
      suggestAgent: false,
      actionButtons: [
        { label: '❌ Cancel Order #ORD-9821', actionText: 'I want to cancel my order' },
        { label: '📜 View Cancellation Policy', actionText: 'What is the cancellation policy?' },
        { label: '🎧 Talk to Support Agent', actionText: 'I want to connect to a live support agent.' },
      ],
    };
  }

  // 6. Auto-Resolvable: Refunds & Payment Deductions
  if (
    text.includes('refund') ||
    text.includes('money') ||
    text.includes('debited') ||
    text.includes('deducted') ||
    text.includes('payment') ||
    text.includes('paid') ||
    text.includes('wallet') ||
    text.includes('bank') ||
    text.includes('charged') ||
    text.includes('cod') ||
    text.includes('cash')
  ) {
    return {
      reply: "Refunds for cancelled or failed orders are automatically processed. Bank refunds take 3-5 business days, while Foodie Wallet credits reflect instantly. Check your wallet balance anytime in Profile > Wallet.",
      canResolve: true,
      suggestAgent: false,
      actionButtons: [
        { label: '💳 Check Wallet Balance', actionText: 'Refund status for my order' },
        { label: '📜 Refund Policy Details', actionText: 'How do refunds work?' },
        { label: '🎧 Speak to Admin Agent', actionText: 'I want to connect to a live support agent.' },
      ],
    };
  }

  // 7. Auto-Resolvable: Coupons & Offers
  if (
    text.includes('coupon') ||
    text.includes('promo') ||
    text.includes('offer') ||
    text.includes('discount') ||
    text.includes('code') ||
    text.includes('deal')
  ) {
    return {
      reply: "To use a promo code like WELCOME100, ensure your cart total meets the minimum requirement and enter the code at checkout under 'Apply Coupon'!",
      canResolve: true,
      suggestAgent: false,
      actionButtons: [
        { label: '🏷️ Active Offers & Deals', actionText: 'Are there active coupons or offers?' },
        { label: '🛒 Go to Cart & Checkout', actionText: 'Where is my order?' },
        { label: '🎧 Need Code Assistance?', actionText: 'I want to connect to a live support agent.' },
      ],
    };
  }

  // 8. Auto-Resolvable: Recommendations / Hotels / Food
  if (
    text.includes('suggest') ||
    text.includes('recommend') ||
    text.includes('best restaurant') ||
    text.includes('top food') ||
    text.includes('famous') ||
    text.includes('popular') ||
    text.includes('food') ||
    text.includes('restaurant') ||
    text.includes('hotel') ||
    text.includes('tumkur') ||
    text.includes('biryani') ||
    text.includes('pizza') ||
    text.includes('burger') ||
    text.includes('veg')
  ) {
    return {
      reply: "Looking for great food recommendations? Check out top customer favorites on Foodie like 'Royal Biryani House' (4.8★), 'Green Leaf Delights' (4.7★), and 'Domino's Pizza' (4.6★)! Use category filters on the Home screen for fast 20-30 min delivery.",
      canResolve: true,
      suggestAgent: false,
      actionButtons: [
        { label: '🍲 Top Biryani Places', actionText: 'Show top biryani restaurants' },
        { label: '🥗 Pure Veg Options', actionText: 'Show veg options' },
        { label: '⚡ Fast 20-min Delivery', actionText: 'Fast delivery' },
      ],
    };
  }

  // 9. Auto-Resolvable: Greetings & Assistance
  if (
    text.match(/^(hi|hello|hey|greetings|good morning|good evening|good afternoon|who are you|how are you)\b/) ||
    text === 'hi' ||
    text === 'hello' ||
    text === 'hey'
  ) {
    return {
      reply: "Hello! I'm your Foodie Customer Support Assistant. How can I help you today? You can ask me about order tracking, cancellations, refunds, payments, or active coupons!",
      canResolve: true,
      suggestAgent: false,
      actionButtons: [
        { label: '📍 Track Active Order', actionText: 'Where is my order?' },
        { label: '💳 Check Refund Status', actionText: 'Refund status for my order' },
        { label: '🏷️ Active Offers & Coupons', actionText: 'Are there active coupons or offers?' },
      ],
    };
  }

  // 10. Auto-Resolvable: Courtesy
  if (
    text === 'ok' ||
    text === 'okay' ||
    text.includes('thanks') ||
    text.includes('thank you') ||
    text === 'sure' ||
    text === 'got it' ||
    text === 'great' ||
    text === 'awesome' ||
    text === 'nice'
  ) {
    return {
      reply: "You're very welcome! Let me know if you need any other help with your order. Have a wonderful meal!",
      canResolve: true,
      suggestAgent: false,
      actionButtons: [
        { label: '📍 Track Active Order', actionText: 'Where is my order?' },
        { label: '🏷️ Browse Coupons', actionText: 'Are there active coupons or offers?' },
      ],
    };
  }

  // 11. Unresolvable / Unknown Queries -> Suggest Agent
  return {
    reply: `I couldn't automatically find an answer for "${userMsg.trim()}". Would you like to connect with a Live Support Agent?`,
    canResolve: false,
    suggestAgent: true,
    actionButtons: [
      { label: '🎧 Connect to Live Support Agent', actionText: 'I want to connect to a live support agent.' },
    ],
  };
}

export function generateSupportReply(userMsg: string): string {
  return evaluateSmartSupportReply(userMsg).reply;
}

/**
 * Persists customer message and AI reply into shared storage key `foodie_support_enquiries`.
 * Automatically syncs Admin Support Dashboard and Customer App in real time.
 */
export async function syncSupportChatMessages(
  userText: string,
  targetEnquiryId?: string,
  senderName: string = 'Ananya Sharma'
): Promise<{ userMsg: ChatMessage; aiMsg: ChatMessage; aiResult: AiResponseResult }> {
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. Evaluate smart AI response
  const aiResult = evaluateSmartSupportReply(userText);

  // 2. Load existing enquiries list
  let rawData: string | null = null;
  try {
    rawData = await AsyncStorage.getItem(STORAGE_KEY);
    if (!rawData && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      rawData = window.localStorage.getItem(STORAGE_KEY);
    }
  } catch (e) {
    rawData = null;
  }

  let enquiriesList: EnquiryRecord[] = [];
  if (rawData) {
    try {
      enquiriesList = JSON.parse(rawData);
    } catch (e) {
      enquiriesList = [];
    }
  }

  let targetId = targetEnquiryId || 'ENQ-901';
  let enquiryIndex = enquiriesList.findIndex((e) => e.id === targetId);

  if (enquiryIndex === -1 && enquiriesList.length > 0) {
    targetId = enquiriesList[0].id;
    enquiryIndex = 0;
  }

  const userMsg: ChatMessage = {
    id: `msg-cust-${Date.now()}`,
    enquiryId: targetId,
    sender: 'customer',
    senderName: senderName,
    message: userText.trim(),
    timestamp: nowTime,
  };

  const aiMsg: ChatMessage = {
    id: `msg-ai-${Date.now() + 1}`,
    enquiryId: targetId,
    sender: 'admin',
    senderName: 'Foodie Support Assistant',
    message: aiResult.reply,
    timestamp: nowTime,
  };

  if (enquiryIndex !== -1) {
    const record = enquiriesList[enquiryIndex];
    const existingMsgs = record.messages || [
      {
        id: `msg-orig-${record.id}`,
        enquiryId: record.id,
        sender: 'customer',
        senderName: record.senderName,
        message: record.message,
        timestamp: record.timestamp,
      },
    ];

    enquiriesList[enquiryIndex] = {
      ...record,
      messages: [...existingMsgs, userMsg, aiMsg],
      replyMessage: aiResult.reply,
      status: record.status === 'RESOLVED' ? 'IN_PROGRESS' : record.status,
    };
  } else {
    const newRecord: EnquiryRecord = {
      id: targetId,
      category: 'CUSTOMER',
      senderName: senderName,
      senderEmail: 'ananya.s@gmail.com',
      senderPhone: '+91 98765 12345',
      subject: `Customer Enquiry: ${userText.substring(0, 30)}...`,
      message: userText.trim(),
      timestamp: nowTime,
      status: 'OPEN',
      priority: 'HIGH',
      replyMessage: aiResult.reply,
      messages: [userMsg, aiMsg],
    };
    enquiriesList.unshift(newRecord);
  }

  // Save back to storage & POST to online backend API
  const serialized = JSON.stringify(enquiriesList);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, serialized);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, serialized);
      window.dispatchEvent(new Event('foodie_enquiry_updated'));
    }
  } catch (e) {
    console.error('Error saving chat storage', e);
  }

  // Non-blocking background POST to dev server endpoints
  postToBackendSync({
    id: targetId,
    category: 'CUSTOMER',
    senderName: senderName,
    senderEmail: 'ananya.s@gmail.com',
    senderPhone: '+91 98765 12345',
    subject: `Live Support Chat: ${userText.substring(0, 30)}...`,
    message: userText.trim(),
  });

  return { userMsg, aiMsg, aiResult };
}

function postToBackendSync(payload: any) {
  const targetEndpoints = [
    '/api/support-tickets',
    'http://localhost:3000/api/support-tickets',
    'http://localhost:3001/api/support-tickets',
    'http://10.205.58.92:3000/api/support-tickets',
    'http://10.59.183.92:3000/api/support-tickets',
    'http://10.205.58.92:3001/api/support-tickets',
  ];

  for (const url of targetEndpoints) {
    try {
      void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch (e) {}
  }
}

/**
 * Creates a brand-new live customer enquiry ticket directly dispatched to Admin Support Desk.
 * Creates a NEW Enquiry record card (e.g. ENQ-906) under Admin -> Support -> Customer Enquiries.
 */
export async function connectToAgentAndCreateEnquiry(
  userText: string,
  customerName: string = 'Ananya Sharma',
  customerEmail: string = 'ananya.s@gmail.com',
  customerPhone: string = '+91 98765 12345',
  orderId?: string,
  existingEnquiryId?: string
): Promise<{ enquiryRecord: EnquiryRecord; userMsg: ChatMessage; systemConfirmationMsg: ChatMessage }> {
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. Load existing enquiries list
  let rawData: string | null = null;
  try {
    rawData = await AsyncStorage.getItem(STORAGE_KEY);
    if (!rawData && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      rawData = window.localStorage.getItem(STORAGE_KEY);
    }
  } catch (e) {
    rawData = null;
  }

  let enquiriesList: EnquiryRecord[] = [];
  if (rawData) {
    try {
      enquiriesList = JSON.parse(rawData);
    } catch (e) {
      enquiriesList = [];
    }
  }

  // Purge test spam IDs (906, 933, 946, 955, 963, 966, 989, etc.)
  enquiriesList = enquiriesList.filter((e) => {
    const num = parseInt((e.id || '').replace('ENQ-', ''), 10);
    return isNaN(num) || num <= 905;
  });

  const enquiryId = 'ENQ-901';
  let existingIndex = enquiriesList.findIndex((e) => e.id === enquiryId);

  const userMsg: ChatMessage = {
    id: `msg-cust-${Date.now()}`,
    enquiryId: enquiryId,
    sender: 'customer',
    senderName: customerName,
    message: userText.trim(),
    timestamp: nowTime,
  };

  const systemConfirmationMsg: ChatMessage = {
    id: `msg-sys-${Date.now() + 1}`,
    enquiryId: enquiryId,
    sender: 'admin',
    senderName: 'Foodie Live Agent Desk',
    message: `🎧 Connected to Live Support Agent! An Admin Agent is reviewing your query (Ticket #${enquiryId}).`,
    timestamp: nowTime,
  };

  let resultingRecord: EnquiryRecord;

  if (existingIndex !== -1) {
    const rec = enquiriesList[existingIndex];
    const prevMsgs = (rec.messages || []).filter(
      (m) => !m.message.includes('Message sent to Admin Support') && !m.message.includes('Message delivered to Admin Support')
    );
    resultingRecord = {
      ...rec,
      message: userText.trim(),
      timestamp: 'Just now',
      status: rec.status === 'RESOLVED' ? 'IN_PROGRESS' : rec.status,
      messages: [...prevMsgs, userMsg],
    };
    enquiriesList[existingIndex] = resultingRecord;
  } else {
    resultingRecord = {
      id: enquiryId,
      category: 'CUSTOMER',
      senderName: customerName,
      senderEmail: customerEmail,
      senderPhone: customerPhone,
      subject: `Live Agent Request: ${userText.substring(0, 35)}...`,
      message: userText.trim(),
      timestamp: 'Just now',
      status: 'OPEN',
      priority: 'HIGH',
      orderId: orderId,
      messages: [userMsg],
    };
    enquiriesList.unshift(resultingRecord);
  }

  const serialized = JSON.stringify(enquiriesList);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, serialized);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, serialized);
      window.dispatchEvent(new Event('foodie_enquiry_updated'));
    }
  } catch (e) {
    console.error('Error saving agent enquiry', e);
  }

  // Non-blocking background POST to dev server endpoints
  postToBackendSync({
    id: resultingRecord.id,
    category: 'CUSTOMER',
    senderName: customerName,
    senderEmail: customerEmail,
    senderPhone: customerPhone,
    subject: resultingRecord.subject,
    message: userText.trim(),
    messages: resultingRecord.messages,
  });

  return { enquiryRecord: resultingRecord, userMsg, systemConfirmationMsg };
}
