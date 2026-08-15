"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Dest = { id: string; city: string; country: string };

export default function SearchPage() {
  const [destinations, setDestinations] = useState<Dest[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    destinationId: "",
    travelDate: "2026-11-10",
    nights: 3,
    adults: 2,
    children: 0,
    rooms: 1,
    nationality: "IN",
    currency: "INR",
  });

  useEffect(() => {
    if (!localStorage.getItem("thr_token")) {
      window.location.href = "/login";
      return;
    }
    api<Dest[]>("/destinations")
      .then((d) => {
        setDestinations(d);
        if (d[0]) setForm((f) => ({ ...f, destinationId: d[0]!.id }));
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await api<{ results: { package: { id: string }; feasibility: { feasible: boolean; failures: { message: string }[] } }[] }>(
        "/search",
        {
          method: "POST",
          body: JSON.stringify({ ...form, childAges: [] }),
        },
      );
      const first = res.results[0];
      if (!first) {
        setError("No matching itinerary template.");
        return;
      }
      if (!first.feasibility.feasible) {
        setError(first.feasibility.failures.map((f) => f.message).join(" · "));
      }
      window.location.href = `/packages/${first.package.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    }
  }

  return (
    <div className="wrap">
      <h1>Build a dynamic holiday</h1>
      <p className="muted">Itinerary sequencing is fixed. Hotels, vehicles and activities swap with instant reprice.</p>
      <form className="card grid" onSubmit={search}>
        <div className="row">
          <label>
            Destination
            <select value={form.destinationId} onChange={(e) => setForm({ ...form, destinationId: e.target.value })}>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.city}, {d.country}
                </option>
              ))}
            </select>
          </label>
          <label>
            Travel date
            <input type="date" value={form.travelDate} onChange={(e) => setForm({ ...form, travelDate: e.target.value })} />
          </label>
          <label>
            Nights
            <input type="number" min={1} value={form.nights} onChange={(e) => setForm({ ...form, nights: Number(e.target.value) })} />
          </label>
        </div>
        <div className="row">
          <label>
            Adults
            <input type="number" min={1} value={form.adults} onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })} />
          </label>
          <label>
            Children
            <input type="number" min={0} value={form.children} onChange={(e) => setForm({ ...form, children: Number(e.target.value) })} />
          </label>
          <label>
            Rooms
            <input type="number" min={1} value={form.rooms} onChange={(e) => setForm({ ...form, rooms: Number(e.target.value) })} />
          </label>
          <label>
            Nationality
            <input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
          </label>
          <label>
            Currency
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              <option>INR</option>
              <option>USD</option>
              <option>AED</option>
              <option>EUR</option>
            </select>
          </label>
        </div>
        {error && <div className="err">{error}</div>}
        <button className="primary" type="submit">
          Search packages
        </button>
      </form>
    </div>
  );
}
