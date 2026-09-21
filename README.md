# CR Bakery website

A plain HTML/CSS/JS site. No build step. It runs on GitHub Pages.

## Where things live

- `js/menu-data.js`: the menu (names, prices, photos). Edit this to add or change items.
- `js/site-config.js`: email, Venmo, Facebook, and Linktree links, and the order-form service URL.
- `images/`: logo and photos. Put a cake photo here and set its `image` in `menu-data.js`.
- `index.html`, `menu.html`, `about.html`, `contact.html`: the pages.
- `css/styles.css`: colors and layout (navy and gold from the logo).

## Publish on GitHub Pages

1. Create a GitHub account and a new public repository (for example `cr-bakery`).
2. Upload everything in this folder to the repository root.
3. In the repository, open Settings, then Pages. Under "Build and deployment", choose "Deploy from a branch", pick `main` and `/ (root)`, and save.
4. After a minute the site is live at `https://YOUR-USERNAME.github.io/cr-bakery/`.

## Receive orders by email

Until an order email or `formEndpoint` is set in `js/site-config.js`, the order form points customers to your Facebook page. Once `email` is set, the form opens the customer's email app with the order filled in. To get orders as emails automatically instead, create a form at formspree.io and paste its URL (it looks like `https://formspree.io/f/xxxxxxxx`) into `formEndpoint`.
