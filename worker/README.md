# Booking service (Cloudflare Worker)

Stops two orders from taking the same date and 15-minute time. No secrets are stored in these files.

## Set up (Cloudflare dashboard)

1. **Database:** Storage & Databases > D1 SQL database > Create. Name it `crbakery-bookings`. Open its **Console**, paste everything from `schema.sql`, and run it.
2. **Worker:** Workers & Pages > Create > Start with Hello World > name it `crbakery-booking` > Deploy. Then **Edit code**, replace everything with `index.js`, and Deploy.
3. **Connect the database:** Worker > Settings > Bindings > Add > D1 database. Variable name `DB`, database `crbakery-bookings`. Save and deploy.
4. **Settings:** Worker > Settings > Variables and Secrets > Add:
   - `ALLOWED_ORIGINS` (Text): `https://crbakery25.com,https://www.crbakery25.com,https://crbakery25.github.io`
   - `ADMIN_KEY` (Secret): a long password you choose
5. Copy the Worker address (`https://crbakery-booking.<your-name>.workers.dev`) and put it in `bookingApi` in `js/site-config.js`, then push the site.

## Using it

- Each order email has a `release_link`. Open it and click **Release this time** to free that slot.
- `https://<worker address>/admin?key=YOUR_ADMIN_KEY` lists every booked time with a Release button.
- Bookings for dates that have passed are removed automatically (the day after).
- A time held by someone who never finishes ordering frees itself after 5 minutes.

## Automatic delivery fee calculator (optional)

Calculates a real driving-distance delivery fee as a customer types their address, instead of
the flat fee. The pickup address is never written into any file, never sent to the browser, and
never seen by anyone building or reading this site's code - it exists only as two private numbers
in your Cloudflare account.

1. **Find your own coordinates.** Do this yourself; there's no need to share the result with
   anyone. Easiest way: open Google Maps, find your pickup spot, right-click it, and the top entry
   of the menu is the latitude and longitude (e.g. `38.xxxxxx, -121.xxxxxx`). Write down the two
   numbers.
2. **Get a free API key.** Sign up at openrouteservice.org (email only, no card). After signing in,
   open your Dashboard, create a token, and copy the key shown.
3. **Add three secrets** to the Worker (Worker > Settings > Variables and Secrets), each as
   **Secret**, not Text, so they're hidden even from you after saving:
   - `PICKUP_LAT`: the latitude you found (just the number, e.g. `38.123456`)
   - `PICKUP_LNG`: the longitude you found (just the number, e.g. `-121.123456`, keep the minus sign)
   - `ORS_API_KEY`: the OpenRouteService key
4. Save and deploy. No change to `site-config.js` or any other file is needed - the order form
   starts calling the calculator automatically through the existing `bookingApi` address.
5. If anything goes wrong (key missing, address not found, the mapping service is down), the
   order form quietly falls back to the flat `delivery.baseFee` from `site-config.js`, so the site
   never breaks because of this feature.

OpenRouteService's free tier (2,000 requests/day, 40/minute) is far more than a small bakery
site would use. There's no per-visitor rate limit on this endpoint beyond that free quota and the
`ALLOWED_ORIGINS` check, so if it's ever abused, the practical effect is that quota runs out and
quotes fall back to the flat fee until it resets - nothing is charged and nothing breaks.
