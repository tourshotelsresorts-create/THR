"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

const MAP: Record<string, { path: string; title: string; columns: string[] }> = {
  hotels: { path: "/admin/hotels", title: "Hotel Master", columns: ["name", "category", "starRating", "priorityRanking"] },
  vehicles: { path: "/admin/vehicles", title: "Vehicle Master", columns: ["name", "type", "city", "seatingCapacity"] },
  activities: { path: "/admin/activities", title: "Activity Master", columns: ["name", "category", "durationMinutes"] },
  destinations: { path: "/admin/destinations", title: "Destination Master", columns: ["city", "country", "bestSeason"] },
  suppliers: { path: "/admin/suppliers", title: "Supplier Master", columns: ["name", "type", "contactEmail"] },
};

export default function MasterPage({ params }: { params: { entity: string } }) {
  const cfg = MAP[params.entity];
  const [rows, setRows] = useState<any[]>([]);
  const [csv, setCsv] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!cfg) return;
    api<any[]>(cfg.path).then(setRows).catch((e) => setMsg(e.message));
  }, [params.entity]);
  if (!cfg) return <div className="wrap">Unknown master</div>;
  return (
    <div className="wrap">
      <h1>{cfg.title}</h1>
      {msg && <p className="err">{msg}</p>}
      <table>
        <thead>
          <tr>
            {cfg.columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
            <th>id</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {cfg.columns.map((c) => (
                <td key={c}>{String(r[c] ?? "")}</td>
              ))}
              <td className="muted">{r.id}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Bulk CSV import</h3>
        <textarea rows={5} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="header,row..." />
        <button
          onClick={async () => {
            const r = await api<{ imported: number }>(`/admin/${params.entity}/import`, {
              method: "POST",
              body: JSON.stringify({ csv }),
            });
            setMsg(`Parsed ${r.imported} rows (preview import).`);
          }}
        >
          Import
        </button>
      </div>
    </div>
  );
}
