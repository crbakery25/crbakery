/* CR Bakery menu.
   To add an item, copy a line inside "items" and change it.
   - id:          short unique name, lowercase with dashes
   - price:       number, no $ sign
   - description: optional, shown in the pop-up when a customer clicks the item's photo or name
   - image:       optional, e.g. "images/peach.jpg" (a placeholder shows until you add one)
   - alt:         optional short description of the photo, for screen readers
   - paymentLink: optional, reserved for a Stripe Payment Link later
   - images:      optional, for more than one photo: images: [{ src: "images/a.jpg", alt: "..." }, ...]
                  Customers can swipe through them (or use the arrows) on the menu.
   - allergy:     optional allergy warning shown in the pop-up and order form, e.g. "Contains tree nuts (walnuts)."
                  allergyShort is the short label on the menu card, e.g. "Contains nuts".
   - sizes:       optional, for an item sold in more than one size. Leave out price and list
                  each size instead: sizes: [{ id: "x-6", label: "Half dozen", price: 10 }, ...]
                  The menu shows one photo with every size and price; the order form gets a line per size.

   A section can also be a limited-time special. Add:
   - availableUntil: "YYYY-MM-DD"  (the last day it is offered; the whole
                     section disappears from the site by itself the day after)
   - note:          optional line shown under the section heading
   To end a special early, change the date or delete the whole section block. */
window.MENU = {
  sections: [
    {
      id: "seasonal",
      title: "Seasonal specials",
      description: "Here for a limited time only.",
      availableUntil: "2026-11-30",
      note: "Available through November 30.",
      layout: "cards",
      items: [
        { id: "pumpkin-cheesecake", name: "Pumpkin Cheesecake", price: 60, description: "Creamy cheesecake made with homemade pumpkin pur\u00e9e, baked in a buttery graham cracker crust, and topped with real pumpkin pieces slow-cooked with cinnamon sticks and brown sugar. Warm, spiced, and full of fall flavor.", image: "images/pumpkin-cheesecake.jpg", alt: "Pumpkin cheesecake topped with a fan of glazed pumpkin", paymentLink: "" },
        { id: "pumpkin-cookies", name: "Pumpkin Cookies", paymentLink: "",
          images: [
            { src: "images/pumpkin-cookies.jpg",        alt: "Soft pumpkin cookies on a wooden board" },
            { src: "images/pumpkin-cookies-inside.jpg", alt: "A pumpkin cookie broken in half to show the soft, cakey inside" }
          ],
          sizes: [
            { id: "pumpkin-cookies-6",  label: "Half dozen", price: 10 },
            { id: "pumpkin-cookies-12", label: "Dozen",      price: 18 }
          ] },
        { id: "pumpkin-bread", name: "Pumpkin Bread", price: 18, description: "",
          images: [
            { src: "images/pumpkin-bread.jpg",        alt: "A whole loaf of pumpkin bread on a wooden board" },
            { src: "images/pumpkin-bread-sliced.jpg", alt: "Pumpkin bread cut open to show the soft inside" }
          ], paymentLink: "" }
      ]
    },
    {
      id: "signature",
      title: "The signature rounds",
      description: "Handcrafted 9-inch artisanal rounds, sold as whole cakes.",
      layout: "cards",
      items: [
        { id: "blueberry-crumble", name: "Blueberry Crumble", price: 60, description: "A creamy cheesecake with real blueberries throughout, baked in a homemade buttery graham cracker crust. Topped with homemade blueberry glaze, fresh fruit, and a homemade crumble, then finished with a drizzle of lemon white chocolate ganache. Bright, rich, and bursting with blueberry flavor.", image: "images/blueberry-crumble.jpg", alt: "Blueberry cheesecake with crumb topping and a white drizzle", paymentLink: "" },
        { id: "apple-crumble",     name: "Apple Crumble",     price: 60, description: "A creamy cheesecake swirled with homemade caramel apples, baked in our signature homemade graham cracker crust. Topped with more caramel apples and a homemade crumble. Warm, buttery, and full of caramel apple flavor.", image: "images/apple-crumble.jpg", alt: "Cheesecake with a golden crumb topping", paymentLink: "" },
        { id: "fresh-strawberry",  name: "Fresh Strawberry",  price: 50, description: "", image: "images/fresh-strawberry.jpg", alt: "Cheesecake topped with fresh strawberries and glaze", paymentLink: "" },
        { id: "berry-bliss",       name: "Berry Bliss",       price: 45, description: "Creamy blueberry cheesecake baked in a buttery graham cracker crust, finished with a glossy strawberry glaze, fresh strawberries, and plump blueberries. Rich, smooth, and bursting with berry flavor.", image: "images/berry-bliss.jpg", alt: "Cheesecake topped with glazed strawberries and fresh blueberries", paymentLink: "" },
        { id: "classic-blueberry", name: "Classic Blueberry", price: 40, description: "", image: "images/classic-blueberry.jpg", alt: "Cheesecake topped with glossy blueberries", paymentLink: "" },
        { id: "zesty-lemon",       name: "Zesty Lemon",       price: 40, description: "", image: "images/zesty-lemon.jpg", alt: "Lemon cheesecake with whipped cream and lemon slices", paymentLink: "" },
        { id: "triple-berry",      name: "Triple Berry",      price: 40, description: "", image: "images/triple-berry.jpg", alt: "Cheesecake topped with raspberries, blackberries, and blueberries", paymentLink: "" },
        { id: "raspberry",         name: "Raspberry",         price: 40, description: "", image: "images/raspberry.jpg", alt: "Cheesecake topped with fresh raspberries", paymentLink: "" },
        { id: "peach",             name: "Peach",             price: 40, description: "", image: "images/peach.jpg", alt: "Cheesecake topped with peach slices", paymentLink: "" }
      ]
    },
    {
      id: "half-and-half",
      title: "Best of Both: Half & Half",
      description: "Can't decide? Get the best of both worlds in one round.",
      layout: "rows",
      items: [
        { id: "blueberry-apple-crumble",          name: "Blueberry & Apple Crumble",          price: 60, image: "images/blueberry-apple-crumble.jpg", alt: "Half blueberry, half apple crumble cheesecake", paymentLink: "" },
        { id: "lemon-blueberry-crumble",          name: "Lemon & Blueberry Crumble",          price: 50, image: "images/lemon-blueberry-crumble.jpg", alt: "Half lemon, half blueberry crumble cheesecake", paymentLink: "" },
        { id: "lemon-apple-crumble",              name: "Lemon & Apple Crumble",              price: 50, image: "images/lemon-apple-crumble.jpg", alt: "Half lemon, half apple crumble cheesecake", paymentLink: "" },
        { id: "classic-blueberry-strawberry",     name: "Classic Blueberry & Strawberry",     price: 45, image: "images/classic-blueberry-strawberry.jpg", alt: "Half blueberry, half strawberry cheesecake", paymentLink: "" },
        { id: "strawberry-triple-berry",          name: "Strawberry & Triple Berry",          price: 45, image: "images/strawberry-triple-berry.jpg", alt: "Half strawberry, half triple berry cheesecake", paymentLink: "" },
        { id: "classic-blueberry-triple-berry",   name: "Classic Blueberry & Triple Berry",   price: 40, image: "images/classic-blueberry-triple-berry.jpg", alt: "Half blueberry, half triple berry cheesecake", paymentLink: "" },
        { id: "classic-blueberry-lemon",          name: "Classic Blueberry & Lemon",          price: 40, image: "images/classic-blueberry-lemon.jpg", alt: "Half blueberry, half lemon cheesecake", paymentLink: "" }
      ]
    },
    {
      id: "cookies",
      title: "Cookies",
      description: "Baked fresh, by the half dozen or dozen.",
      layout: "cards",
      items: [   // add a photo by setting image: "images/your-photo.jpg" (or images: [...] for several)
        { id: "classic-chocolate-chip", name: "Classic Chocolate Chip Cookies", description: "", image: "", alt: "", paymentLink: "",
          sizes: [
            { id: "classic-chocolate-chip-6",  label: "Half dozen", price: 10 },
            { id: "classic-chocolate-chip-12", label: "Dozen",      price: 15 }
          ] },
        { id: "banana-chocolate-chip", name: "Banana Chocolate Chip Cookies", description: "", image: "", alt: "", paymentLink: "",
          sizes: [
            { id: "banana-chocolate-chip-6",  label: "Half dozen", price: 12 },
            { id: "banana-chocolate-chip-12", label: "Dozen",      price: 18 }
          ] },
        { id: "mm-cookies", name: "M&M Cookies", description: "", image: "", alt: "", paymentLink: "",
          sizes: [
            { id: "mm-cookies-6",  label: "Half dozen", price: 12 },
            { id: "mm-cookies-12", label: "Dozen",      price: 18 }
          ] },
        { id: "mexican-wedding", name: "Mexican Wedding Cookies", description: "", image: "", alt: "", paymentLink: "",
          allergyShort: "Contains nuts", allergy: "Contains tree nuts. Not suitable for anyone with a nut allergy.",
          sizes: [
            { id: "mexican-wedding-6",  label: "Half dozen", price: 10 },
            { id: "mexican-wedding-12", label: "Dozen",      price: 15 }
          ] }
      ]
    },
    {
      id: "breads",
      title: "Breads",
      description: "Sweet breads, baked by the loaf.",
      layout: "cards",
      items: [
        { id: "banana-nut-loaf", name: "Banana Nut Loaf", price: 20, description: "Banana bread packed with walnuts and topped with toasted walnuts.",
          allergyShort: "Contains nuts", allergy: "Contains tree nuts (walnuts). Not suitable for anyone with a nut allergy.",
          paymentLink: "",
          images: [
            { src: "images/banana-nut-loaf.jpg",        alt: "A banana nut loaf topped with walnuts on a wooden board" },
            { src: "images/banana-nut-loaf-sliced.jpg", alt: "Banana nut loaf sliced to show walnuts throughout" }
          ] },
        { id: "banana-bread", name: "Banana Bread", price: 16, description: "Classic banana bread, baked by the loaf.", paymentLink: "",
          images: [
            { src: "images/banana-bread.jpg",        alt: "A golden loaf of banana bread on a wooden board" },
            { src: "images/banana-bread-sliced.jpg", alt: "Banana bread sliced to show the soft inside" }
          ] },
        { id: "bread-bundle", name: "Bread Bundle", price: 32, description: "One Banana Nut Loaf and one Banana Bread - both loaves together for $32 (save $4).",
          allergyShort: "Contains nuts", allergy: "Contains tree nuts (walnuts) - the Banana Nut Loaf in this bundle is made with walnuts. Not suitable for anyone with a nut allergy.", paymentLink: "",
          images: [
            { src: "images/bread-bundle.jpg",        alt: "A banana nut loaf and a banana bread side by side on a wooden board" },
            { src: "images/bread-bundle-sliced.jpg", alt: "Both loaves sliced: banana nut on the left, banana bread on the right" }
          ] }
      ]
    }
  ]
};
