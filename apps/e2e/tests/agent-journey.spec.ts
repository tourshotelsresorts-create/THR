import { test, expect } from "@playwright/test";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

test("agent journey: search → customize → quote → share → convert", async ({ request }) => {
  const health = await request.get(`${API}/health`).catch(() => null);
  test.skip(!health?.ok(), "API not running");

  const login = await request.post(`${API}/auth/login`, {
    data: { email: "agent@thr.com", password: "Password123!" },
  });
  expect(login.ok()).toBeTruthy();
  const { token } = await login.json();
  const dests = await request.get(`${API}/destinations`);
  const destinations = await dests.json();
  const goa = destinations.find((d: { city: string }) => d.city === "Goa");
  expect(goa).toBeTruthy();

  const search = await request.post(`${API}/search`, {
    headers: { authorization: `Bearer ${token}` },
    data: {
      destinationId: goa.id,
      travelDate: "2026-11-10",
      nights: 3,
      adults: 2,
      children: 0,
      childAges: [],
      rooms: 1,
      nationality: "IN",
      currency: "INR",
    },
  });
  expect(search.ok()).toBeTruthy();
  const { results } = await search.json();
  const pkgId = results[0].package.id;

  const vehicles = await request.get(`${API}/packages/${pkgId}/vehicles`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const vehicleList = await vehicles.json();
  const swapV = await request.patch(`${API}/packages/${pkgId}/vehicle`, {
    headers: { authorization: `Bearer ${token}` },
    data: { vehicleId: vehicleList[0].id },
  });
  expect(swapV.ok()).toBeTruthy();
  const priced = await swapV.json();
  expect(priced.price.totalMinor).toBeGreaterThan(0);

  const hotels = await request.get(`${API}/packages/${pkgId}/hotels`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const hotelList = await hotels.json();
  const room = hotelList[0].roomTypes[0];
  const swapH = await request.patch(`${API}/packages/${pkgId}/hotel`, {
    headers: { authorization: `Bearer ${token}` },
    data: { hotelId: hotelList[0].id, roomTypeId: room.id },
  });
  expect(swapH.ok()).toBeTruthy();

  const acts = await request.get(`${API}/packages/${pkgId}/activities`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const actList = await acts.json();
  if (actList[0]?.options?.[0]) {
    await request.patch(`${API}/packages/${pkgId}/activities`, {
      headers: { authorization: `Bearer ${token}` },
      data: {
        dayNumber: 2,
        activityId: actList[0].id,
        optionId: actList[0].options[0].id,
      },
    });
  }

  const quoteRes = await request.post(`${API}/quotes`, {
    headers: { authorization: `Bearer ${token}`, "idempotency-key": "e2e-quote-1" },
    data: { packageId: pkgId },
  });
  expect(quoteRes.ok()).toBeTruthy();
  const quote = await quoteRes.json();

  const share = await request.post(`${API}/quotes/${quote.id}/share`, {
    headers: { authorization: `Bearer ${token}` },
    data: { channel: "link" },
  });
  expect(share.ok()).toBeTruthy();

  const booking = await request.post(`${API}/quotes/${quote.id}/convert`, {
    headers: { authorization: `Bearer ${token}`, "idempotency-key": "e2e-book-1" },
    data: {},
  });
  expect(booking.ok()).toBeTruthy();
});
