"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function AuditPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    api<any[]>("/admin/audit").then(setRows).catch(() => setRows([]));
  }, []);
  return (
    <div className="wrap">
      <h1>Audit history</h1>
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Actor</th>
            <th>Entity</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.createdAt).toLocaleString()}</td>
              <td>{r.actor?.email}</td>
              <td>
                {r.entityType} {r.entityId}
              </td>
              <td>{r.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
