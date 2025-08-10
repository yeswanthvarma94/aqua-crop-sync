import HeaderPickers from "@/components/HeaderPickers";
import TabBar from "@/components/TabBar";

const Expenses = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-screen-md mx-auto px-4 py-3">
          <HeaderPickers />
        </div>
      </header>
      <main className="max-w-screen-md mx-auto px-4 pb-24 pt-4 space-y-4">
        <h2 className="text-base font-semibold">Expenses</h2>
        <p className="text-sm text-muted-foreground">Record per-tank expenses and view totals.</p>
      </main>
      <TabBar />
    </div>
  );
};

export default Expenses;
