import { CheckCircle2, XCircle, Clock, Shield, Wallet, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Citizen } from "../backend";
import { formatINR, daysSinceLastClaim } from "@/lib/helpers";

interface Gate {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: "pending" | "pass" | "fail";
  details: string;
  reason?: string;
}

interface GateValidationFlowProps {
  citizen: Citizen;
  budget?: bigint;
}

export function GateValidationFlow({ citizen, budget }: GateValidationFlowProps) {
  const daysSince = citizen.lastClaim ? daysSinceLastClaim(citizen.lastClaim) : Infinity;

  const gates: Gate[] = [
    {
      id: "gate1",
      name: "Gate 1: Eligibility",
      icon: <Shield className="h-5 w-5" />,
      status:
        citizen.accountStatus === "active" &&
        citizen.aadhaarStatus === "linked" &&
        citizen.claims < 3n
          ? "pass"
          : "fail",
      details: "Account Status, Aadhaar Link, Claim Limit",
      reason:
        citizen.accountStatus !== "active"
          ? "Account is not Active"
          : citizen.aadhaarStatus !== "linked"
            ? "Aadhaar not linked"
            : citizen.claims >= 3n
              ? `Maximum claims reached (${citizen.claims}/3)`
              : undefined,
    },
    {
      id: "gate2",
      name: "Gate 2: Budget",
      icon: <Wallet className="h-5 w-5" />,
      status: budget !== undefined && budget >= citizen.amount ? "pass" : "fail",
      details: `Required: ${formatINR(citizen.amount)}`,
      reason:
        budget !== undefined && budget < citizen.amount
          ? `Insufficient budget: ${formatINR(budget)} available`
          : undefined,
    },
    {
      id: "gate3",
      name: "Gate 3: Frequency",
      icon: <Calendar className="h-5 w-5" />,
      status: daysSince >= 30 ? "pass" : "fail",
      details: "Minimum 30 days between claims",
      reason: daysSince < 30 ? `Only ${daysSince} days since last claim` : undefined,
    },
  ];

  const allPassed = gates.every((gate) => gate.status === "pass");

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Three-Gate Validation Protocol
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gates Flow */}
        <div className="space-y-3">
          {gates.map((gate, index) => (
            <div
              key={gate.id}
              className={`p-4 rounded-lg border-2 transition-all duration-500 ${
                gate.status === "pass"
                  ? "border-success bg-success/5"
                  : gate.status === "fail"
                    ? "border-destructive bg-destructive/5"
                    : "border-muted bg-muted/20"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-500 ${
                    gate.status === "pass"
                      ? "bg-success text-success-foreground"
                      : gate.status === "fail"
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {gate.status === "pass" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : gate.status === "fail" ? (
                    <XCircle className="h-5 w-5" />
                  ) : (
                    <Clock className="h-5 w-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{gate.name}</h4>
                    <Badge
                      variant={
                        gate.status === "pass"
                          ? "default"
                          : gate.status === "fail"
                            ? "destructive"
                            : "secondary"
                      }
                      className={
                        gate.status === "pass"
                          ? "bg-success text-success-foreground"
                          : ""
                      }
                    >
                      {gate.status === "pass"
                        ? "PASS"
                        : gate.status === "fail"
                          ? "FAIL"
                          : "PENDING"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{gate.details}</p>
                  {gate.reason && (
                    <p className="text-xs font-medium text-destructive mt-2">
                      ⚠ {gate.reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < gates.length - 1 && (
                <div className="ml-5 mt-2 mb-1">
                  <div className="h-6 w-0.5 bg-border" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Final Status */}
        <div
          className={`p-4 rounded-lg border-2 text-center font-semibold ${
            allPassed
              ? "border-success bg-success/10 text-success"
              : "border-destructive bg-destructive/10 text-destructive"
          }`}
        >
          {allPassed ? "✓ All gates passed - Ready to process" : "✗ Validation failed"}
        </div>
      </CardContent>
    </Card>
  );
}
