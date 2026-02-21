import { useMemo } from "react";
import { useGetAllCitizens } from "@/hooks/useQueries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Users as UsersIcon } from "lucide-react";
import {
  formatINR,
  formatDate,
  canClaim,
  getAccountStatusColor,
  getAadhaarStatusColor,
} from "@/lib/helpers";
import { DataTable } from "@/components/DataTable";
import type { Citizen } from "../backend";

export default function CitizensPage() {
  const { data: citizens, isLoading } = useGetAllCitizens();

  const schemes = useMemo(() => {
    if (!citizens) return [];
    return Array.from(new Set(citizens.map((c) => c.scheme))).sort();
  }, [citizens]);

  const columns = useMemo(
    () => [
      {
        key: "id",
        label: "Citizen ID",
        sortable: true,
        render: (citizen: Citizen) => (
          <span className="font-mono text-sm">{citizen.id}</span>
        ),
        exportValue: (citizen: Citizen) => citizen.id,
      },
      {
        key: "name",
        label: "Name",
        sortable: true,
        render: (citizen: Citizen) => (
          <span className="font-medium">{citizen.name}</span>
        ),
        exportValue: (citizen: Citizen) => citizen.name,
      },
      {
        key: "accountStatus",
        label: "Account",
        sortable: true,
        render: (citizen: Citizen) => (
          <Badge
            variant={
              getAccountStatusColor(citizen.accountStatus) === "success"
                ? "default"
                : "secondary"
            }
            className={
              getAccountStatusColor(citizen.accountStatus) === "success"
                ? "bg-success text-success-foreground"
                : ""
            }
          >
            {citizen.accountStatus}
          </Badge>
        ),
        exportValue: (citizen: Citizen) => citizen.accountStatus,
      },
      {
        key: "aadhaarStatus",
        label: "Aadhaar",
        sortable: true,
        render: (citizen: Citizen) => (
          <Badge
            variant={
              getAadhaarStatusColor(citizen.aadhaarStatus) === "success"
                ? "default"
                : "secondary"
            }
            className={
              getAadhaarStatusColor(citizen.aadhaarStatus) === "success"
                ? "bg-success text-success-foreground"
                : "bg-warning text-warning-foreground"
            }
          >
            {citizen.aadhaarStatus}
          </Badge>
        ),
        exportValue: (citizen: Citizen) => citizen.aadhaarStatus,
      },
      {
        key: "scheme",
        label: "Scheme",
        sortable: true,
        render: (citizen: Citizen) => (
          <span className="text-sm">{citizen.scheme}</span>
        ),
        exportValue: (citizen: Citizen) => citizen.scheme,
      },
      {
        key: "amount",
        label: "Amount",
        sortable: true,
        render: (citizen: Citizen) => (
          <div className="text-right font-mono font-semibold">
            {formatINR(citizen.amount)}
          </div>
        ),
        exportValue: (citizen: Citizen) => Number(citizen.amount),
      },
      {
        key: "claims",
        label: "Claims",
        sortable: true,
        render: (citizen: Citizen) => (
          <div className="text-center font-mono">
            {citizen.claims.toString()} / 3
          </div>
        ),
        exportValue: (citizen: Citizen) => Number(citizen.claims),
      },
      {
        key: "lastClaim",
        label: "Last Claim",
        sortable: true,
        render: (citizen: Citizen) => (
          <span className="text-sm">
            {citizen.lastClaim ? formatDate(citizen.lastClaim) : "Never"}
          </span>
        ),
        exportValue: (citizen: Citizen) =>
          citizen.lastClaim ? formatDate(citizen.lastClaim) : "Never",
      },
      {
        key: "eligible",
        label: "Eligible",
        sortable: false,
        render: (citizen: Citizen) => {
          const eligibility = canClaim(citizen);
          return (
            <div className="text-center">
              {eligibility.eligible ? (
                <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </div>
          );
        },
        exportValue: (citizen: Citizen) => (canClaim(citizen).eligible ? "Yes" : "No"),
      },
    ],
    []
  );

  const filters = useMemo(
    () => [
      {
        key: "accountStatus",
        label: "Account Status",
        options: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
      },
      {
        key: "aadhaarStatus",
        label: "Aadhaar Status",
        options: [
          { value: "linked", label: "Linked" },
          { value: "unlinked", label: "Unlinked" },
        ],
      },
      {
        key: "scheme",
        label: "Scheme",
        options: schemes.map((s) => ({ value: s, label: s })),
      },
    ],
    [schemes]
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <UsersIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Citizens Registry
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage registered beneficiaries
          </p>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>All Citizens</CardTitle>
          <CardDescription>
            {citizens?.length || 0} citizen(s) registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable<Citizen>
            data={citizens || []}
            columns={columns}
            filters={filters}
            searchKeys={["id", "name"]}
            searchPlaceholder="Search by ID or Name..."
            isLoading={isLoading}
            emptyMessage="No citizens registered yet"
            exportFilename="citizens_registry"
            pageSize={20}
          />
        </CardContent>
      </Card>
    </div>
  );
}
