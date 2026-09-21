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
