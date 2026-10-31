/* CR Bakery weekend hot food (preorder, pickup only).
   - orderByDay / orderByTime: the last moment to order for the coming weekend (Pacific time).
     After that, the form only offers the weekend after.
   - pickupDays: the days customers can pick up.
   - pickupStart / pickupEnd: first and last pickup time offered (24-hour, every 30 minutes).
     Several customers can choose the same time.
   - daysAhead: how far ahead customers can order (31 = about a month of weekends).
   Items work like the menu (see menu-data.js). An item with fillings gets one order line
   per filling and size, e.g. "Pork Tamales, Half dozen". */
window.HOT_FOOD = {
  title: "Weekend Hot Food",
  orderByDay: "Thursday",
  orderByTime: "17:00",
  pickupDays: ["Saturday", "Sunday"],
  pickupStart: "10:00",
  pickupEnd: "17:00",
  pickupLocation: "near 65th St & Fruitridge Rd",   // where hot food is picked up (cakes and other treats: SITE.pickupArea)
  daysAhead: 31,
  boxLimit: 30,          // most boxes per pickup day (each half dozen or dozen = 1 box). The booking
                         // service enforces this too - keep HOT_BOX_LIMIT in worker/index.js the same.
  /* Holidays: extra pickup days with their own hours and order deadline.
     orderBy is the last moment to order (date and 24-hour time, Pacific). */
  holidays: [
    { date: "2026-11-26", name: "Thanksgiving", pickupStart: "09:00", pickupEnd: "16:00", orderBy: "2026-11-25 17:00" }
  ],
  items: [
    { id: "tamales", name: "Tamales", orderPage: "hot-food.html",
      description: "Choose pork, chicken, or cheese with peppers - or mix and match fillings in one box.",
      mixAndMatch: true,   // adds a "Mix & match a box" builder: customers split a half dozen or dozen across fillings
      image: "images/tamales.jpg", alt: "Pork, chicken, and cheese with pepper tamales cut open on a white plate",
      fillings: [
        { id: "pork",    name: "Pork" },
        { id: "chicken", name: "Chicken" },
        { id: "cheese",  name: "Cheese & Pepper" }
      ],
      sizes: [
        { id: "6",  label: "Half dozen", price: 18 },
        { id: "12", label: "Dozen",      price: 35 }
      ] }
  ]
};
