export interface ChatMessage {
  id: string;
  senderId: "student" | number;
  text: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
}

export interface ChatConversation {
  tutorId: number;
  tutorName: string;
  tutorAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export const mockConversations: ChatConversation[] = [
  {
    tutorId: 1,
    tutorName: "Dr. Sarah Chen",
    tutorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    lastMessage: "Sure, we can cover integration techniques next session.",
    lastMessageTime: "2:35 PM",
    unreadCount: 2,
    messages: [
      { id: "m1", senderId: "student", text: "Hi Dr. Chen! I wanted to ask about the next topic.", timestamp: "2:20 PM", status: "read" },
      { id: "m2", senderId: 1, text: "Hello! Of course, what would you like to focus on?", timestamp: "2:22 PM", status: "read" },
      { id: "m3", senderId: "student", text: "Can we go over integration by parts? I'm struggling with it.", timestamp: "2:25 PM", status: "read" },
      { id: "m4", senderId: 1, text: "Absolutely! That's a great topic to review.", timestamp: "2:30 PM", status: "read" },
      { id: "m5", senderId: 1, text: "Sure, we can cover integration techniques next session.", timestamp: "2:35 PM", status: "read" },
    ],
  },
  {
    tutorId: 2,
    tutorName: "Prof. James Miller",
    tutorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    lastMessage: "Don't forget to review chapter 5 before our session.",
    lastMessageTime: "Yesterday",
    unreadCount: 1,
    messages: [
      { id: "m6", senderId: "student", text: "Hello Professor! When is our next session?", timestamp: "Yesterday 10:00 AM", status: "read" },
      { id: "m7", senderId: 2, text: "We're scheduled for Thursday at 3 PM.", timestamp: "Yesterday 10:15 AM", status: "read" },
      { id: "m8", senderId: "student", text: "Perfect, I'll be ready!", timestamp: "Yesterday 10:20 AM", status: "read" },
      { id: "m9", senderId: 2, text: "Don't forget to review chapter 5 before our session.", timestamp: "Yesterday 10:30 AM", status: "read" },
    ],
  },
  {
    tutorId: 3,
    tutorName: "Dr. Aisha Patel",
    tutorAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    lastMessage: "Great progress on the essay structure!",
    lastMessageTime: "Mon",
    unreadCount: 0,
    messages: [
      { id: "m10", senderId: 3, text: "Hi! How's the essay coming along?", timestamp: "Mon 4:00 PM", status: "read" },
      { id: "m11", senderId: "student", text: "I finished the outline you suggested.", timestamp: "Mon 4:10 PM", status: "read" },
      { id: "m12", senderId: 3, text: "Great progress on the essay structure!", timestamp: "Mon 4:15 PM", status: "read" },
    ],
  },
  {
    tutorId: 4,
    tutorName: "Mr. David Kim",
    tutorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    lastMessage: "See you next week!",
    lastMessageTime: "Last week",
    unreadCount: 0,
    messages: [
      { id: "m13", senderId: "student", text: "Thanks for the session today!", timestamp: "Last week", status: "read" },
      { id: "m14", senderId: 4, text: "You're welcome! You did great today.", timestamp: "Last week", status: "read" },
      { id: "m15", senderId: 4, text: "See you next week!", timestamp: "Last week", status: "read" },
    ],
  },
];

// Regex to detect contact info patterns
const CONTACT_PATTERNS = /(\b\d{10,}\b|[\w.-]+@[\w.-]+\.\w{2,}|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|whatsapp|telegram|@\w{3,})/i;

export function containsContactInfo(text: string): boolean {
  return CONTACT_PATTERNS.test(text);
}
