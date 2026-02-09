"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Ticket {
  [key: string]: any;
}

interface TicketTableProps {
  tickets: Ticket[];
  pageSize?: number;
}

export default function TicketTable({ tickets, pageSize = 10 }: TicketTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Get all column names from tickets, ensuring "department" is present
  const columns = useMemo(() => {
    if (tickets.length === 0) return [];
    const allKeys = Object.keys(tickets[0]);
    // Pick specific columns to show by default
    const preferredOrder = ["Incident ID", "Log Time", "department", "Category", "Priority", "Status", "Assigned To", "Department Display name"];
    const visibleCols = preferredOrder.filter(k => allKeys.includes(k));
    // Fill up to 8 columns if needed
    if (visibleCols.length < 8) {
      allKeys.forEach(k => {
        if (!visibleCols.includes(k) && visibleCols.length < 8) visibleCols.push(k);
      });
    }
    return visibleCols;
  }, [tickets]);

  // Filter and sort tickets
  const processedTickets = useMemo(() => {
    let filtered = tickets;

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((ticket) =>
        Object.values(ticket).some((value) =>
          String(value).toLowerCase().includes(query)
        )
      );
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        const comparison =
          typeof aVal === "number" && typeof bVal === "number"
            ? aVal - bVal
            : String(aVal).localeCompare(String(bVal));
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [tickets, searchQuery, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedTickets.length / pageSize);
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedTickets.slice(start, start + pageSize);
  }, [processedTickets, currentPage, pageSize]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-slate-500">
          No tickets available
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-slate-200/80 dark:border-slate-800/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-left">
                Ticket Details
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1 text-left">
                {processedTickets.length} tickets {searchQuery && `matching "${searchQuery}"`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => {
                    // Display name mapping
                    const displayName = col === "Resolution Elapsetime" ? "Resolution Elapsed Time" : col;
                    return (
                      <TableHead
                        key={col}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => handleSort(col)}
                      >
                        <div className="flex items-center gap-2">
                          {displayName}
                          {sortField === col && (
                            <span className="text-xs">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTickets.map((ticket, idx) => (
                  <TableRow
                    key={idx}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => handleTicketClick(ticket)}
                  >
                    {columns.map((col) => (
                      <TableCell key={col} className="max-w-xs truncate">
                        {String(ticket[col] || "").slice(0, 50)}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTicketClick(ticket);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-600">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, processedTickets.length)} of{" "}
              {processedTickets.length} tickets
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
            <DialogDescription>
              Complete information for ticket {selectedTicket?.["Incident ID"] || "N/A"}
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              {Object.entries(selectedTicket).map(([key, value]) => {
                const displayKey = key === "Resolution Elapsetime" ? "Resolution Elapsed Time" : key;
                return (
                  <div key={key} className="border-b pb-2">
                    <div className="text-sm font-semibold text-slate-700 mb-1">{displayKey}</div>
                    <div className="text-sm text-slate-600 whitespace-pre-wrap">
                      {String(value || "N/A")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

