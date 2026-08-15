"use client";
import { useEffect, useState } from "react";
import { api, formatMoney } from "../../../lib/api";

type Priced = {
  templateName?: string;
  package: {
    id: string;
    nights: number;
    travelDate: string;
    hotels: { nightIndex: number; date: string; hotelId: string; roomTypeId: string; mealPlan: string }[];
    vehicleId: string;
    activities: { dayNumber: number; activityId: string; optionId: string; transferType: string }[];
  };
  price: { totalMinor: number; displayTotalMinor: number; displayCurrency: string; lines: { label: string; amountMinor: number }[] };
  feasibility: { feasible: boolean; failures: { check: string; message: string }[] };
  inclusions: string[];
  exclusions: string[];
  cancellationSummary: string;
};

export default function PackagePage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<Priced | null>(null);
  const [hotels, setHotels] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const priced = await api<Priced>(`/packages/${params.id}`);
    setData(priced);
    setHotels(await api(`/packages/${params.id}/hotels`));
    setVehicles(await api(`/packages/${params.id}/vehicles`));
    setActivities(await api(`/packages/${params.id}/activities`));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [params.id]);

  async function mutate(path: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      const priced = await api<Priced>(path, { method: "PATCH", body: JSON.stringify(body) });
      setData(priced);
      if (!priced.feasibility.feasible) {
        setError(priced.feasibility.failures.map((f) => `${f.check}: ${f.message}`).join(" · "));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function quote() {
    const q = await api<{ id: string }>("/quotes", { method: "POST", body: JSON.stringify({ packageId: params.id }) });
    window.location.href = `/quotes/${q.id}`;
  }

  if (!data) {
    return (
      <div className="wrap">
        <p className="muted">{error || "Loading itinerary…"}</p>
      </div>
    );
  }

  return (
    <div className="wrap grid two">
      <div>
        <h1>{data.templateName ?? "Customize package"}</h1>
        <p className="muted">
          {data.package.nights} nights from {data.package.travelDate}. Day sequence is locked.
        </p>
        {error && <div className="err">{error}</div>}
        {busy && <p className="muted">Repricing…</p>}

        <section className="card">
          <h3>Hotel (applies across nights)</h3>
          {hotels.map((h) => (
            <div className="opt" key={h.id}>
              <strong>{h.name}</strong>
              <div className="muted">
                {h.starRating}★ · {h.category} · {h.tags?.join(", ")} · review {h.reviewScore}
              </div>
              {h.roomTypes?.map((r: any) => (
                <button
                  key={r.id}
                  className="ghost"
                  style={{ marginTop: 8 }}
                  onClick={() => mutate(`/packages/${params.id}/hotel`, { hotelId: h.id, roomTypeId: r.id })}
                >
                  Use {r.name} ({r.mealPlan})
                </button>
              ))}
            </div>
          ))}
        </section>

        <section className="card" style={{ marginTop: 16 }}>
          <h3>Vehicle (one type for the whole itinerary)</h3>
          {vehicles.map((v) => (
            <div className="opt" key={v.id}>
              <strong>{v.name}</strong> <span className="muted">{v.type} · {v.seatingCapacity} seats</span>
              <div>
                <button className="ghost" onClick={() => mutate(`/packages/${params.id}/vehicle`, { vehicleId: v.id })}>
                  Select vehicle
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="card" style={{ marginTop: 16 }}>
          <h3>Activities</h3>
          {[1, 2, 3, 4].map((day) => (
            <div key={day} className="day">
              <div>Day {day}</div>
              <button className="ghost" onClick={() => mutate(`/packages/${params.id}/activities`, { dayNumber: day, activityId: null, optionId: null })}>
                Remove
              </button>
              {activities.map((a) => (
                <div key={a.id}>
                  <span>{a.name}</span>
                  {a.options?.map((o: any) => (
                    <button
                      key={o.id}
                      className="ghost"
                      style={{ margin: 4 }}
                      onClick={() =>
                        mutate(`/packages/${params.id}/activities`, {
                          dayNumber: day,
                          activityId: a.id,
                          optionId: o.id,
                          transferType: o.transferType,
                        })
                      }
                    >
                      {o.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </section>
      </div>

      <aside className="card">
        <div className="muted">Selling price</div>
        <div className="price">{formatMoney(data.price.totalMinor)}</div>
        <div className="muted">
          Display {formatMoney(data.price.displayTotalMinor, data.price.displayCurrency)}
        </div>
        <ul>
          {data.price.lines.map((l, i) => (
            <li key={i} className="muted">
              {l.label}: {formatMoney(l.amountMinor)}
            </li>
          ))}
        </ul>
        <p className="muted">Inclusions: {data.inclusions.join(", ")}</p>
        <p className="muted">{data.cancellationSummary}</p>
        <button className="primary" onClick={quote} disabled={!data.feasibility.feasible}>
          Generate quote
        </button>
        {!data.feasibility.feasible && <p className="muted">Resolve feasibility failures before quoting.</p>}
      </aside>
    </div>
  );
}
