"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

const SCOPES = [
  "DESTINATION",
  "HOTEL_CATEGORY",
  "PACKAGE_COST_BAND",
  "AGENT_GROUP",
  "CUSTOMER_SEGMENT",
  "SUPPLIER",
  "PRODUCT_TYPE",
];

export default function MarkupPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", scope: "DESTINATION", type: "PERCENTAGE", value: 800, priority: 10 });
  const [msg, setMsg] = useState("");
  const load = () => api<any[]>("/admin/markup-rules").then(setRules).catch((e) => setMsg(e.message));
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="wrap">
      <h1>Markup rules</h1>
      <p className="muted">
        Precedence: matching rules stack from least-specific scope to most-specific, then by priority, then createdAt.
        Exclusive rules stop further stacking. Specificity: customer segment → agent group → cost band → destination →
        hotel category → supplier → product type.
      </p>
      {msg && <p className="err">{msg}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Scope</th>
              <th>Type</th>
              <th>Value</th>
              <th>Priority</th>
              <th>Exclusive</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.scope}</td>
                <td>{r.type}</td>
                <td>{r.type === "PERCENTAGE" ? `${(r.value / 100).toFixed(2)}%` : (r.value / 100).toFixed(2)}</td>
                <td>{r.priority}</td>
                <td>{r.exclusive ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form
          className="card"
          onSubmit={async (e) => {
            e.preventDefault();
            await api("/admin/markup-rules", { method: "POST", body: JSON.stringify(form) });
            setMsg("Rule created");
            load();
          }}
        >
          <h3>New rule</h3>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
            {SCOPES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option>PERCENTAGE</option>
            <option>FIXED</option>
          </select>
          <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
          <p className="muted">PERCENTAGE value is basis points (800 = 8%). FIXED is canonical paise.</p>
          <button type="submit">Save rule</button>
        </form>
      </div>
    </div>
  );
}
