/* CR Bakery menu.
   To add an item, copy a line inside "items" and change it.
   - id:          short unique name, lowercase with dashes
   - price:       number, no $ sign
   - description: optional, shown under the name on cards
   - image:       optional, e.g. "images/peach.jpg" (a placeholder shows until you add one)
   - alt:         optional short description of the photo, for screen readers
   - paymentLink: optional, reserved for a Stripe Payment Link later */
window.MENU = {
  sections: [
    {
      id: "signature",
      title: "The signature rounds",
      description: "Handcrafted 9-inch artisanal rounds, sold as whole cakes.",
      layout: "cards",
      items: [
        { id: "blueberry-crumble", name: "Blueberry Crumble", price: 60, description: "", image: "images/blueberry-crumble.jpg", alt: "Blueberry cheesecake with crumb topping and a white drizzle", paymentLink: "" },
        { id: "apple-crumble",     name: "Apple Crumble",     price: 60, description: "", image: "images/apple-crumble.jpg", alt: "Cheesecake with a golden crumb topping", paymentLink: "" },
        { id: "fresh-strawberry",  name: "Fresh Strawberry",  price: 50, description: "", image: "images/fresh-strawberry.jpg", alt: "Cheesecake topped with fresh strawberries and glaze", paymentLink: "" },
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
    }
  ]
};
