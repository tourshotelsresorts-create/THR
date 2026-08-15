"use client";
import { useEffect, useState } from "react";
import { API, api, formatMoney, getToken } from "../../../lib/api";

export default function QuotePage({ params }: { params: { id: string } }) {
  const [quote, setQuote] = useState<any>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api(`/quotes/${params.id}`).then(setQuote).catch((e) => setMsg(e.message));
  }, [params.id]);

  if (!quote) return <div className="wrap">{msg || "Loading quote…"}</div>;
  const snap = quote.snapshotJson;
  const token = getToken();

  return (
    <div className="wrap">
      <h1>Quote</h1>
      <p className="muted">
        Status {quote.status} · lock until {new Date(quote.rateLockExpiresAt).toLocaleString()}
      </p>
      <div className="price">{formatMoney(snap.price.totalMinor)}</div>
      {msg && <div className="ok">{msg}</div>}
      <div className="row" style={{ marginTop: 16 }}>
        <a className="primary" style={{ display: "inline-block" }} href={`${API}/quotes/${quote.id}/pdf`} onClick={(e) => {
          e.preventDefault();
          fetch(`${API}/quotes/${quote.id}/pdf`, { headers: { authorization: `Bearer ${token}` } })
            .then((r) => r.blob())
            .then((b) => {
              const url = URL.createObjectURL(b);
              const a = document.createElement("a");
              a.href = url;
              a.download = `quote-${quote.id}.pdf`;
              a.click();
            });
        }}>
          Download PDF
        </a>
        <button className="ghost" onClick={() => window.print()}>Print</button>
        <button
          className="ghost"
          onClick={async () => {
            const r = await api<{ publicUrl: string }>("/quotes/" + quote.id + "/share", {
              method: "POST",
              body: JSON.stringify({ channel: "link" }),
            });
            setMsg(`Share link ready: ${r.publicUrl}`);
          }}
        >
          Copy share link
        </button>
        <button
          className="ghost"
          onClick={async () => {
            await api("/quotes/" + quote.id + "/share", {
              method: "POST",
              body: JSON.stringify({ channel: "email", to: "guest@example.com" }),
            });
            setMsg("Email queued (SMTP stub logs when host unset).");
          }}
        >
          Email
        </button>
        <button
          className="ghost"
          onClick={async () => {
            await api("/quotes/" + quote.id + "/share", {
              method: "POST",
              body: JSON.stringify({ channel: "whatsapp", to: "+910000000000" }),
            });
            setMsg("WhatsApp stub accepted.");
          }}
        >
          WhatsApp
        </button>
        <button
          className="primary"
          onClick={async () => {
            const b = await api<{ id: string }>("/quotes/" + quote.id + "/convert", { method: "POST", body: "{}" });
            setMsg(`Converted to booking ${b.id}`);
          }}
        >
          Convert to booking
        </button>
      </div>
    </div>
  );
}
