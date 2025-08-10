import HeaderPickers from "@/components/HeaderPickers";
import TabBar from "@/components/TabBar";
import { Button } from "@/components/ui/button";

const Feeding = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-screen-md mx-auto px-4 py-3">
          <HeaderPickers />
        </div>
      </header>
      <main className="max-w-screen-md mx-auto px-4 pb-24 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Feeding</h2>
          <div className="text-sm text-muted-foreground">Feed stock: —</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary">+5 kg</Button>
          <Button variant="secondary">+10 kg</Button>
        </div>
        <div className="text-sm text-muted-foreground">Add Stock from here when low.</div>
      </main>
      <TabBar />
    </div>
  );
};

export default Feeding;
