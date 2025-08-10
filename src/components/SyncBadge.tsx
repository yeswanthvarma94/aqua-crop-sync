import { Badge } from "@/components/ui/badge";

type SyncState = "synced" | "queued" | "error";

const labelMap: Record<SyncState, string> = {
  synced: "Synced",
  queued: "Queued",
  error: "Error",
};

const colorMap: Record<SyncState, string> = {
  synced: "bg-secondary text-secondary-foreground",
  queued: "bg-muted text-muted-foreground",
  error: "bg-destructive text-destructive-foreground",
};

const SyncBadge = ({ state = "queued" as SyncState }) => {
  return <Badge className={`${colorMap[state]} border-0`}>{labelMap[state]}</Badge>;
};

export default SyncBadge;
