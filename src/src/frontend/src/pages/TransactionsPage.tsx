import { useMemo } from "react";
import { useGetTransactions } from "@/hooks/useQueries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Receipt as ReceiptIcon } from "lucide-react";
import { formatINR, formatDateTime } from "@/lib/helpers";
import { DataTable } from "@/components/DataTable";
import type { Transaction } from "../backend";

export default function TransactionsPage() {
  const { data: transactions, isLoading } = useGetTransactions();

  const columns = useMemo(
    () => [
      {
        key: "id",
        label: "Transaction ID",
        sortable: true,
        render: (tx: Transaction) => (
          <span className="font-mono text-sm">{tx.id}</span>
        ),
        exportValue: (tx: Transaction) => tx.id,
      },
      {
        key: "timestamp",
        label: "Timestamp",
        sortable: true,
        render: (tx: Transaction) => (
          <span className="text-sm">{formatDateTime(tx.timestamp)}</span>
        ),
        exportValue: (tx: Transaction) => formatDateTime(tx.timestamp),
      },
      {
        key: "citizenId",
        label: "Citizen ID",
        sortable: true,
        render: (tx: Transaction) => (
          <span className="font-mono text-sm">{tx.citizenId}</span>
        ),
        exportValue: (tx: Transaction) => tx.citizenId,
      },
      {
        key: "scheme",
        label: "Scheme",
        sortable: true,
        render: (tx: Transaction) => <span>{tx.scheme}</span>,
        exportValue: (tx: Transaction) => tx.scheme,
      },
      {
        key: "amount",
        label: "Amount",
        sortable: true,
        render: (tx: Transaction) => (
          <div className="text-right font-mono font-semibold">
            {formatINR(tx.amount)}
          </div>
        ),
        exportValue: (tx: Transaction) => Number(tx.amount),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (tx: Transaction) => (
          <Badge
            variant={tx.status === "approved" ? "default" : "destructive"}
            className={
              tx.status === "approved"
                ? "bg-success text-success-foreground"
                : ""
            }
          >
            {tx.status === "approved" ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : (
              <XCircle className="h-3 w-3 mr-1" />
            )}
            {tx.status}
          </Badge>
        ),
        exportValue: (tx: Transaction) => tx.status,
      },
    ],
    []
  );

  const filters = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        options: [
          { value: "approved", label: "Approved" },
          { value: "denied", label: "Denied" },
        ],
      },
    ],
    []
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <ReceiptIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Transactions
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete transaction history and audit trail
          </p>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {transactions?.length || 0} transaction(s) recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable<Transaction>
            data={transactions || []}
            columns={columns}
            filters={filters}
            searchKeys={["id", "citizenId", "scheme"]}
            searchPlaceholder="Search by ID, Citizen ID, or Scheme..."
            isLoading={isLoading}
            emptyMessage="No transactions yet"
            exportFilename="transactions_history"
            pageSize={20}
          />
        </CardContent>
      </Card>
    </div>
  );
}
