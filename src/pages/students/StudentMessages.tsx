import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { StudentDashboardLayout } from "@/components/student-dashboard/StudentDashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft, CheckCheck, MessageSquare, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { OnlineAvatar } from "@/components/chat/OnlineAvatar";

// ─── API Config ────────────────────────────────────────────────
const API_BASE = "http://127.0.0.1:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// ─── Types ─────────────────────────────────────────────────────
interface Contact {
  id: number;
  name: string;
  profile_img: string | null;
  last_message: string | null;
  last_message_time?: string;
  unseen_count?: number;
}

interface Message {
  id: number;
  from_id: number;
  to_id: number;
  body: string;
  attachment: string | null;
  seen: number;
  created_at: string;
}

// ─── Contact Details Validation ────────────────────────────────
const phoneRegex = /\b\d{10,15}\b/;
const emailRegex = /[a-z0-9._%+-]+(@?[a-z0-9.-]+\.[a-z]{2,4})/i;

function validateMessageContent(text: string): string | null {
  if (emailRegex.test(text)) {
    return "Sending email addresses or contact details is not allowed!";
  }
  if (phoneRegex.test(text)) {
    return "Sending phone numbers is not allowed!";
  }
  return null;
}

// ─── API Functions ─────────────────────────────────────────────
async function apiGetContacts(): Promise<Contact[]> {
  const res = await fetch(`${API_BASE}/getContacts`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch contacts");
  const data = await res.json();
  return data.contacts || [];
}

async function apiFetchMessages(
  contactId: number,
  page = 1
): Promise<{ messages: Message[]; total: number; last_page: number }> {
  const res = await fetch(`${API_BASE}/fetchMessages`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ id: contactId, per_page: 30, page }),
  });
  if (!res.ok) throw new Error("Failed to fetch messages");
  const data = await res.json();
  return {
    messages: data.messages || [],
    total: data.total || 0,
    last_page: data.last_page || 1,
  };
}

async function apiSendMessage(
  contactId: number,
  message: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/sendMessage`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      id: contactId,
      message: message,
      type: "user",
    }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

async function apiMakeSeen(contactId: number): Promise<void> {
  await fetch(`${API_BASE}/makeSeen`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ id: contactId }),
  });
}

// ─── Component ─────────────────────────────────────────────────
export default function StudentMessages() {
  const [searchParams] = useSearchParams();
  const tutorIdParam = searchParams.get("tutor");
  const isMobile = useIsMobile();

  // State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Get current user ID ───
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const res = await fetch(`${API_BASE}/get/user/update-profile`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          const userId = data.user_profile?.id || data.data?.id || data.user?.id || data.id;
          if (userId) {
            setCurrentUserId(userId);
          }
        }
      } catch (err) {
        console.error("Failed to get user ID:", err);
      }
    };
    fetchUserId();
  }, []);

  // ─── Load Contacts ───
  const loadContacts = useCallback(async () => {
    try {
      const data = await apiGetContacts();
      setContacts(data);
    } catch (err) {
      console.error("Error loading contacts:", err);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // ─── Handle tutor query param ───
  useEffect(() => {
    if (tutorIdParam) {
      const id = parseInt(tutorIdParam);
      setActiveChat(id);
    }
  }, [tutorIdParam]);

  // ─── Load Messages when active chat changes ───
  const loadMessages = useCallback(async (contactId: number) => {
    setLoadingMessages(true);
    try {
      const data = await apiFetchMessages(contactId);
      setMessages((data.messages || []).reverse());
      await apiMakeSeen(contactId);
      setContacts((prev) =>
        prev.map((c) => (c.id === contactId ? { ...c, unseen_count: 0 } : c))
      );
    } catch (err) {
      console.error("Error loading messages:", err);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat);
    } else {
      setMessages([]);
    }
  }, [activeChat, loadMessages]);

  // ─── Polling for new messages (every 5 seconds) ───
  useEffect(() => {
    if (activeChat) {
      pollingRef.current = setInterval(async () => {
        try {
          const data = await apiFetchMessages(activeChat);
          const newMessages = (data.messages || []).reverse();
          setMessages(newMessages);
          await apiMakeSeen(activeChat);
        } catch {
          // silent fail
        }
      }, 5000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [activeChat]);

  // ─── Refresh contacts periodically ───
  useEffect(() => {
    const contactInterval = setInterval(() => {
      loadContacts();
    }, 10000);
    return () => clearInterval(contactInterval);
  }, [loadContacts]);

  // ─── Scroll to bottom on new messages ───
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Send Message ───
  const handleSend = async () => {
    const trimmed = messageText.trim();
    if (!trimmed || !activeChat || sendingMessage) return;

    // ── Contact details validation ──
    const validationError = validateMessageContent(trimmed);
    if (validationError) {
      toast({
        title: "Not Allowed",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setSendingMessage(true);
    setMessageText("");

    const tempMsg: Message = {
      id: Date.now(),
      from_id: currentUserId || 0,
      to_id: activeChat,
      body: trimmed,
      attachment: null,
      seen: 0,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    setContacts((prev) =>
      prev.map((c) =>
        c.id === activeChat ? { ...c, last_message: trimmed } : c
      )
    );

    try {
      const response = await apiSendMessage(activeChat, trimmed);

      if (response.error?.status === 1) {
        toast({
          title: "Error",
          description: response.error.message || "Failed to send message",
          variant: "destructive",
        });
        setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
        return;
      }

      if (response.message?.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempMsg.id
              ? {
                  id: response.message.id,
                  from_id: response.message.from_id,
                  to_id: response.message.to_id,
                  body: response.message.message || trimmed,
                  attachment: null,
                  seen: response.message.seen || 0,
                  created_at: response.message.fullTime || new Date().toISOString(),
                }
              : m
          )
        );
      }
    } catch (err) {
      console.error("Error sending message:", err);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeContact = contacts.find((c) => c.id === activeChat);

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // ─── Render: Conversation List ───
  const conversationList = (
    <div className="flex flex-col h-full border-r border-border bg-card">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">Messages</h2>
      </div>
      <ScrollArea className="flex-1">
        {loadingContacts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
          </div>
        ) : (
          contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveChat(c.id)}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-3 text-left transition-colors hover:bg-muted/50",
                activeChat === c.id && "bg-muted"
              )}
            >
              <OnlineAvatar
                src={c.profile_img || ""}
                name={c.name}
                online={false}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {c.name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {c.last_message || "No messages yet"}
                </p>
              </div>
              {c.unseen_count && c.unseen_count > 0 ? (
                <Badge className="bg-primary text-primary-foreground text-[10px] h-5 min-w-5 flex items-center justify-center rounded-full px-1.5">
                  {c.unseen_count}
                </Badge>
              ) : null}
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );

  // ─── Render: Chat Window ───
  const chatWindow = !activeChat ? (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Select a conversation
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose a contact from the list to start chatting.
        </p>
      </div>
    </div>
  ) : (
    <div className="flex-1 flex flex-col bg-background min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 -ml-2"
            onClick={() => setActiveChat(null)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <OnlineAvatar
          src={activeContact?.profile_img || ""}
          name={activeContact?.name || "User"}
          size="sm"
          online={false}
        />
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {activeContact?.name || "User"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        {loadingMessages ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {messages.map((msg) => {
              const isMine = msg.from_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={cn("flex", isMine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    )}
                  >
                    <p>{msg.body}</p>
                    <div
                      className={cn(
                        "flex items-center gap-1 mt-1",
                        isMine ? "justify-end" : "justify-start"
                      )}
                    >
                      <span
                        className={cn(
                          "text-[10px]",
                          isMine
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        )}
                      >
                        {formatTime(msg.created_at)}
                      </span>
                      {isMine && (
                        <CheckCheck
                          className={cn(
                            "w-3.5 h-3.5",
                            msg.seen
                              ? "text-blue-400"
                              : "text-primary-foreground/50"
                          )}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <Input
            placeholder="Type a message…"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 rounded-full bg-muted border-0 focus-visible:ring-primary"
            disabled={sendingMessage}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!messageText.trim() || sendingMessage}
            className="rounded-full shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {sendingMessage ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  // ─── Layout ───
  if (isMobile) {
    return (
      <StudentDashboardLayout>
        <div className="h-[calc(100vh-3.5rem)] -m-4 flex flex-col">
          {activeChat === null ? conversationList : chatWindow}
        </div>
      </StudentDashboardLayout>
    );
  }

  return (
    <StudentDashboardLayout>
      <div className="h-[calc(100vh-2rem)] -m-4 md:-m-6 lg:-m-8 flex">
        <div className="w-80 shrink-0">{conversationList}</div>
        {chatWindow}
      </div>
    </StudentDashboardLayout>
  );
}