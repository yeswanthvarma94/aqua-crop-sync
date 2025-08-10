import TabBar from "@/components/TabBar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/state/AuthContext";

const Settings = () => {
  const { user, signInDev, signOut, isDevLoginEnabled } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-screen-md mx-auto px-4 py-3">
          <h2 className="text-base font-semibold">Settings</h2>
        </div>
      </header>
      <main className="max-w-screen-md mx-auto px-4 pb-24 pt-4 space-y-4">
        <section>
          <h3 className="font-medium">Profile</h3>
          <p className="text-sm text-muted-foreground">{user ? `${user.name} — ${user.role}` : "Not signed in"}</p>
        </section>
        {isDevLoginEnabled ? (
          <section className="space-x-2">
            <Button onClick={() => signInDev("owner")}>Dev Login as Owner</Button>
            <Button variant="secondary" onClick={() => signInDev("manager")}>Dev Login as Manager</Button>
            <Button variant="secondary" onClick={() => signInDev("partner")}>Dev Login as Partner</Button>
            {user && <Button variant="destructive" onClick={() => signOut()}>Sign out</Button>}
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">Dev Test Login disabled in production.</p>
        )}
        <section>
          <h3 className="font-medium">Diagnostics</h3>
          <p className="text-sm text-muted-foreground">Offline/Sync diagnostics will appear here.</p>
        </section>
      </main>
      <TabBar />
    </div>
  );
};

export default Settings;
