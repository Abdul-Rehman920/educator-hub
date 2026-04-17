export interface TeacherChatMessage {
  id: string;
  senderId: "teacher" | number;
  text: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
}

export interface TeacherChatConversation {
  studentId: number;
  studentName: string;
  studentAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: TeacherChatMessage[];
}

export const mockTeacherConversations: TeacherChatConversation[] = [
  {
    studentId: 1,
    studentName: "Aarav Sharma",
    studentAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
    lastMessage: "Thank you for the session, it was really helpful!",
    lastMessageTime: "3:10 PM",
    unreadCount: 2,
    messages: [
      { id: "t1", senderId: 1, text: "Hi! I had a question about today's homework.", timestamp: "2:40 PM", status: "read" },
      { id: "t2", senderId: "teacher", text: "Sure, go ahead! What are you stuck on?", timestamp: "2:42 PM", status: "read" },
      { id: "t3", senderId: 1, text: "Problem 5 on quadratic equations — I'm not sure how to factor it.", timestamp: "2:45 PM", status: "read" },
      { id: "t4", senderId: "teacher", text: "Try splitting the middle term. Look for two numbers that multiply to give ac and add to b.", timestamp: "2:50 PM", status: "read" },
      { id: "t5", senderId: 1, text: "Thank you for the session, it was really helpful!", timestamp: "3:10 PM", status: "read" },
    ],
  },
  {
    studentId: 2,
    studentName: "Priya Nair",
    studentAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
    lastMessage: "Can we reschedule Thursday's class?",
    lastMessageTime: "Yesterday",
    unreadCount: 1,
    messages: [
      { id: "t6", senderId: "teacher", text: "Hi Priya, just a reminder about our session on Thursday.", timestamp: "Yesterday 9:00 AM", status: "read" },
      { id: "t7", senderId: 2, text: "Hi! Yes, I remember. Actually, can we reschedule?", timestamp: "Yesterday 9:30 AM", status: "read" },
      { id: "t8", senderId: "teacher", text: "Sure, what time works for you?", timestamp: "Yesterday 9:35 AM", status: "read" },
      { id: "t9", senderId: 2, text: "Can we reschedule Thursday's class?", timestamp: "Yesterday 10:00 AM", status: "read" },
    ],
  },
  {
    studentId: 3,
    studentName: "Rohan Gupta",
    studentAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    lastMessage: "I'll send the essay draft by tonight.",
    lastMessageTime: "Mon",
    unreadCount: 0,
    messages: [
      { id: "t10", senderId: "teacher", text: "Rohan, how's the essay coming along?", timestamp: "Mon 5:00 PM", status: "read" },
      { id: "t11", senderId: 3, text: "Almost done! Just finishing the conclusion.", timestamp: "Mon 5:15 PM", status: "read" },
      { id: "t12", senderId: 3, text: "I'll send the essay draft by tonight.", timestamp: "Mon 5:20 PM", status: "read" },
    ],
  },
  {
    studentId: 4,
    studentName: "Meera Joshi",
    studentAvatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
    lastMessage: "See you next week!",
    lastMessageTime: "Last week",
    unreadCount: 0,
    messages: [
      { id: "t13", senderId: 4, text: "Thanks for explaining organic chemistry so well!", timestamp: "Last week", status: "read" },
      { id: "t14", senderId: "teacher", text: "You're welcome! Keep practicing the reaction mechanisms.", timestamp: "Last week", status: "read" },
      { id: "t15", senderId: 4, text: "See you next week!", timestamp: "Last week", status: "read" },
    ],
  },
];
