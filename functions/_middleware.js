/* Cloudflare Pages only (GitHub Pages ignores this file).
   Sends visitors and search engines from the Cloudflare copy of the live site
   (crbakery.pages.dev) to the real address, keeping the page they asked for.
   The test site (staging.crbakery.pages.dev) and other test addresses are left alone. */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === "crbakery.pages.dev") {
    url.protocol = "https:";
    url.hostname = "crbakery25.com";
    url.port = "";
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
