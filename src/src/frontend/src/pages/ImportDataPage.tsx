import { useState, useRef } from "react";
import { useAddCitizens } from "@/hooks/useQueries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Info, CheckCircle2 } from "lucide-react";
import { parseDOB } from "@/lib/helpers";
import { toast } from "sonner";
import { Gender, MaritalStatus, AccountStatus, AadhaarStatus, type InputCitizen } from "../backend";

interface ExcelRow {
  Citizen_ID: string | number;
  Name: string;
  DOB: string;
  Gender: string;
  Marital_Status: string;
  Account_Status: string;
  Aadhaar_Linked: string;
  Scheme_Eligibility: string;
  Scheme_Amount: number;
}

export default function ImportDataPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addCitizens = useAddCitizens();

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

  const mapAccountStatus = (status: string): AccountStatus => {
    const normalized = status.toLowerCase().trim();
    if (normalized === "active") return AccountStatus.active;
    if (normalized === "inactive") return AccountStatus.inactive;
    return AccountStatus.active; // Default to active
  };

  const mapAadhaarStatus = (status: string): AadhaarStatus => {
    const normalized = status.toLowerCase().trim();
    // Handle TRUE/true/Yes/yes/Linked/linked
    if (normalized === "true" || normalized === "yes" || normalized === "linked") {
      return AadhaarStatus.linked;
    }
    // Handle FALSE/false/No/no/Unlinked/unlinked
    return AadhaarStatus.unlinked;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".xls")) {
        toast.error("Invalid file type", {
          description: "Please upload an Excel file (.xlsx or .xls)",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("No file selected");
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      // Load xlsx from CDN at runtime
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

      setTotal(jsonData.length);

      const citizens: InputCitizen[] = jsonData.map((row, index) => {
        setProgress(Math.round(((index + 1) / jsonData.length) * 50));

        return {
          id: row.Citizen_ID?.toString() || "",
          name: row.Name || "",
          dob: parseDOB(row.DOB),
          gender: mapGender(row.Gender),
          maritalStatus: mapMaritalStatus(row.Marital_Status),
          accountStatus: mapAccountStatus(row.Account_Status),
          aadhaarStatus: mapAadhaarStatus(row.Aadhaar_Linked),
          scheme: row.Scheme_Eligibility || "",
          amount: BigInt(Math.round(row.Scheme_Amount || 0)),
        };
      });

      await addCitizens.mutateAsync(citizens);
      setProgress(100);

      toast.success("Import Successful", {
        description: `Successfully imported ${citizens.length} citizens`,
      });

      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Import Failed", {
        description: error instanceof Error ? error.message : "Failed to import data",
      });
    } finally {
      setImporting(false);
      setProgress(0);
      setTotal(0);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Import Data</h1>
        <p className="text-muted-foreground mt-1">Bulk import citizen records from Excel</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="font-semibold mb-2">Required Excel columns:</p>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>
              <span className="font-mono">Citizen_ID</span> - 12-digit unique identifier
            </li>
            <li>
              <span className="font-mono">Name</span> - Full name
            </li>
            <li>
              <span className="font-mono">DOB</span> - Date of birth (DD/MM/YYYY or DD-MM-YYYY)
            </li>
            <li>
              <span className="font-mono">Gender</span> - Male, Female, or Other
            </li>
            <li>
              <span className="font-mono">Marital_Status</span> - Single, Married, Divorced, or
              Widowed
            </li>
            <li>
              <span className="font-mono">Account_Status</span> - Active or Inactive
            </li>
            <li>
              <span className="font-mono">Aadhaar_Linked</span> - Linked/Yes or Unlinked/No
            </li>
            <li>
              <span className="font-mono">Scheme_Eligibility</span> - Scheme name
            </li>
            <li>
              <span className="font-mono">Scheme_Amount</span> - Amount in rupees
            </li>
          </ul>
        </AlertDescription>
      </Alert>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
          <CardDescription>
            Upload <span className="font-mono">jan_dhan_registry_advanced.xlsx</span> or compatible
            format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
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
              className="cursor-pointer flex flex-col items-center gap-4"
            >
              <div className="bg-primary/10 p-4 rounded-full">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {file ? file.name : "Click to upload Excel file"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports .xlsx and .xls formats
                </p>
              </div>
              {!file && (
                <Button type="button" variant="outline">
                  Browse Files
                </Button>
              )}
            </label>
          </div>

          {file && !importing && (
            <Alert className="bg-success/10 border-success">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  File selected: <span className="font-semibold">{file.name}</span>
                </span>
                <Button onClick={() => setFile(null)} variant="ghost" size="sm">
                  Change
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Importing {total > 0 ? `${Math.round((progress / 100) * total)} of ${total}` : ""}{" "}
                  citizens...
                </span>
                <span className="font-semibold font-mono">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleImport}
              disabled={!file || importing}
              className="px-8"
            >
              {importing ? "Importing..." : "Import Citizens"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
