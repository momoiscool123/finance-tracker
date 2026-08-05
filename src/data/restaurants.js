/* ==================================================================
 *  CAIRO RESTAURANTS — used by the in-chat "where should I eat?" flow.
 *
 *  Restaurant names, areas and cuisines were checked against public
 *  Cairo dining guides (Aug 2026) so each entry reflects what the place
 *  actually serves. `pricePerPerson` (approx EGP) is a rough typical
 *  spend, NOT a live menu price — treat it as a ballpark and edit
 *  freely. `groupFriendly` marks spots that comfortably seat larger
 *  parties. Later this can be swapped for a live API.
 * ================================================================== */

// Areas the recommender knows about (quick-reply chips in the chat).
export const AREAS = [
  "New Cairo",
  "Zamalek",
  "Maadi",
  "Heliopolis",
  "Nasr City",
  "Mohandessin",
  "Dokki",
  "Downtown",
  "Sheikh Zayed",
  "6th of October",
  "Giza",
];

// Cuisine chips. "Any" = no preference. Broad chips (Asian, Lebanese,
// Cafe) also match related cuisines — see CUISINE_GROUPS in foodChat.js.
export const CUISINES = [
  "Egyptian",
  "Grills",
  "Lebanese",
  "Italian",
  "Burgers",
  "Seafood",
  "Asian",
  "Indian",
  "Cafe",
  "Dessert",
  "French",
  "Any",
];

export const RESTAURANTS = [
  // ---- Egyptian ----
  { name: "Abou Tarek", area: "Downtown", cuisine: "Egyptian", pricePerPerson: 70, rating: 4.5, groupFriendly: true, blurb: "The city's most famous koshary house." },
  { name: "Felfela", area: "Downtown", cuisine: "Egyptian", pricePerPerson: 160, rating: 4.2, groupFriendly: true, blurb: "Traditional Egyptian since 1959 — koshari, kebab, grilled pigeon." },
  { name: "Zooba", area: "Zamalek", cuisine: "Egyptian", pricePerPerson: 190, rating: 4.4, groupFriendly: true, blurb: "Modern Egyptian street food — hawawshi, koshary, taameya." },
  { name: "Abou El Sid", area: "Zamalek", cuisine: "Egyptian", pricePerPerson: 400, rating: 4.3, groupFriendly: true, blurb: "Classic Egyptian dishes and mezze in a heritage setting." },
  { name: "Kebdet El Prince", area: "Giza", cuisine: "Egyptian", pricePerPerson: 170, rating: 4.5, groupFriendly: true, blurb: "Local institution for liver, offal and Egyptian classics, open late." },
  { name: "Fasahet Somaya", area: "Maadi", cuisine: "Egyptian", pricePerPerson: 220, rating: 4.6, groupFriendly: false, blurb: "Tiny, beloved spot for home-style Egyptian cooking." },
  { name: "Cairo Kitchen", area: "Maadi", cuisine: "Egyptian", pricePerPerson: 180, rating: 4.1, groupFriendly: false, blurb: "Fresh, casual Egyptian home cooking." },
  { name: "El Tekkia", area: "Dokki", cuisine: "Egyptian", pricePerPerson: 180, rating: 4.1, groupFriendly: true, blurb: "Popular spot for Egyptian home-style dishes." },
  { name: "Gad", area: "Dokki", cuisine: "Egyptian", pricePerPerson: 100, rating: 4.0, groupFriendly: true, blurb: "Ubiquitous Egyptian chain — shawarma, fiteer, foul & taameya." },

  // ---- Grills ----
  { name: "Abou Shakra", area: "Dokki", cuisine: "Grills", pricePerPerson: 300, rating: 4.2, groupFriendly: true, blurb: "Long-running Egyptian mixed grills and kebab." },
  { name: "Andrea", area: "Giza", cuisine: "Grills", pricePerPerson: 320, rating: 4.3, groupFriendly: true, blurb: "Charcoal-grilled chicken and feteer, great for groups." },
  { name: "ElDahan", area: "Mohandessin", cuisine: "Grills", pricePerPerson: 350, rating: 4.3, groupFriendly: true, blurb: "Grilled meats and kofta — a Cairo institution since 1890." },

  // ---- Lebanese / Levantine ----
  { name: "Taboula", area: "Mohandessin", cuisine: "Lebanese", pricePerPerson: 350, rating: 4.3, groupFriendly: true, blurb: "Lebanese mezze, grills and vegetarian dishes." },
  { name: "Abou Haidar", area: "Heliopolis", cuisine: "Lebanese", pricePerPerson: 90, rating: 4.3, groupFriendly: false, blurb: "50-year-old spot famed for Egyptian-style beef shawarma." },
  { name: "Al Awda", area: "Nasr City", cuisine: "Levantine", pricePerPerson: 160, rating: 4.4, groupFriendly: true, blurb: "Palestinian/Levantine food known for excellent hummus." },
  { name: "Nine63", area: "Sheikh Zayed", cuisine: "Syrian", pricePerPerson: 300, rating: 4.3, groupFriendly: true, blurb: "Syrian cuisine — grills, mezze and fatteh." },

  // ---- Italian / Pizza ----
  { name: "Maison Thomas", area: "Zamalek", cuisine: "Italian", pricePerPerson: 300, rating: 4.4, groupFriendly: false, blurb: "Classic thin-crust pizza, open around the clock (since 1922)." },
  { name: "Vittorio", area: "Maadi", cuisine: "Italian", pricePerPerson: 450, rating: 4.4, groupFriendly: true, blurb: "Warm, authentic Italian — fresh pasta and mains." },
  { name: "Estro", area: "Maadi", cuisine: "Italian", pricePerPerson: 600, rating: 4.5, groupFriendly: false, blurb: "Rooftop Italian with skyline views (Royal Maadi Hotel)." },
  { name: "Cucina", area: "New Cairo", cuisine: "Italian", pricePerPerson: 550, rating: 4.4, groupFriendly: true, blurb: "Long-loved Italian at the JW Marriott." },
  { name: "Pier 88", area: "6th of October", cuisine: "Italian", pricePerPerson: 500, rating: 4.2, groupFriendly: true, blurb: "Italian food and wine with Pyramids views." },

  // ---- Burgers / American ----
  { name: "Lucille's", area: "Maadi", cuisine: "American", pricePerPerson: 350, rating: 4.4, groupFriendly: true, blurb: "Maadi diner staple — all-day breakfast and burgers." },
  { name: "Buffalo Burger", area: "Nasr City", cuisine: "Burgers", pricePerPerson: 160, rating: 4.0, groupFriendly: true, blurb: "Popular local burger chain." },
  { name: "Gigi", area: "Sheikh Zayed", cuisine: "Burgers", pricePerPerson: 250, rating: 4.1, groupFriendly: true, blurb: "Casual burgers and beer." },

  // ---- Seafood ----
  { name: "Fish Market", area: "Giza", cuisine: "Seafood", pricePerPerson: 550, rating: 4.3, groupFriendly: true, blurb: "Pick-your-catch seafood on a Nile boat." },
  { name: "Samakmak", area: "Downtown", cuisine: "Seafood", pricePerPerson: 500, rating: 4.2, groupFriendly: true, blurb: "Dependable fresh fish — grilled fish and butterfly shrimp." },
  { name: "Flying Fish", area: "Mohandessin", cuisine: "Seafood", pricePerPerson: 400, rating: 4.2, groupFriendly: true, blurb: "Cairo's oldest seafood spot (since 1979), on the Agouza Corniche." },

  // ---- Asian (Japanese / Thai / Korean) ----
  { name: "Kazoku", area: "New Cairo", cuisine: "Japanese", pricePerPerson: 500, rating: 4.3, groupFriendly: true, blurb: "Contemporary Japanese and sushi." },
  { name: "Shogun", area: "Nasr City", cuisine: "Japanese", pricePerPerson: 700, rating: 4.3, groupFriendly: false, blurb: "Japanese teppanyaki and sushi at InterContinental Citystars." },
  { name: "Makino", area: "Zamalek", cuisine: "Japanese", pricePerPerson: 450, rating: 4.2, groupFriendly: false, blurb: "Sushi, ramen and bento." },
  { name: "Sabai Sabai", area: "Zamalek", cuisine: "Thai", pricePerPerson: 400, rating: 4.3, groupFriendly: false, blurb: "Authentic Thai cooking by a Thai chef." },
  { name: "Gaya", area: "Maadi", cuisine: "Korean", pricePerPerson: 450, rating: 4.4, groupFriendly: true, blurb: "Korean tabletop BBQ, bibimbap and ramen." },

  // ---- Indian ----
  { name: "Maharaja", area: "Zamalek", cuisine: "Indian", pricePerPerson: 400, rating: 4.2, groupFriendly: true, blurb: "Traditional Indian curries and tandoor." },
  { name: "Indira", area: "Nasr City", cuisine: "Indian", pricePerPerson: 350, rating: 4.3, groupFriendly: true, blurb: "Aromatic curries, butter chicken and biryani." },
  { name: "Kandahar", area: "Mohandessin", cuisine: "Indian", pricePerPerson: 450, rating: 4.3, groupFriendly: true, blurb: "One of Cairo's most authentic Indian kitchens." },

  // ---- French / International (Nile-side & upscale) ----
  { name: "Le Pacha 1901", area: "Zamalek", cuisine: "French", pricePerPerson: 600, rating: 4.3, groupFriendly: true, blurb: "Classic French dining on a moored Nile boat." },
  { name: "Sequoia", area: "Zamalek", cuisine: "International", pricePerPerson: 700, rating: 4.2, groupFriendly: true, blurb: "Sprawling Nile-side lounge — great for big groups and shisha." },
  { name: "Sachi", area: "Heliopolis", cuisine: "Mediterranean", pricePerPerson: 800, rating: 4.5, groupFriendly: true, blurb: "Upscale Mediterranean-Asian shared plates with live cooking." },
  { name: "The Smokery", area: "New Cairo", cuisine: "International", pricePerPerson: 600, rating: 4.3, groupFriendly: true, blurb: "Upscale international plates overlooking Katameya golf." },

  // ---- Cafe / Bakery / Breakfast ----
  { name: "Ovio", area: "New Cairo", cuisine: "Cafe", pricePerPerson: 300, rating: 4.2, groupFriendly: true, blurb: "All-day cafe and brunch." },
  { name: "The Bakery Shop (TBS)", area: "New Cairo", cuisine: "Bakery", pricePerPerson: 110, rating: 4.1, groupFriendly: false, blurb: "Bakery, sandwiches and coffee." },
  { name: "Paul", area: "Heliopolis", cuisine: "Bakery", pricePerPerson: 250, rating: 4.1, groupFriendly: false, blurb: "French bakery-cafe — pastries, salads and breakfast." },
  { name: "Cilantro", area: "Heliopolis", cuisine: "Cafe", pricePerPerson: 120, rating: 4.0, groupFriendly: false, blurb: "Egyptian coffee-shop chain with light bites." },
  { name: "Lilly's", area: "Sheikh Zayed", cuisine: "Cafe", pricePerPerson: 200, rating: 4.1, groupFriendly: false, blurb: "Quiet spot for breakfast and coffee." },

  // ---- Dessert ----
  { name: "El Malky", area: "Heliopolis", cuisine: "Dessert", pricePerPerson: 120, rating: 4.4, groupFriendly: true, blurb: "Egyptian sweets, gelato and pastries." },
  { name: "Mandarine Koueider", area: "Heliopolis", cuisine: "Dessert", pricePerPerson: 130, rating: 4.3, groupFriendly: false, blurb: "Classic Egyptian ice cream and Middle-Eastern sweets." },
  { name: "La Poire", area: "Mohandessin", cuisine: "Dessert", pricePerPerson: 150, rating: 4.1, groupFriendly: false, blurb: "Long-standing patisserie and bakery." },
];

// Deep link to a Google Maps search for a place (no API key needed).
export const mapsUrlFor = (r) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${r.name} ${r.area} Cairo`
  )}`;
