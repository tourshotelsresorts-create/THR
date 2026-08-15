"use client";
import { useEffect, useState } from "react";
import { API, formatMoney } from "../../../lib/api";

export default function PublicQuote({ params }: { params: { token: string } }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch(`${API}/public/quotes/${params.token}`)
      .then((r) => r.json())
      .then(setData);
  }, [params.token]);
  if (!data?.snapshot) return <div className="wrap">Loading shared quote…</div>;
  return (
    <div className="wrap card">
      <h1>THR.com Holidays quote</h1>
      <p className="muted">Status {data.status}</p>
      <div className="price">{formatMoney(data.snapshot.price.totalMinor)}</div>
      <p>Travel {data.snapshot.package.travelDate} · {data.snapshot.package.nights} nights</p>
    </div>
  );
}
