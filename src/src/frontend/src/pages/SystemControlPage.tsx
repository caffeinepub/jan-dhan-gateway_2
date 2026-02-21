import { useState } from "react";
import {
  useGetSystemStatus,
  useSetSystemStatus,
  useGetBudget,
  useResetBudget,
} from "@/hooks/useQueries";
import { SystemStatus } from "../backend";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  PlayCircle,
  PauseCircle,
  Snowflake,
  Wallet,
  Shield,
} from "lucide-react";
import { formatINR, getSystemStatusColor, getSystemStatusLabel, DEFAULT_BUDGET } from "@/lib/helpers";
import { toast } from "sonner";

export default function SystemControlPage() {
  const [customBudget, setCustomBudget] = useState("");
  const [showFreezeDialog, setShowFreezeDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const { data: status } = useGetSystemStatus();
  const { data: budget } = useGetBudget();
  const setSystemStatus = useSetSystemStatus();
  const resetBudget = useResetBudget();

  const handleSetStatus = (newStatus: SystemStatus) => {
    if (newStatus === SystemStatus.frozen && !showFreezeDialog) {
      setShowFreezeDialog(true);
      return;
    }

    setSystemStatus.mutate(newStatus, {
      onSuccess: () => {
        toast.success(`System ${newStatus}`, {
          description: `System status changed to ${newStatus}`,
        });
        setShowFreezeDialog(false);
      },
      onError: () => {
        toast.error("Failed to change status");
      },
    });
  };

  const handleResetBudget = (amount?: bigint) => {
    const amountToReset = amount || DEFAULT_BUDGET;

    resetBudget.mutate(amountToReset, {
      onSuccess: () => {
        toast.success("Budget Reset", {
          description: `Budget reset to ${formatINR(amountToReset)}`,
        });
        setShowResetDialog(false);
        setCustomBudget("");
      },
      onError: () => {
        toast.error("Failed to reset budget");
      },
    });
  };

  const handleCustomBudget = () => {
    const amount = parseFloat(customBudget.replace(/,/g, ""));
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount", {
        description: "Please enter a valid positive number",
      });
      return;
    }

    if (!showResetDialog) {
      setShowResetDialog(true);
      return;
    }

    handleResetBudget(BigInt(Math.round(amount)));
  };

  const statusColor = status ? getSystemStatusColor(status) : "muted";

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">System Control</h1>
        <p className="text-muted-foreground mt-1">
          Manage system status and budget allocation
        </p>
      </div>

      {/* Current Status */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Status
          </CardTitle>
          <CardDescription>Current operational status of the system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-6 bg-muted/30 rounded-lg">
            <div>
              <Label className="text-muted-foreground">Current Status</Label>
              <div className="mt-2">
                <Badge
                  className="text-lg px-4 py-2"
                  variant={
                    statusColor === "success"
                      ? "default"
                      : statusColor === "warning"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {status ? getSystemStatusLabel(status) : "Unknown"}
                </Badge>
              </div>
            </div>
            <div className="flex gap-3">
              {status !== SystemStatus.active && (
                <Button
                  size="lg"
                  onClick={() => handleSetStatus(SystemStatus.active)}
                  disabled={setSystemStatus.isPending}
                  className="bg-success text-success-foreground hover:bg-success/90"
                >
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Resume
                </Button>
              )}
              {status === SystemStatus.active && (
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => handleSetStatus(SystemStatus.paused)}
                  disabled={setSystemStatus.isPending}
                  className="bg-warning text-warning-foreground hover:bg-warning/90"
                >
                  <PauseCircle className="mr-2 h-5 w-5" />
                  Pause
                </Button>
              )}
              <Button
                size="lg"
                variant="destructive"
                onClick={() => handleSetStatus(SystemStatus.frozen)}
                disabled={setSystemStatus.isPending}
              >
                <Snowflake className="mr-2 h-5 w-5" />
                Freeze
              </Button>
            </div>
          </div>

          {/* Status Descriptions */}
          {status === SystemStatus.paused && (
            <Alert variant="default" className="bg-warning/10 border-warning">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning-foreground">
                System is paused. All transactions are blocked. Resume to allow transactions.
              </AlertDescription>
            </Alert>
          )}

          {status === SystemStatus.frozen && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                System is frozen due to budget exhaustion or integrity issue. Reset budget to
                resume operations.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Budget Management */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Budget Management
          </CardTitle>
          <CardDescription>Control system budget allocation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-6 bg-muted/30 rounded-lg">
            <Label className="text-muted-foreground">Current Budget</Label>
            <p className="text-4xl font-bold font-mono mt-2">
              {budget !== undefined ? formatINR(budget) : "—"}
            </p>
          </div>

          {/* Quick Reset */}
          <div>
            <Label className="text-sm font-semibold">Quick Reset</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Reset budget to default amount
            </p>
            <Button
              onClick={() => {
                setShowResetDialog(true);
              }}
              variant="outline"
              className="w-full"
            >
              Reset to {formatINR(DEFAULT_BUDGET)}
            </Button>
          </div>

          {/* Custom Budget */}
          <div>
            <Label className="text-sm font-semibold">Custom Budget</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Set a custom budget amount
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Enter amount (e.g., 1000000)"
                  value={customBudget}
                  onChange={(e) => setCustomBudget(e.target.value)}
                  type="number"
                  min="0"
                  className="font-mono"
                />
              </div>
              <Button
                onClick={handleCustomBudget}
                disabled={!customBudget || resetBudget.isPending}
              >
                Set Budget
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Freeze Confirmation Dialog */}
      <Dialog open={showFreezeDialog} onOpenChange={setShowFreezeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Freeze System?</DialogTitle>
            <DialogDescription>
              This will immediately halt all transactions. The system can only be resumed by
              resetting the budget. This action should only be taken in emergency situations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFreezeDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleSetStatus(SystemStatus.frozen)}
              disabled={setSystemStatus.isPending}
            >
              Confirm Freeze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Budget Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Budget?</DialogTitle>
            <DialogDescription>
              {customBudget
                ? `This will reset the budget to ₹${parseFloat(customBudget.replace(/,/g, "")).toLocaleString("en-IN")}.`
                : `This will reset the budget to ${formatINR(DEFAULT_BUDGET)}.`}{" "}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowResetDialog(false);
                setCustomBudget("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                customBudget
                  ? handleCustomBudget()
                  : handleResetBudget()
              }
              disabled={resetBudget.isPending}
            >
              Confirm Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
