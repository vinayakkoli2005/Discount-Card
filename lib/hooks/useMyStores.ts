import { useState, useEffect, useCallback } from "react";
import { fetchMyStores } from "@/lib/api";
import { isValidStore } from "@/lib/appwrite";
import { Store } from "@/lib/types/store";

interface UseMyStoresResult {
  stores: Store[];
  isReady: boolean;
  refetch: () => void;
}

/**
 * Shared hook for loading the current user's stores.
 * Used by MyStores tab and Profile tab.
 * Includes unmount cleanup to prevent state updates on unmounted components.
 */
export function useMyStores(userId: string | undefined): UseMyStoresResult {
  const [stores, setStores] = useState<Store[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    if (!userId) {
      setStores([]);
      setIsReady(true);
      return;
    }

    setIsReady(false);

    fetchMyStores(userId)
      .then((data) => {
        if (!isMounted) return;
        setStores(data.filter(isValidStore));
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error("useMyStores fetch failed:", error);
        setStores([]);
      })
      .finally(() => {
        if (isMounted) setIsReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, [userId, trigger]);

  const refetch = useCallback(() => {
    setTrigger((t) => t + 1);
  }, []);

  return { stores, isReady, refetch };
}
