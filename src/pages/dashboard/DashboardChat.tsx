import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  ArrowLeft,
  CheckCheck,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { OnlineAvatar } from "@/components/chat/OnlineAvatar";

const API = "http://127.0.0.1:8000/api";

/* ─── Types ─── */
interface Contact {
  id: number;
  name: string;
  profile_img: string;
  last_message: string;
  last_message_time: string;
  unseen_count: number;
}

interface Message {
  id: number | string;
  from_id: number;
  to_id: number;
  body: string;
  seen: number;
  created_at: string;
  _optimistic?: boolean;
  _failed?: boolean;
}

/* ─── Helpers ─── */
function headers() {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/** Get current user ID from localStorage reliably */
function getCurrentUserId(): number | null {
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user?.id) return Number(user.id);
    }
  } catch {}
  return null;
}

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

function formatContactTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

/* ─── Contact Details Validation ─── */
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

/* ─── API Functions ─── */
async function apiGetContacts(): Promise<Contact[]> {
  const res = await fetch(`${API}/getContacts`, { headers: headers() });
  const data = await res.json();
  const list = Array.isArray(data) ? data : data?.data || data?.contacts || [];

  // If backend returns HTML string instead of array, return empty
  if (typeof list === "string") {
    console.warn("getContacts returned HTML instead of JSON array");
    return [];
  }

  return list.map((c: any) => ({
    id: c.id,
    name: c.name || c.first_name || "User",
    profile_img: c.profile_img || c.avatar || "",
    last_message: c.last_message || c.lastMessage || "",
    last_message_time: c.last_message_time || c.lastMessageTime || "",
    unseen_count: c.unseen_count || c.unseenCount || c.unread_count || 0,
  }));
}

async function apiFetchMessages(contactId: number): Promise<Message[]> {
  const res = await fetch(`${API}/fetchMessages`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ id: contactId }),
  });
  const data = await res.json();
  const msgs = Array.isArray(data) ? data : data?.data || data?.messages || [];

  // If backend returns HTML string, return empty
  if (typeof msgs === "string") {
    console.warn("fetchMessages returned HTML instead of JSON array");
    return [];
  }

  const parsed = msgs.map((m: any) => ({
    id: m.id,
    from_id: Number(m.from_id),
    to_id: Number(m.to_id),
    body: m.body || m.message || "",
    seen: Number(m.seen) || 0,
    created_at: m.created_at || "",
  }));

  // Backend returns newest first (->latest()), so reverse for chat view
  if (parsed.length > 1) {
    const firstTime = new Date(parsed[0].created_at).getTime();
    const lastTime = new Date(parsed[parsed.length - 1].created_at).getTime();
    if (firstTime > lastTime) {
      parsed.reverse();
    }
  }

  return parsed;
}

async function apiSendMessage(
  contactId: number,
  message: string
): Promise<any> {
  const res = await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ id: contactId, message, type: "user" }),
  });
  return res.json();
}

async function apiMakeSeen(contactId: number): Promise<void> {
  await fetch(`${API}/makeSeen`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ id: contactId }),
  });
}

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
export default function DashboardChat() {
  const isMobile = useIsMobile();

  const [currentUserId] = useState<number | null>(() => getCurrentUserId());
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval>>();
  const contactPollingRef = useRef<ReturnType<typeof setInterval>>();

  const activeContact = contacts.find((c) => c.id === activeChat);

  useEffect(() => {
    console.log("✅ Current User ID:", currentUserId);
  }, [currentUserId]);

  /* ── Load contacts ── */
  const loadContacts = useCallback(async () => {
    try {
      const list = await apiGetContacts();
      setContacts(list);
    } catch (err) {
      console.error("Failed to load contacts", err);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
    contactPollingRef.current = setInterval(loadContacts, 10000);
    return () => clearInterval(contactPollingRef.current);
  }, [loadContacts]);

  /* ── Load messages when active chat changes ── */
  const loadMessages = useCallback(async (contactId: number) => {
    setLoadingMessages(true);
    try {
      const msgs = await apiFetchMessages(contactId);
      setMessages(msgs);
      apiMakeSeen(contactId).catch(() => {});
      setContacts((prev) =>
        prev.map((c) => (c.id === contactId ? { ...c, unseen_count: 0 } : c))
      );
    } catch {
      toast({
        title: "Error",
        description: "Messages load nahi ho sakay.",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat);
      pollingRef.current = setInterval(() => {
        apiFetchMessages(activeChat)
          .then((msgs) => setMessages(msgs))
          .catch(() => {});
      }, 5000);
    }
    return () => clearInterval(pollingRef.current);
  }, [activeChat, loadMessages]);

  /* ── Scroll to bottom ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Send message ── */
  const handleSend = async () => {
    const trimmed = messageText.trim();
    if (!trimmed || !activeChat || sendingMessage || !currentUserId) return;

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

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      from_id: currentUserId,
      to_id: activeChat,
      body: trimmed,
      seen: 0,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageText("");
    setSendingMessage(true);

    try {
      const res = await apiSendMessage(activeChat, trimmed);
      const realMsg = res?.data || res?.message || res;

      if (realMsg?.id && typeof realMsg !== "string") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...realMsg,
                  from_id: Number(realMsg.from_id) || currentUserId,
                  to_id: Number(realMsg.to_id) || activeChat,
                  body: realMsg.body || realMsg.message || trimmed,
                  created_at: realMsg.created_at || new Date().toISOString(),
                  seen: Number(realMsg.seen) || 0,
                }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, _optimistic: false } : m
          )
        );
      }

      setContacts((prev) =>
        prev.map((c) =>
          c.id === activeChat
            ? {
                ...c,
                last_message: trimmed,
                last_message_time: new Date().toISOString(),
              }
            : c
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _failed: true } : m))
      );
      toast({
        title: "Error",
        description: "Message send nahi ho saka.",
        variant: "destructive",
      });
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

  /* ═══ JSX ═══ */

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
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              No conversations yet.
            </p>
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
                src={c.profile_img}
                name={c.name}
                online={false}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {c.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                    {formatContactTime(c.last_message_time)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {c.last_message}
                </p>
              </div>
              {c.unseen_count > 0 && (
                <Badge className="bg-primary text-primary-foreground text-[10px] h-5 min-w-5 flex items-center justify-center rounded-full px-1.5">
                  {c.unseen_count}
                </Badge>
              )}
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );

  const chatWindow = !activeContact ? (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Select a conversation
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose a student from the list to start chatting.
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
          src={activeContact.profile_img}
          name={activeContact.name}
          size="sm"
          online={false}
        />
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {activeContact.name}
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
              const isMine = Number(msg.from_id) === Number(currentUserId);
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    isMine ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md",
                      msg._failed && "opacity-50"
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
                        {msg._optimistic
                          ? "Sending..."
                          : formatTime(msg.created_at)}
                      </span>
                      {isMine && !msg._optimistic && (
                        <CheckCheck
                          className={cn(
                            "w-3.5 h-3.5",
                            msg.seen
                              ? "text-blue-300"
                              : "text-primary-foreground/50"
                          )}
                        />
                      )}
                    </div>
                    {msg._failed && (
                      <p className="text-[10px] text-red-300 mt-0.5">
                        Failed to send
                      </p>
                    )}
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

  if (isMobile) {
    return (
      <DashboardLayout>
        <div className="h-[calc(100vh-3.5rem)] -m-4 flex flex-col">
          {activeChat === null ? conversationList : chatWindow}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-2rem)] -m-4 md:-m-6 lg:-m-8 flex">
        <div className="w-80 shrink-0">{conversationList}</div>
        {chatWindow}
      </div>
    </DashboardLayout>
  );
}