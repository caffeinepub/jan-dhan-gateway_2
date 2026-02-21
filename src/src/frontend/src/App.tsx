import { useState, useRef, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileCheck,
  Users,
  IndianRupee,
  Activity,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  useGetAllCitizens,
  useGetTransactions,
  useGetSystemStatus,
  useGetBudget,
  useGetTotalDisbursed,
  useClaimBenefits,
  useAddCitizens,
  useSetSystemStatus,
} from "./hooks/useQueries";
import {
  Gender,
  MaritalStatus,
  SystemStatus,
  ClaimStatus,
  AccountStatus,
  AadhaarStatus,
  type Citizen,
  type Transaction,
  type InputCitizen,
} from "./backend";
import { formatINR, formatDate } from "./lib/helpers";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 10,
      retry: 1,
    },
  },
});

// Chart Colors - matching our OKLCH design tokens
const CHART_COLORS = [
  "oklch(0.52 0.16 195)",   // chart-1 (teal)
  "oklch(0.68 0.20 25)",    // chart-2 (coral)
  "oklch(0.85 0.15 90)",    // chart-3 (yellow)
  "oklch(0.48 0.24 350)",   // chart-4 (magenta)
  "oklch(0.60 0.18 150)",   // chart-5 (green)
];

interface ExcelRow {
  Citizen_ID: string | number;
  Income_Tier: string;
  Scheme_Eligibility: string;
  Scheme_Amount: number;
  Last_Claim_Date: string;
  Region_Code: string;
  Account_Status: string;
  Aadhaar_Linked: string | boolean;
  Claim_Count: number;
}

// Parse DD-MM-YYYY date format to bigint timestamp
function parseDate(dateStr: string): bigint {
  const parts = dateStr.split(/[-/]/);
  if (parts.length !== 3) return BigInt(Date.now() * 1_000_000);
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  return BigInt(date.getTime() * 1_000_000);
}

// Map Account_Status to AccountStatus enum
function mapAccountStatus(status: string): AccountStatus {
  const normalized = status.toLowerCase().trim();
  if (normalized === "active") return AccountStatus.active;
  if (normalized === "inactive") return AccountStatus.inactive;
  return AccountStatus.active; // Default to active
}

// Map Aadhaar_Linked to AadhaarStatus enum
function mapAadhaarStatus(status: string | boolean): AadhaarStatus {
  if (typeof status === "boolean") {
    return status ? AadhaarStatus.linked : AadhaarStatus.unlinked;
  }
  const normalized = status.toLowerCase().trim();
  // Handle TRUE/true/Yes/yes/Linked/linked
  if (normalized === "true" || normalized === "yes" || normalized === "linked") {
    return AadhaarStatus.linked;
  }
  // Handle FALSE/false/No/no/Unlinked/unlinked
  return AadhaarStatus.unlinked;
}

// Metric Card Component with Animation
interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  delay?: string;
}

function MetricCard({ title, value, icon: Icon, color, delay = "0s" }: MetricCardProps) {
  return (
    <Card className="animate-stagger-in" style={{ animationDelay: delay }}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold animate-count-up">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color}/10`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Gate Validation Indicator Component
interface GateIndicatorProps {
  label: string;
  status: "idle" | "checking" | "passed" | "failed";
  reason?: string;
}

function GateIndicator({ label, status, reason }: GateIndicatorProps) {
  const getIcon = () => {
    switch (status) {
      case "checking":
        return <Loader2 className="w-5 h-5 text-accent animate-spin" />;
      case "passed":
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getBgColor = () => {
    switch (status) {
      case "checking":
        return "bg-accent/10 border-accent";
      case "passed":
        return "bg-success/10 border-success";
      case "failed":
        return "bg-destructive/10 border-destructive";
      default:
        return "bg-muted/30 border-border";
    }
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border-2 ${getBgColor()} transition-all duration-300`}>
      {getIcon()}
      <div className="flex-1">
        <p className="font-semibold text-sm">{label}</p>
        {reason && <p className="text-xs text-muted-foreground mt-1">{reason}</p>}
      </div>
    </div>
  );
}

function MainApp() {
  const [citizenId, setCitizenId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Table state
  const [searchQuery, setSearchQuery] = useState("");
  const [schemeFilter, setSchemeFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState<"id" | "scheme" | "amount" | "claims">("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Gate validation state
  type GateStatus = { status: "idle" | "checking" | "passed" | "failed"; reason: string };
  const [gateStatus, setGateStatus] = useState<{
    gate1: GateStatus;
    gate2: GateStatus;
    gate3: GateStatus;
  }>({
    gate1: { status: "idle", reason: "" },
    gate2: { status: "idle", reason: "" },
    gate3: { status: "idle", reason: "" },
  });

  // Queries
  const { data: citizens = [], isLoading: loadingCitizens } = useGetAllCitizens();
  const { data: transactions = [] } = useGetTransactions();
  const { data: systemStatus = SystemStatus.frozen } = useGetSystemStatus();
  const { data: budget = 0n } = useGetBudget();
  const { data: totalDisbursed = 0n } = useGetTotalDisbursed();

  // Mutations
  const claimBenefits = useClaimBenefits();
  const addCitizens = useAddCitizens();
  const setSystemStatusMutation = useSetSystemStatus();

  // Derived data for hero metrics
  const budgetPercentage = budget > 0n ? Number((budget * 100n) / (budget + totalDisbursed)) : 0;

  // Filter and sort citizens
  const filteredCitizens = useMemo(() => {
    let result = citizens;

    // Search filter
    if (searchQuery) {
      result = result.filter(
        (c) =>
          c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.scheme.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Scheme filter
    if (schemeFilter !== "all") {
      result = result.filter((c) => c.scheme === schemeFilter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let aVal, bVal;
      switch (sortColumn) {
        case "id":
          aVal = a.id;
          bVal = b.id;
          break;
        case "scheme":
          aVal = a.scheme;
          bVal = b.scheme;
          break;
        case "amount":
          aVal = Number(a.amount);
          bVal = Number(b.amount);
          break;
        case "claims":
          aVal = Number(a.claims);
          bVal = Number(b.claims);
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [citizens, searchQuery, schemeFilter, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredCitizens.length / itemsPerPage);
  const paginatedCitizens = filteredCitizens.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get unique schemes for filter
  const schemes = useMemo(() => {
    const uniqueSchemes = new Set(citizens.map((c) => c.scheme));
    return Array.from(uniqueSchemes).sort();
  }, [citizens]);

  // Chart data
  const schemeData = useMemo(() => {
    const schemeCounts = citizens.reduce((acc, c) => {
      acc[c.scheme] = (acc[c.scheme] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(schemeCounts).map(([name, value]) => ({ name, value }));
  }, [citizens]);

  const regionData = useMemo(() => {
    const regionCounts = citizens.reduce((acc, c) => {
      // Extract region from name field (stored as Income_Tier in our mapping)
      const parts = c.name.split('-');
      const region = parts.length > 0 ? parts[0] : 'Unknown';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(regionCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [citizens]);

  const claimTrendData = useMemo(() => {
    if (transactions.length === 0) return [];

    const dateCounts = transactions.reduce((acc, t) => {
      const date = formatDate(t.timestamp);
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(dateCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions]);

  // Handlers
  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const exportToCSV = () => {
    const headers = ["Citizen_ID", "Scheme", "Amount", "Account_Status", "Aadhaar_Status", "Claims"];
    const rows = filteredCitizens.map((c) => [
      c.id,
      c.scheme,
      Number(c.amount).toString(),
      c.accountStatus,
      c.aadhaarStatus,
      c.claims.toString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `citizens_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const handleSubmitClaim = async () => {
    if (!citizenId.trim()) {
      toast.error("Please enter a Citizen ID");
      return;
    }

    // Reset gates
    setGateStatus({
      gate1: { status: "idle", reason: "" },
      gate2: { status: "idle", reason: "" },
      gate3: { status: "idle", reason: "" },
    });

    if (systemStatus !== SystemStatus.active) {
      setGateStatus({
        gate1: { status: "failed", reason: `System is ${systemStatus}` },
        gate2: { status: "idle", reason: "" },
        gate3: { status: "idle", reason: "" },
      });
      toast.error("System not active");
      return;
    }

    const citizen = citizens.find((c) => c.id === citizenId.trim());
    if (!citizen) {
      setGateStatus({
        gate1: { status: "failed", reason: "Citizen ID not found" },
        gate2: { status: "idle", reason: "" },
        gate3: { status: "idle", reason: "" },
      });
      toast.error("Citizen not found");
      return;
    }

    // Gate 1: Eligibility
    setGateStatus((prev) => ({ ...prev, gate1: { status: "checking", reason: "" } }));
    await new Promise((r) => setTimeout(r, 500));

    if (citizen.accountStatus !== AccountStatus.active) {
      setGateStatus({
        gate1: { status: "failed", reason: "Account not active" },
        gate2: { status: "idle", reason: "" },
        gate3: { status: "idle", reason: "" },
      });
      toast.error("Account not active");
      return;
    }

    if (citizen.aadhaarStatus !== AadhaarStatus.linked) {
      setGateStatus({
        gate1: { status: "failed", reason: "Aadhaar not linked" },
        gate2: { status: "idle", reason: "" },
        gate3: { status: "idle", reason: "" },
      });
      toast.error("Aadhaar not linked");
      return;
    }

    if (citizen.claims >= 3n) {
      setGateStatus({
        gate1: { status: "failed", reason: "Maximum claims reached (3)" },
        gate2: { status: "idle", reason: "" },
        gate3: { status: "idle", reason: "" },
      });
      toast.error("Maximum claims reached");
      return;
    }

    setGateStatus((prev) => ({ ...prev, gate1: { status: "passed", reason: "Eligible" } }));

    // Gate 2: Budget
    setGateStatus((prev) => ({ ...prev, gate2: { status: "checking", reason: "" } }));
    await new Promise((r) => setTimeout(r, 500));

    if (budget < citizen.amount) {
      setGateStatus((prev) => ({
        ...prev,
        gate2: { status: "failed", reason: "Insufficient budget" },
      }));
      toast.error("Insufficient budget");
      return;
    }

    setGateStatus((prev) => ({ ...prev, gate2: { status: "passed", reason: "Budget sufficient" } }));

    // Gate 3: Frequency
    setGateStatus((prev) => ({ ...prev, gate3: { status: "checking", reason: "" } }));
    await new Promise((r) => setTimeout(r, 500));

    if (citizen.lastClaim) {
      const daysSinceLast = Math.floor(
        (Date.now() - Number(citizen.lastClaim) / 1_000_000) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLast < 30) {
        setGateStatus((prev) => ({
          ...prev,
          gate3: { status: "failed", reason: `Only ${daysSinceLast} days since last claim` },
        }));
        toast.error("30 days required between claims");
        return;
      }
    }

    setGateStatus((prev) => ({ ...prev, gate3: { status: "passed", reason: "Frequency check passed" } }));

    // Submit claim
    try {
      await claimBenefits.mutateAsync({
        id: citizen.id,
        scheme: citizen.scheme,
        amount: citizen.amount,
      });
      toast.success(`Claim approved! ${formatINR(citizen.amount)} disbursed`);
      setCitizenId("");
      setGateStatus({
        gate1: { status: "idle", reason: "" },
        gate2: { status: "idle", reason: "" },
        gate3: { status: "idle", reason: "" },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Claim failed");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".xls")) {
        toast.error("Please upload an Excel file (.xlsx or .xls)");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("No file selected");
      return;
    }

    setImporting(true);

    try {
      if (!(window as any).XLSX) {
        const script = document.createElement("script");
        script.src = "https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js";
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const XLSX = (window as any).XLSX;
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

      const citizensToAdd: InputCitizen[] = jsonData.map((row) => ({
        id: row.Citizen_ID?.toString() || "",
        name: row.Income_Tier || "Low",  // Store Income_Tier in name field temporarily
        dob: BigInt(946684800000 * 1_000_000), // Default: Jan 1, 2000
        gender: Gender.male,  // Default
        maritalStatus: MaritalStatus.single,  // Default
        accountStatus: mapAccountStatus(row.Account_Status),
        aadhaarStatus: mapAadhaarStatus(row.Aadhaar_Linked),
        scheme: row.Scheme_Eligibility || "",
        amount: BigInt(Math.round(row.Scheme_Amount || 0)),
      }));

      await addCitizens.mutateAsync(citizensToAdd);
      toast.success(`Successfully imported ${citizensToAdd.length} citizens`);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import data");
    } finally {
      setImporting(false);
    }
  };

  const handleEmergencyPause = async () => {
    try {
      if (systemStatus === SystemStatus.paused) {
        await setSystemStatusMutation.mutateAsync(SystemStatus.active);
        toast.success("System resumed");
      } else {
        await setSystemStatusMutation.mutateAsync(SystemStatus.paused);
        toast.warning("System paused");
      }
    } catch (error) {
      toast.error("Failed to update system status");
    }
  };

  const getStatusColor = (status: SystemStatus): string => {
    if (status === SystemStatus.active) return "text-success";
    if (status === SystemStatus.paused) return "text-warning";
    return "text-destructive";
  };

  const getStatusLabel = (status: SystemStatus): string => {
    return status.toString().charAt(0).toUpperCase() + status.toString().slice(1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header with Metrics */}
      <header className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border-b">
        <div className="container mx-auto px-4 py-8">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold font-display mb-2">Jan-Dhan Gateway</h1>
              <p className="text-muted-foreground">Fraud-proof benefit distribution system</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${systemStatus === SystemStatus.active ? "bg-success animate-pulse-glow" : systemStatus === SystemStatus.paused ? "bg-warning" : "bg-destructive"}`} />
                <span className={`text-sm font-semibold ${getStatusColor(systemStatus)}`}>
                  {getStatusLabel(systemStatus)}
                </span>
              </div>
              <Button
                size="lg"
                variant={systemStatus === SystemStatus.paused ? "outline" : "destructive"}
                onClick={handleEmergencyPause}
                className="min-h-[48px] px-6 font-semibold"
                disabled={setSystemStatusMutation.isPending}
              >
                {systemStatus === SystemStatus.paused ? "RESUME SYSTEM" : "EMERGENCY PAUSE"}
              </Button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Citizens"
              value={citizens.length.toLocaleString("en-IN")}
              icon={Users}
              color="bg-primary"
              delay="0s"
            />
            <MetricCard
              title="Total Disbursed"
              value={formatINR(totalDisbursed)}
              icon={Activity}
              color="bg-secondary"
              delay="0.1s"
            />
            <MetricCard
              title="Available Budget"
              value={formatINR(budget)}
              icon={IndianRupee}
              color="bg-accent"
              delay="0.2s"
            />
            <MetricCard
              title="Total Transactions"
              value={transactions.length.toLocaleString("en-IN")}
              icon={Activity}
              color="bg-chart-4"
              delay="0.3s"
            />
          </div>

          {/* Budget Progress Bar */}
          <Card className="mt-6 animate-stagger-in stagger-delay-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Budget Utilization</span>
                <span className="text-sm font-mono font-semibold">{budgetPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={budgetPercentage} className="h-3" />
            </CardContent>
          </Card>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Submit Claim Card */}
          <Card className="lg:col-span-2 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                Process Benefit Claim
              </CardTitle>
              <CardDescription>Enter Citizen ID to validate and process claim through three-gate system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Enter 12-digit Citizen ID"
                  value={citizenId}
                  onChange={(e) => setCitizenId(e.target.value)}
                  className="flex-1 h-12 text-base font-mono"
                  maxLength={12}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSubmitClaim();
                    }
                  }}
                />
                <Button
                  onClick={handleSubmitClaim}
                  size="lg"
                  className="h-12 px-8 font-semibold"
                  disabled={claimBenefits.isPending}
                >
                  {claimBenefits.isPending ? "Processing..." : "Submit Claim"}
                </Button>
              </div>

              {/* Gate Validation Flow */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Validation Gates</h4>
                <GateIndicator
                  label="Gate 1: Eligibility Check"
                  status={gateStatus.gate1.status}
                  reason={gateStatus.gate1.reason}
                />
                <GateIndicator
                  label="Gate 2: Budget Verification"
                  status={gateStatus.gate2.status}
                  reason={gateStatus.gate2.reason}
                />
                <GateIndicator
                  label="Gate 3: Frequency Control"
                  status={gateStatus.gate3.status}
                  reason={gateStatus.gate3.reason}
                />
              </div>
            </CardContent>
          </Card>

          {/* Import Data Card */}
          <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Dataset
              </CardTitle>
              <CardDescription>Upload Excel file with citizen records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  disabled={importing}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {file ? file.name : "Choose Excel file"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      .xlsx or .xls format
                    </p>
                  </div>
                </label>
              </div>

              {importing && (
                <div className="space-y-2">
                  <Progress value={50} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">Importing...</p>
                </div>
              )}

              <Button
                onClick={handleUpload}
                size="lg"
                className="w-full font-semibold"
                disabled={!file || importing}
              >
                {importing ? "Uploading..." : "Upload Dataset"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        {/* Charts Section */}
        {citizens.length > 0 && (
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-bold font-display">Analytics Dashboard</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Scheme Distribution */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg">Scheme Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={schemeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {schemeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Regional Distribution */}
              <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <CardHeader>
                  <CardTitle className="text-lg">Top 10 Regions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={regionData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "oklch(var(--card))", 
                          border: "1px solid oklch(var(--border))",
                          borderRadius: "8px"
                        }} 
                      />
                      <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Claims Timeline */}
              {claimTrendData.length > 0 && (
                <Card className="lg:col-span-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                  <CardHeader>
                    <CardTitle className="text-lg">Claims Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={claimTrendData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "oklch(var(--card))", 
                            border: "1px solid oklch(var(--border))",
                            borderRadius: "8px"
                          }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          stroke={CHART_COLORS[1]} 
                          strokeWidth={3}
                          dot={{ fill: CHART_COLORS[1], r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        <Separator className="my-8" />

        {/* Citizens Table */}
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Citizen Registry</CardTitle>
                <CardDescription>{filteredCitizens.length} citizens found</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={exportToCSV} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
            
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Citizen ID or Scheme"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select value={schemeFilter} onValueChange={(value) => {
                setSchemeFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by scheme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schemes</SelectItem>
                  {schemes.map((scheme) => (
                    <SelectItem key={scheme} value={scheme}>
                      {scheme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingCitizens ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
                <p>Loading citizens...</p>
              </div>
            ) : filteredCitizens.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No citizens found. Upload a dataset to get started.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort("id")}
                        >
                          Citizen ID {sortColumn === "id" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort("scheme")}
                        >
                          Scheme {sortColumn === "scheme" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort("amount")}
                        >
                          Amount {sortColumn === "amount" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead>Account Status</TableHead>
                        <TableHead>Aadhaar</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort("claims")}
                        >
                          Claims {sortColumn === "claims" && (sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCitizens.map((citizen) => (
                        <TableRow key={citizen.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-mono text-sm">{citizen.id}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{citizen.scheme}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold">{formatINR(citizen.amount)}</TableCell>
                          <TableCell>
                            <Badge variant={citizen.accountStatus === AccountStatus.active ? "default" : "secondary"}>
                              {citizen.accountStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={citizen.aadhaarStatus === AadhaarStatus.linked ? "default" : "secondary"}>
                              {citizen.aadhaarStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{citizen.claims.toString()}/3</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                      {Math.min(currentPage * itemsPerPage, filteredCitizens.length)} of{" "}
                      {filteredCitizens.length} citizens
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-9 h-9 p-0"
                            >
                              {page}
                            </Button>
                          );
                        })}
                        {totalPages > 5 && <span className="text-muted-foreground px-2">...</span>}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <Card className="mt-6 animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl">Recent Transactions</CardTitle>
              <CardDescription>Last 10 benefit claims processed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Citizen ID</TableHead>
                      <TableHead>Scheme</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...transactions].reverse().slice(0, 10).map((txn) => (
                      <TableRow key={txn.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-xs">{txn.id.substring(0, 8)}...</TableCell>
                        <TableCell className="font-mono text-sm">{txn.citizenId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{txn.scheme}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{formatINR(txn.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={txn.status === ClaimStatus.approved ? "default" : "destructive"}>
                            {txn.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(txn.timestamp)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground py-12 mt-12 border-t">
          © 2026. Built with love using{" "}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            caffeine.ai
          </a>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
