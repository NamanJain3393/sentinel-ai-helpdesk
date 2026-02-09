import fs from "fs";
import path from "path";
import Papa from "papaparse";

export interface Ticket {
  "Response SLA Violation Reason"?: string;
  "Resolution SLA - Violation"?: string;
  "Resolution SLA Violation Reason"?: string;
  "Total Pending Duration"?: string;
  "Resolution SLA In Minutes"?: string;
  "Pending Reason"?: string;
  "Solution"?: string;
  "Closure Code"?: string;
  "Vendor Incident ID"?: string;
  "FCR Comments"?: string;
  "Reopen Incident"?: string;
  "Updated Time"?: string;
  "Resolution SLA In Minutes2"?: string;
  "Resolution Elapsetime"?: string;
  "Total Pending Duration2"?: string;
  "Ticket Age"?: string;
  "Department Display name"?: string;
}

export function loadTickets(): Ticket[] {
  const filePath = path.join(process.cwd(), "data", "Monthly_Report.csv");
  const file = fs.readFileSync(filePath, "utf8");
  const parsed = Papa.parse<Ticket>(file, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data;
}

// Alias used by app code
export function loadData(): Ticket[] {
  return loadTickets();
}