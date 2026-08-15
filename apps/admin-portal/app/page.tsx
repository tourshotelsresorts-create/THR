"use client";
export default function Dashboard() {
  return (
    <div className="wrap">
      <h1>Hotel & DMC Contracting</h1>
      <p className="muted">Masters, markup, tax, and audit. Finance-readonly can view; Revenue Admin owns markup/settings.</p>
      <div className="card">
        <p>Use the nav to manage hotels (static + API rates, rooms, meal plans, images, blackouts), vehicles, activities, and destinations.</p>
        <p>CSV import is available on each master via the Import box.</p>
      </div>
    </div>
  );
}
