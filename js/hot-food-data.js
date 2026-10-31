/* CR Bakery weekend hot food (preorder, pickup only).
   - orderByDay / orderByTime: the last moment to order for the coming weekend (Pacific time).
     After that, the form only offers the weekend after.
   - pickupDays: the days customers can pick up.
   - pickupStart / pickupEnd: first and last pickup time offered (24-hour, every 30 minutes).
     Several customers can choose the same time.
   - weeksAhead: how many upcoming weekends customers can order for.
   Items work like the menu (see menu-data.js). An item with fillings gets one order line
   per filling and size, e.g. "Pork Tamales, Half dozen". */
window.HOT_FOOD = {
  title: "Weekend Hot Food",
  orderByDay: "Thursday",
  orderByTime: "17:00",
  pickupDays: ["Saturday", "Sunday"],
  pickupStart: "10:00",
  pickupEnd: "17:00",
  weeksAhead: 2,
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
