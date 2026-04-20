import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

interface UnlockedTutorsContextType {
  unlockedTutorIds: Set<number>;
  unlockTutor: (id: number) => void;
  isTutorUnlocked: (id: number) => boolean;
  refreshUnlocked: () => void;
}

const UnlockedTutorsContext = createContext<UnlockedTutorsContextType | undefined>(undefined);

export function UnlockedTutorsProvider({ children }: { children: ReactNode }) {
  // Start with empty set — always fetch fresh from API
  const [unlockedTutorIds, setUnlockedTutorIds] = useState<Set<number>>(new Set());

  // Fetch unlocked tutors from backend for current logged-in student
  const fetchUnlocked = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      // No user logged in — clear everything
      setUnlockedTutorIds(new Set());
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/student/unlocked-tutors`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        setUnlockedTutorIds(new Set());
        return;
      }
      const data = await res.json();
      // Backend returns array of tutor ids or objects
      const ids: number[] = (data?.unlocked_tutors || data?.data || []).map(
        (item: any) => Number(item?.tutor_id || item?.id || item)
      );
      setUnlockedTutorIds(new Set(ids));
    } catch {
      setUnlockedTutorIds(new Set());
    }
  }, []);

  // Fetch on mount (every time app loads / user changes)
  useEffect(() => {
    fetchUnlocked();
  }, [fetchUnlocked]);

  // Optimistically add a tutor locally after payment (no localStorage)
  const unlockTutor = useCallback((id: number) => {
    setUnlockedTutorIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const isTutorUnlocked = useCallback(
    (id: number) => unlockedTutorIds.has(id),
    [unlockedTutorIds]
  );

  return (
    <UnlockedTutorsContext.Provider
      value={{
        unlockedTutorIds,
        unlockTutor,
        isTutorUnlocked,
        refreshUnlocked: fetchUnlocked,
      }}
    >
      {children}
    </UnlockedTutorsContext.Provider>
  );
}

export function useUnlockedTutors() {
  const ctx = useContext(UnlockedTutorsContext);
  if (!ctx) throw new Error("useUnlockedTutors must be used within UnlockedTutorsProvider");
  return ctx;
}
