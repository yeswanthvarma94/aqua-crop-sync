import HeaderPickers from "@/components/HeaderPickers";
import TabBar from "@/components/TabBar";

const Materials = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-screen-md mx-auto px-4 py-3">
          <HeaderPickers />
        </div>
      </header>
      <main className="max-w-screen-md mx-auto px-4 pb-24 pt-4 space-y-4">
        <h2 className="text-base font-semibold">Materials</h2>
        <p className="text-sm text-muted-foreground">Record medicines and materials usage. Low-stock banner will appear here.</p>
      </main>
      <TabBar />
    </div>
  );
};

export default Materials;
