import { useGetSystemStatus } from "@/hooks/useQueries";
import { Badge } from "@/components/ui/badge";
import { getSystemStatusColor, getSystemStatusLabel } from "@/lib/helpers";
import { Loader2 } from "lucide-react";
import { SystemStatus } from "../backend";

export function SystemStatusBadge() {
  const { data: status, isLoading } = useGetSystemStatus();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  if (!status) return null;

  const colorVariant = getSystemStatusColor(status);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-foreground">System Status:</span>
      <Badge
        variant={
          colorVariant === "success"
            ? "default"
            : colorVariant === "warning"
              ? "secondary"
              : "destructive"
        }
        className={
          colorVariant === "success"
            ? "bg-success text-success-foreground hover:bg-success/90"
            : colorVariant === "warning"
              ? "bg-warning text-warning-foreground hover:bg-warning/90"
              : ""
        }
      >
        {getSystemStatusLabel(status)}
      </Badge>
    </div>
  );
}
