/* CR Bakery: contact and payment details.
   Update the values below and every page picks them up. */
window.SITE = {
  name: "CR Bakery",
  email: "crbakery25@gmail.com",       // shown on the site and used when the order form has no form service connected
  venmoUrl: "https://venmo.com/code?user_id=3268553142697984963&created=1789952430",
  facebookUrl: "https://www.facebook.com/profile.php?id=61571157834804",
  linktreeUrl: "https://linktr.ee/crbakery25",
  leadTimeHours: 48,                   // minimum notice before pickup; the order form only allows dates at least this far ahead
  delivery: { baseFee: 7, baseMiles: 10, perMileFee: 0.5 },   // $7.00 up to 10 miles, plus $0.50 for each additional mile
  deliveryZips: {                      // driving miles, one way, from the pickup spot to each ZIP code you deliver to
    "95624": 7.7                       // Elk Grove (e.g. Elk Grove Florin Rd) - under 10 mi, so $7.00 flat
  },
  closedRanges: [                      // dates CR Bakery is away: no pickups (start and end are both included)
    { start: "2026-09-26", end: "2026-10-03" }
  ],
  bookedSlots: [                       // times already taken: one order per 15-minute time. Add a line for each confirmed order:
    // { date: "2026-10-10", time: "10:15" },   (24-hour time between 09:00 and 19:00; those times are hidden for that date)
  ],
  bookingApi: "https://crbakery-booking.crbakery25.workers.dev/",                      // address of the booking service (Cloudflare Worker). Leave empty to use only the bookedSlots list above.
  formEndpoint: "https://formspree.io/f/mppwprrj"   // Formspree form: each order is emailed to you
};
