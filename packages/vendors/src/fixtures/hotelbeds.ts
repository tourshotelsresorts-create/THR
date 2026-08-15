export const hotelbedsFixture = [
  {
    code: "HB-TAJFORT",
    city: "Goa",
    netMinor: 1_790_000,
    refundable: true,
    payload: {
      auditData: { processTime: "12", timestamp: "2026-08-15" },
      hotels: {
        hotels: [
          {
            code: 12345,
            name: "Taj Fort Aguada Resort",
            categoryCode: "5EST",
            rooms: [
              {
                code: "DBL.ST",
                rates: [{ net: "17900.00", sellingRate: "17900.00", boardCode: "BB", rooms: 1 }],
              },
            ],
          },
        ],
      },
    },
  },
];
