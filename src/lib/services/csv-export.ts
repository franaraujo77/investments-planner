/**
 * CSV Export Service (Client-Safe)
 *
 * Story 3.9: Investment History View
 * AC-3.9.4: CSV Export Functionality
 *
 * This module is safe for browser/client use as it has no Node.js dependencies.
 * For ZIP exports (server-side), use export-service.ts
 */

import type { Investment } from "@/lib/db/schema";

/**
 * Escapes a value for CSV format
 * Handles commas, quotes, and newlines
 */
function escapeCSVValue(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  // If the value contains comma, newline, or quote, wrap in quotes and escape quotes
  if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Formats a date for CSV export
 * Returns ISO date string (YYYY-MM-DD)
 */
function formatDateForCSV(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0] ?? "";
}

/**
 * Exports investments to CSV format
 *
 * Story 3.9: Investment History View
 * AC-3.9.4: CSV includes columns: Date, Symbol, Quantity, Price, Total, Currency, Recommended Amount
 *
 * @param investments - Array of investments to export
 * @returns CSV content as string
 */
export function exportInvestmentsToCSV(investments: Investment[]): string {
  // CSV header row
  const headers = [
    "Date",
    "Symbol",
    "Quantity",
    "Price Per Unit",
    "Total Amount",
    "Currency",
    "Recommended Amount",
  ];

  const rows: string[] = [headers.join(",")];

  // Sort investments by date descending for consistent export
  const sortedInvestments = [...investments].sort((a, b) => {
    const dateA = new Date(a.investedAt).getTime();
    const dateB = new Date(b.investedAt).getTime();
    return dateB - dateA;
  });

  // Generate data rows
  for (const investment of sortedInvestments) {
    const row = [
      escapeCSVValue(formatDateForCSV(investment.investedAt)),
      escapeCSVValue(investment.symbol),
      escapeCSVValue(investment.quantity),
      escapeCSVValue(investment.pricePerUnit),
      escapeCSVValue(investment.totalAmount),
      escapeCSVValue(investment.currency),
      escapeCSVValue(investment.recommendedAmount),
    ];
    rows.push(row.join(","));
  }

  return rows.join("\n");
}

/**
 * Triggers a CSV file download in the browser
 *
 * Story 3.9: Investment History View
 * AC-3.9.4: Filename follows pattern: investment-history-YYYY-MM-DD.csv
 *
 * @param content - CSV content as string
 * @param filename - Filename for the downloaded file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
