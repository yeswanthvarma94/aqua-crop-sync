
export const cleanupAuthState = () => {
  try {
    // Remove Supabase auth storage keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      if (k.startsWith("sb-") || k.startsWith("supabase") || k.includes("auth.token")) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // Remove app-level keys we use
    localStorage.removeItem("aqualedger.session");
    localStorage.removeItem("activeAccountId");
  } catch (e) {
    console.warn("cleanupAuthState: unable to clear storage", e);
  }
};

