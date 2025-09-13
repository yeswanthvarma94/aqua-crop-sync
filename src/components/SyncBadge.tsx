import { Badge } from "@/components/ui/badge";

type SyncState = "synced" | "error";

const labelMap: Record<SyncState, string> = {
  synced: "Synced",
  error: "Error",
};

const colorMap: Record<SyncState, string> = {
  synced: "bg-secondary text-secondary-foreground",
  error: "bg-destructive text-destructive-foreground",
};

const SyncBadge = ({ state = "synced" as SyncState }) => {
  return <Badge className={`${colorMap[state]} border-0`}>{labelMap[state]}</Badge>;
};

export default SyncBadge;
