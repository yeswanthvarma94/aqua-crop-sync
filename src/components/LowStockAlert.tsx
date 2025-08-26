import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/AuthContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  minStock: number;
  locationName: string;
  locationId: string;
}

const LowStockAlert = () => {
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { accountId } = useAuth();

  useEffect(() => {
    const fetchLowStockItems = async () => {
      if (!accountId) return;

      try {
        // Fetch all locations for the account
        const { data: locations, error: locationsError } = await supabase
          .from('locations')
          .select('id, name')
          .eq('account_id', accountId);

        if (locationsError) throw locationsError;

        if (!locations?.length) {
          setLoading(false);
          return;
        }

        // Fetch stock data for all locations
        const stockPromises = locations.map(async (location) => {
          const { data: stocks, error: stocksError } = await supabase
            .from('stocks')
            .select('id, name, quantity, min_stock')
            .eq('location_id', location.id);

          if (stocksError) throw stocksError;

          // Filter items where stock is at or below 120% of minimum stock
          const lowStockItems = stocks?.filter(stock => 
            stock.quantity <= (stock.min_stock * 1.2)
          ) || [];

          return lowStockItems.map(stock => ({
            id: stock.id,
            name: stock.name,
            quantity: stock.quantity,
            minStock: stock.min_stock,
            locationName: location.name,
            locationId: location.id
          }));
        });

        const allLowStockItems = await Promise.all(stockPromises);
        const flattenedItems = allLowStockItems.flat();
        
        setLowStockItems(flattenedItems);
      } catch (error) {
        console.error('Error fetching low stock items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLowStockItems();
  }, [accountId]);

  if (loading || lowStockItems.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="animate-slide-up">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Low Stock Alert</AlertTitle>
      <AlertDescription>
        <div className="space-y-2 mt-2">
          {lowStockItems.map((item) => (
            <div key={item.id} className="text-sm">
              <span className="font-medium">{item.name}</span> at{" "}
              <span className="font-medium">{item.locationName}</span>
              <span className="text-muted-foreground ml-2">
                ({item.quantity} remaining, min: {item.minStock})
              </span>
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default LowStockAlert;