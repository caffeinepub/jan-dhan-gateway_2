import { useState, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, CheckCircle2, XCircle, AlertTriangle, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import {
  useGetAllCitizens,
  useGetTransactions,
  useGetSystemStatus,
  useGetBudget,
  useGetTotalDisbursed,
  useCountCitizens,
  useClaimBenefits,
  useAddCitizens,
  useSetSystemStatus,
} from "./hooks/useQueries";
import {
  Gender,
  MaritalStatus,
  SystemStatus,
  ClaimStatus,
  type Citizen,
  type Transaction,
  type InputCitizen,
} from "./backend";
import { parseDOB, formatDate } from "./lib/helpers";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 10,
      retry: 1,
    },
  },
});

interface ExcelRow {
  Citizen_ID: string | number;
  Name: string;
  DOB: string;
  Gender: string;
  Marital_Status: string;
  Scheme_Eligibility: string;
  Scheme_Amount: number;
}

function MainApp() {
  const [citizenId, setCitizenId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [claimResult, setClaimResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: citizens = [] } = useGetAllCitizens();
  const { data: transactions = [] } = useGetTransactions();
  const { data: systemStatus = SystemStatus.frozen } = useGetSystemStatus();
  const { data: budget = 0n } = useGetBudget();
  const { data: totalDisbursed = 0n } = useGetTotalDisbursed();
  const { data: citizenCount = 0n } = useCountCitizens();

  // Mutations
  const claimBenefits = useClaimBenefits();
  const addCitizens = useAddCitizens();
  const setSystemStatus = useSetSystemStatus();

  // Derived data
  const displayedCitizens = citizens.slice(0, 20);
  const recentTransactions = [...transactions].reverse().slice(0, 10);

  const formatAmount = (amount: bigint): string => {
    return amount.toLocaleString("en-IN");
  };

  const getStatusColor = (status: SystemStatus): string => {
    if (status === SystemStatus.active) return "bg-green-500";
    if (status === SystemStatus.paused) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusLabel = (status: SystemStatus): string => {
    return status.toString().charAt(0).toUpperCase() + status.toString().slice(1);
  };

  const handleSubmitClaim = async () => {
    if (!citizenId.trim()) {
      toast.error("Please enter a Citizen ID");
      return;
    }

    if (systemStatus !== SystemStatus.active) {
      setClaimResult({
        type: "error",
        message: `✗ System is ${getStatusLabel(systemStatus)}. Claims cannot be processed.`,
      });
      return;
    }

    const citizen = citizens.find((c) => c.id === citizenId.trim());
    if (!citizen) {
      setClaimResult({
        type: "error",
        message: "✗ Citizen ID not found in registry",
      });
      return;
    }

    try {
      const result = await claimBenefits.mutateAsync({
        id: citizen.id,
        scheme: citizen.scheme,
        amount: citizen.amount,
      });

      if (result.toLowerCase().includes("approved")) {
        setClaimResult({
          type: "success",
          message: `✓ Claim approved! ₹${formatAmount(citizen.amount)} disbursed`,
        });
        setCitizenId("");
      } else {
        setClaimResult({
          type: "error",
          message: `✗ Claim rejected: ${result}`,
        });
      }
    } catch (error) {
      setClaimResult({
        type: "error",
        message: `✗ Claim failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  };

  const mapGender = (gender: string): Gender => {
    const normalized = gender.toLowerCase();
    if (normalized === "male") return Gender.male;
    if (normalized === "female") return Gender.female;
    return Gender.other;
  };

  const mapMaritalStatus = (status: string): MaritalStatus => {
    const normalized = status.toLowerCase();
    if (normalized === "single") return MaritalStatus.single;
    if (normalized === "married") return MaritalStatus.married;
    if (normalized === "divorced") return MaritalStatus.divorced;
    if (normalized === "widowed") return MaritalStatus.widowed;
    return MaritalStatus.single;
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
        name: row.Name || "",
        dob: parseDOB(row.DOB),
        gender: mapGender(row.Gender),
        maritalStatus: mapMaritalStatus(row.Marital_Status),
        scheme: row.Scheme_Eligibility || "",
        amount: BigInt(Math.round(row.Scheme_Amount || 0)),
      }));

      await addCitizens.mutateAsync(citizensToAdd);
      toast.success(`✓ Successfully imported ${citizensToAdd.length} citizens`);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import data");
    }
  };

  const handleEmergencyPause = async () => {
    try {
      if (systemStatus === SystemStatus.paused) {
        await setSystemStatus.mutateAsync(SystemStatus.active);
        toast.success("System resumed");
      } else {
        await setSystemStatus.mutateAsync(SystemStatus.paused);
        toast.warning("System paused");
      }
    } catch (error) {
      toast.error("Failed to update system status");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Jan-Dhan Gateway</h1>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus)}`} />
              <span className="text-sm font-medium">{getStatusLabel(systemStatus)}</span>
            </div>
          </div>
          <Button
            size="lg"
            variant={systemStatus === SystemStatus.paused ? "outline" : "destructive"}
            onClick={handleEmergencyPause}
            className="min-h-[48px] px-6"
          >
            {systemStatus === SystemStatus.paused ? "RESUME SYSTEM" : "EMERGENCY PAUSE"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Citizens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{Number(citizenCount).toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Disbursed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₹{formatAmount(totalDisbursed)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Available Budget
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₹{formatAmount(budget)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Submit Claim Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Submit Claim</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Enter 12-digit Citizen ID"
                  value={citizenId}
                  onChange={(e) => setCitizenId(e.target.value)}
                  className="flex-1 h-12 text-base"
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
                  className="h-12 px-8"
                  disabled={claimBenefits.isPending}
                >
                  {claimBenefits.isPending ? "Submitting..." : "Submit Claim"}
                </Button>
              </div>

              {claimResult && (
                <Alert
                  className={
                    claimResult.type === "success"
                      ? "bg-green-50 border-green-200 text-green-900"
                      : "bg-red-50 border-red-200 text-red-900"
                  }
                >
                  {claimResult.type === "success" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <AlertDescription className="text-base font-medium">
                    {claimResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Import Data Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Import Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex items-center justify-center h-12 px-4 border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors"
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    <span className="text-base">
                      {file ? file.name : "Choose Excel file"}
                    </span>
                  </label>
                </div>
                <Button
                  onClick={handleUpload}
                  size="lg"
                  className="h-12 px-8"
                  disabled={!file || addCitizens.isPending}
                >
                  {addCitizens.isPending ? "Uploading..." : "Upload Dataset"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Citizens List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Citizens ({citizens.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {displayedCitizens.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No citizens registered. Upload a dataset to get started.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-base">Citizen ID</TableHead>
                        <TableHead className="text-base">Scheme</TableHead>
                        <TableHead className="text-base">Amount</TableHead>
                        <TableHead className="text-base">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedCitizens.map((citizen: Citizen) => (
                        <TableRow key={citizen.id}>
                          <TableCell className="font-mono text-base">{citizen.id}</TableCell>
                          <TableCell className="text-base">{citizen.scheme}</TableCell>
                          <TableCell className="text-base">
                            ₹{formatAmount(citizen.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                citizen.accountStatus === "active" ? "default" : "secondary"
                              }
                            >
                              {citizen.accountStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {citizens.length > 20 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Showing first 20 of {citizens.length} citizens
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No transactions yet. Submit a claim to see transaction history.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-base">Transaction ID</TableHead>
                        <TableHead className="text-base">Citizen ID</TableHead>
                        <TableHead className="text-base">Amount</TableHead>
                        <TableHead className="text-base">Status</TableHead>
                        <TableHead className="text-base">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTransactions.map((txn: Transaction) => (
                        <TableRow key={txn.id}>
                          <TableCell className="font-mono text-sm">{txn.id}</TableCell>
                          <TableCell className="font-mono text-base">{txn.citizenId}</TableCell>
                          <TableCell className="text-base">₹{formatAmount(txn.amount)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                txn.status === ClaimStatus.approved ? "default" : "destructive"
                              }
                            >
                              {txn.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-base">{formatDate(txn.timestamp)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {transactions.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Showing last 10 of {transactions.length} transactions
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <footer className="text-center text-sm text-muted-foreground py-8 border-t">
            © 2026. Built with love using{" "}
            <a
              href="https://caffeine.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </footer>
        </div>
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
