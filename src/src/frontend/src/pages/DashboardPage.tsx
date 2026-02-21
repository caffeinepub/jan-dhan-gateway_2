import { useMemo } from "react";
import {
  useGetSystemStatus,
  useGetBudget,
  useCountTransactions,
  useCountCitizens,
  useGetTotalDisbursed,
  useSetSystemStatus,
  useGetTransactions,
  useGetAllCitizens,
} from "@/hooks/useQueries";
import { SystemStatus } from "../backend";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, PauseCircle, PlayCircle, Users, Receipt, TrendingUp, Wallet, CheckCircle2, XCircle, Clock, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { formatINR, DEFAULT_BUDGET, calculateBudgetPercentage, formatDateTime } from "@/lib/helpers";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MetricCard } from "@/components/MetricCard";
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";

export default function DashboardPage() {
  const { data: status } = useGetSystemStatus();
  const { data: budget } = useGetBudget();
  const { data: citizenCount, isLoading: loadingCitizens } = useCountCitizens();
  const { data: transactionCount, isLoading: loadingTransactions } = useCountTransactions();
  const { data: totalDisbursed, isLoading: loadingDisbursed } = useGetTotalDisbursed();
  const { data: transactions, isLoading: loadingTransactionList } = useGetTransactions();
  const { data: citizens } = useGetAllCitizens();

  const setSystemStatus = useSetSystemStatus();

  const handleEmergencyPause = () => {
    setSystemStatus.mutate(SystemStatus.paused, {
      onSuccess: () => {
        toast.error("System Paused", {
          description: "All transactions are now blocked.",
        });
      },
      onError: () => {
        toast.error("Failed to pause system");
      },
    });
  };

  const handleResume = () => {
    setSystemStatus.mutate(SystemStatus.active, {
      onSuccess: () => {
        toast.success("System Resumed", {
          description: "Transactions are now enabled.",
        });
      },
      onError: () => {
        toast.error("Failed to resume system");
      },
    });
  };

  const budgetPercentage = budget ? calculateBudgetPercentage(budget, DEFAULT_BUDGET) : 0;
  const approvedTransactions =
    transactions?.filter((t) => t.status === "approved").length || 0;
  const deniedTransactions =
    transactions?.filter((t) => t.status === "denied").length || 0;
  
  const averageClaim =
    totalDisbursed && transactionCount && transactionCount > 0n
      ? totalDisbursed / transactionCount
      : 0n;

  // Claim trends data (last 30 days)
  const claimTrendsData = useMemo(() => {
    if (!transactions) return [];

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    const last30Days = transactions.filter(t => {
      const txTime = Number(t.timestamp) / 1_000_000;
      return txTime >= thirtyDaysAgo;
    });

    // Group by day
    const dailyData: Record<string, { approved: number; denied: number }> = {};
    
    last30Days.forEach(tx => {
      const date = new Date(Number(tx.timestamp) / 1_000_000);
      const dateKey = date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { approved: 0, denied: 0 };
      }
      
      if (tx.status === "approved") {
        dailyData[dateKey].approved++;
      } else {
        dailyData[dateKey].denied++;
      }
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        approved: data.approved,
        denied: data.denied,
      }))
      .slice(-14); // Last 14 days for readability
  }, [transactions]);

  // Scheme distribution data
  const schemeDistributionData = useMemo(() => {
    if (!citizens) return [];

    const schemeCounts: Record<string, number> = {};
    
    citizens.forEach(citizen => {
      schemeCounts[citizen.scheme] = (schemeCounts[citizen.scheme] || 0) + 1;
    });

    return Object.entries(schemeCounts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [citizens]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  // Recent transactions (last 10)
  const recentTransactions = useMemo(() => {
    if (!transactions) return [];
    return [...transactions]
      .sort((a, b) => Number(b.timestamp - a.timestamp))
      .slice(0, 10);
  }, [transactions]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor system health and key metrics
          </p>
        </div>
        <div className="flex gap-3">
          {status === SystemStatus.active && (
            <Button
              variant="destructive"
              size="lg"
              onClick={handleEmergencyPause}
              disabled={setSystemStatus.isPending}
              className="shadow-lg"
            >
              <PauseCircle className="mr-2 h-5 w-5" />
              EMERGENCY PAUSE
            </Button>
          )}
          {status === SystemStatus.paused && (
            <Button
              size="lg"
              onClick={handleResume}
              disabled={setSystemStatus.isPending}
              className="bg-success text-success-foreground hover:bg-success/90 shadow-lg"
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Resume System
            </Button>
          )}
        </div>
      </div>

      {/* Status Alerts */}
      {status === SystemStatus.paused && (
        <Alert variant="default" className="bg-warning/10 border-warning">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-foreground">
            System is paused. All transactions are blocked.
          </AlertDescription>
        </Alert>
      )}

      {status === SystemStatus.frozen && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            System is frozen due to budget exhaustion or integrity issue. Reset budget to resume.
          </AlertDescription>
        </Alert>
      )}

      {/* Budget Card */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-display">Budget Status</CardTitle>
              <CardDescription>Remaining allocation for benefit distribution</CardDescription>
            </div>
            <Wallet className="h-8 w-8 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-4xl font-bold text-foreground font-mono">
                {budget !== undefined ? formatINR(budget) : "—"}
              </span>
              <span className="text-sm text-muted-foreground">
                of {formatINR(DEFAULT_BUDGET)}
              </span>
            </div>
            <Progress
              value={budgetPercentage}
              className="h-3"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Budget utilization</span>
            <span className="font-semibold font-mono">
              {(100 - budgetPercentage).toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Citizens"
          value={citizenCount !== undefined ? citizenCount.toString() : "—"}
          description="Registered beneficiaries"
          icon={<Users className="h-4 w-4" />}
          isLoading={loadingCitizens}
        />

        <MetricCard
          title="Approved Transactions"
          value={approvedTransactions}
          description={`of ${transactionCount?.toString() || 0} total`}
          icon={<Receipt className="h-4 w-4" />}
          isLoading={loadingTransactions}
        />

        <MetricCard
          title="Total Disbursed"
          value={totalDisbursed !== undefined ? formatINR(totalDisbursed) : "—"}
          description="Cumulative payments"
          icon={<TrendingUp className="h-4 w-4" />}
          isLoading={loadingDisbursed}
        />

        <MetricCard
          title="Average Claim"
          value={formatINR(averageClaim)}
          description="Per approved transaction"
          icon={<Receipt className="h-4 w-4" />}
          isLoading={loadingDisbursed}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Claim Trends Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Claim Trends
                </CardTitle>
                <CardDescription>Last 14 days claim activity</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTransactionList ? (
              <Skeleton className="h-64 w-full" />
            ) : claimTrendsData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No claim data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={claimTrendsData}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    stroke="oklch(var(--muted-foreground))"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="oklch(var(--muted-foreground))"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(var(--popover))",
                      border: "1px solid oklch(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="approved"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Approved"
                  />
                  <Line
                    type="monotone"
                    dataKey="denied"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Denied"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Scheme Distribution Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Scheme Distribution
                </CardTitle>
                <CardDescription>Citizens by benefit scheme</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!citizens ? (
              <Skeleton className="h-64 w-full" />
            ) : schemeDistributionData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No scheme data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={schemeDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {schemeDistributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(var(--popover))",
                      border: "1px solid oklch(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions Timeline */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
          <CardDescription>Last 10 benefit claims processed</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTransactionList ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No transactions yet
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.status === "approved"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {tx.status === "approved" ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium font-mono text-sm">{tx.citizenId}</p>
                      <p className="text-xs text-muted-foreground">{tx.scheme}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold font-mono">{formatINR(tx.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(tx.timestamp)}
                    </p>
                  </div>
                  <Badge
                    variant={tx.status === "approved" ? "default" : "destructive"}
                    className={
                      tx.status === "approved"
                        ? "bg-success text-success-foreground"
                        : ""
                    }
                  >
                    {tx.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
