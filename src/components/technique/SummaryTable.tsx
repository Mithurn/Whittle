"use client";

interface SummaryTableProps {
  headers: string[];
  rows: string[][];
}

export function SummaryTable({ headers, rows }: SummaryTableProps) {
  if (!headers.length || !rows.length) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left font-sans text-sm">
          <thead className="bg-surface-1">
            <tr>
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-6 py-4 font-label font-semibold text-text-primary"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="transition-colors duration-150 hover:bg-surface-1/50">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-6 py-4 text-text-muted ${
                      cellIndex === 0 ? "font-medium text-text-primary" : ""
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
