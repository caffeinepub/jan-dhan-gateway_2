import { useState } from "react";
import {
  useGetSystemStatus,
  useGetCitizen,
  useClaimBenefits,
  useGetBudget,
  useGetTransactions,
} from "@/hooks/useQueries";
import { SystemStatus } from "../backend";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileCheck,
  User,
  Calendar,
  CreditCard,
  Shield,
  Clock,
} from "lucide-react";
import {
  formatINR,
  formatDate,
  formatDateTime,
  daysSinceLastClaim,
  isValidCitizenId,
  canClaim,
  getAccountStatusColor,
  getAadhaarStatusColor,
} from "@/lib/helpers";
import { toast } from "sonner";
import { GateValidationFlow } from "@/components/GateValidationFlow";

export default function ProcessClaimPage() {
  const [citizenId, setCitizenId] = useState("");
  const [searchId, setSearchId] = useState<string | null>(null);

  const { data: status } = useGetSystemStatus();
  const { data: citizen, isLoading: loadingCitizen } = useGetCitizen(searchId);
  const { data: budget } = useGetBudget();
  const { data: allTransactions } = useGetTransactions();
  const claimBenefits = useClaimBenefits();

  const handleSearch = () => {
    if (!isValidCitizenId(citizenId)) {
      toast.error("Invalid Citizen ID", {
        description: "Please enter a valid 12-digit Citizen ID",
      });
      return;
    }
    setSearchId(citizenId);
  };

  const handleClaim = () => {
    if (!citizen) return;

    const eligibility = canClaim(citizen);
    if (!eligibility.eligible) {
      toast.error("Claim Denied", {
        description: eligibility.reason,
      });
      return;
    }

    claimBenefits.mutate(
      {
        id: citizen.id,
        scheme: citizen.scheme,
        amount: citizen.amount,
      },
      {
        onSuccess: (message) => {
          if (message.toLowerCase().includes("denied") || message.toLowerCase().includes("error")) {
            toast.error("Claim Denied", {
              description: message,
            });
          } else {
            toast.success("Claim Approved", {
              description: `${formatINR(citizen.amount)} disbursed successfully`,
            });
            setSearchId(null);
            setCitizenId("");
          }
        },
        onError: (error) => {
          toast.error("Claim Failed", {
            description: error.message,
          });
        },
      }
    );
  };

  const isSystemActive = status === SystemStatus.active;
  const eligibility = citizen ? canClaim(citizen) : null;
  const daysSince = citizen?.lastClaim ? daysSinceLastClaim(citizen.lastClaim) : null;

  // Citizen's claim history
  const citizenClaimHistory = citizen
    ? allTransactions
        ?.filter((tx) => tx.citizenId === citizen.id)
        .sort((a, b) => Number(b.timestamp - a.timestamp))
        .slice(0, 5) || []
    : [];

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Process Claim</h1>
        <p className="text-muted-foreground mt-1">
          Verify eligibility and process benefit claims
        </p>
      </div>

      {/* System Status Alert */}
      {!isSystemActive && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            System is currently{" "}
            <span className="font-semibold">{status ? status.toString() : "unknown"}</span>. All transactions are blocked.
          </AlertDescription>
        </Alert>
      )}

      {/* Search Form */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Citizen Lookup
          </CardTitle>
          <CardDescription>Enter 12-digit Citizen ID to verify eligibility</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="citizenId">Citizen ID</Label>
              <Input
                id="citizenId"
                placeholder="Enter 12-digit ID"
                value={citizenId}
                onChange={(e) => setCitizenId(e.target.value)}
                maxLength={12}
                className="font-mono"
                disabled={!isSystemActive}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={!isSystemActive || !citizenId}
                className="px-8"
              >
                Search
              </Button>
            </div>
          </div>

          {loadingCitizen && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Loading citizen details...</AlertDescription>
            </Alert>
          )}

          {searchId && !loadingCitizen && !citizen && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                No citizen found with ID <span className="font-mono font-semibold">{searchId}</span>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Citizen Details & Validation */}
      {citizen && (
        <div className="space-y-6">
          {/* Gate Validation Flow */}
          <GateValidationFlow citizen={citizen} budget={budget} />

          {/* Citizen Details */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Citizen Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="text-lg font-semibold">{citizen.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Citizen ID</Label>
                  <p className="text-lg font-mono font-semibold">{citizen.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date of Birth</Label>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {formatDate(citizen.dob)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Gender</Label>
                  <p className="capitalize">{citizen.gender}</p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex gap-4 pt-4 border-t">
                <div>
                  <Label className="text-muted-foreground text-xs">Account Status</Label>
                  <Badge
                    variant={getAccountStatusColor(citizen.accountStatus) === "success" ? "default" : "secondary"}
                    className={
                      getAccountStatusColor(citizen.accountStatus) === "success"
                        ? "bg-success text-success-foreground"
                        : ""
                    }
                  >
                    {citizen.accountStatus}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Aadhaar Status</Label>
                  <Badge
                    variant={getAadhaarStatusColor(citizen.aadhaarStatus) === "success" ? "default" : "secondary"}
                    className={
                      getAadhaarStatusColor(citizen.aadhaarStatus) === "success"
                        ? "bg-success text-success-foreground"
                        : "bg-warning text-warning-foreground"
                    }
                  >
                    {citizen.aadhaarStatus}
                  </Badge>
                </div>
              </div>

              {/* Scheme Info */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Scheme
                    </Label>
                    <p className="font-semibold mt-1">{citizen.scheme}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      Amount
                    </Label>
                    <p className="font-semibold font-mono mt-1">{formatINR(citizen.amount)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Claims Made</Label>
                    <p className="font-semibold mt-1">
                      {citizen.claims.toString()} / 3
                    </p>
                  </div>
                </div>
              </div>

              {/* Last Claim Info */}
              {citizen.lastClaim && (
                <div>
                  <Label className="text-muted-foreground">Last Claim</Label>
                  <p className="text-sm">
                    {formatDate(citizen.lastClaim)} ({daysSince !== null ? daysSince : 0} days ago)
                  </p>
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end pt-4">
                <Button
                  size="lg"
                  onClick={handleClaim}
                  disabled={
                    !isSystemActive ||
                    !eligibility?.eligible ||
                    claimBenefits.isPending
                  }
                  className="bg-success text-success-foreground hover:bg-success/90 px-8"
                >
                  {claimBenefits.isPending ? "Processing..." : "Process Claim"}
                </Button>
              </div>

              {/* Budget Warning */}
              {budget !== undefined && budget < citizen.amount && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Insufficient budget. Required: {formatINR(citizen.amount)}, Available:{" "}
                    {formatINR(budget)}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Claim History */}
          {citizenClaimHistory.length > 0 && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Claim History
                </CardTitle>
                <CardDescription>
                  Recent claims for this citizen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {citizenClaimHistory.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            tx.status === "approved"
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {tx.status === "approved" ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{tx.scheme}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(tx.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold font-mono text-sm">
                          {formatINR(tx.amount)}
                        </p>
                        <Badge
                          variant={tx.status === "approved" ? "default" : "destructive"}
                          className={
                            tx.status === "approved"
                              ? "bg-success text-success-foreground text-xs"
                              : "text-xs"
                          }
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
