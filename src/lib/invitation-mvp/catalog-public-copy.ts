/**
 * Guest-facing catalogue copy + live-preview demo identity.
 * Kept separate so marketing names stay unique, dash-free, and theme-matched
 * without rewriting internal creativeBrief metadata.
 */
import type { CatalogTemplate, InvitationStyle } from "./catalogue";

export type PublicCatalogCopy = {
  name: string;
  description: string;
  style: InvitationStyle;
};

/** Browse + detail surfaces: unique name, blurb, and style tag per SKU. */
export const PUBLIC_CATALOG_COPY: Record<string, PublicCatalogCopy> = {
  "classic-gold": {
    name: "Satin Bow Ivory",
    description: "Ivory card with a satin ribbon motif. Untie the bow to open.",
    style: "Classic",
  },
  "luxury-rings": {
    name: "Onyx & Gold Vows",
    description: "High contrast black stage. Open the ring box under spotlight.",
    style: "Premium Dark",
  },
  "arch-green": {
    name: "Vine Arch Chapel",
    description: "Forest arch illustration with cream calligraphy on emerald.",
    style: "Nature",
  },
  "rustic-lace": {
    name: "Timber & Lace",
    description: "Full bleed photo under ornate lace with warm wood tones.",
    style: "Traditional",
  },
  "boho-hexagon": {
    name: "Hexagon Reverie",
    description: "Soft florals inside a floating gold hexagon frame.",
    style: "Boho",
  },
  "floral-garden": {
    name: "Secret Garden Whisper",
    description: "Watercolor botanical borders. Tap and petals fall to open.",
    style: "Floral",
  },
  "passport-luxe": {
    name: "Visa Stamp Voyage",
    description: "Booklet passport reveal with visa stamps and travel motifs.",
    style: "Artistic",
  },
  "glass-acrylic": {
    name: "Frostlight Premiere",
    description: "Frosted acrylic premiere with a film countdown into luminous depth.",
    style: "Clean White",
  },
  "royal-emerald-wedding": {
    name: "Palace Emerald Reign",
    description: "Palace emerald wax seal. Press to open into velvet and gold crown.",
    style: "Royal",
  },
  "midnight-velvet-reception": {
    name: "Velvet Midnight Soirée",
    description: "Film title intro into a magazine cover with editorial page turn chapters.",
    style: "Cinematic",
  },
  "kente-heritage-union": {
    name: "Kente Heritage Union",
    description: "Kente cloth unfold with drum pulse and heritage typography.",
    style: "Kente inspired",
  },
  "traditional-marriage-ceremony": {
    name: "Peach Silk Ribbon",
    description:
      "Peach floral vision board invite with ribbon art, live QR, RSVP, seating and ceremony music.",
    style: "Traditional Ghanaian",
  },
  "forever-afaris-wedding": {
    name: "The Aurora",
    description:
      "Luxury cinematic wedding with blush floral envelope, champagne wax seal and golden gate reveal.",
    style: "European",
  },
  "aurelia-editorial-wedding": {
    name: "Aurelia Editorial Wedding",
    description:
      "Ivory editorial wedding. Tap the veil to open two ceremony days, dress palettes, RSVP and maps.",
    style: "Ivory",
  },
  "seraphine-champagne-wedding": {
    name: "Seraphine Champagne Wedding",
    description:
      "Champagne editorial wedding. Open the veil into two ceremony days, dress palettes, RSVP, maps and the album.",
    style: "Champagne",
  },
  "floral-garden-romance": {
    name: "Petal Promise",
    description: "Living garden romance. Floral logo bloom into petal reveal and floating frames.",
    style: "Romantic",
  },
  "passport-destination-wedding": {
    name: "Horizon Boarding Pass",
    description: "Flip boarding pass reveal made for destination celebrations.",
    style: "Luxury",
  },
  "crystal-acrylic-luxury": {
    name: "Champagne Crystal",
    description: "Glass shimmer acrylic reveal with champagne gold highlights.",
    style: "Clean White",
  },
  "golden-islamic-nikkah": {
    name: "Nikkah Gold Geometry",
    description: "Ornamental palace geometry with a soft instrumental score.",
    style: "Artistic",
  },
  "memorial-candle-tribute": {
    name: "Candlelight Elegy",
    description: "Soft memorial light. Tap to light the candle and open a timeline memory album.",
    style: "Minimal",
  },
  "neon-celebration-party": {
    name: "Electric Pulse",
    description:
      "Fuchsia neon scratch ticket with confetti burst and electric party EDM.",
    style: "Cute",
  },
  "corporate-prestige-summit": {
    name: "Platinum Summit",
    description: "Kinetic grid into agenda chapters and split media for executive events.",
    style: "Modern",
  },
  "luxury-fashion-flagship": {
    name: "Luxury Fashion Flagship",
    description:
      "Ivory silk unveil into a boutique portal, store film and editorial lookbook for a luxury retail opening.",
    style: "Editorial",
  },
  "custom-media": {
    name: "Your Canvas",
    description: "Upload your artwork, video or PDF. We frame it cinematically.",
    style: "Nature",
  },
  "gilded-vows": {
    name: "Gilded Letter Vows",
    description: "Ivory and gold paged invitation with foil names and flourish motifs.",
    style: "Luxury",
  },
  "emerald-promise": {
    name: "Emerald Promise",
    description: "Deep emerald pages with cream calligraphy and botanical dividers.",
    style: "Romantic",
  },
  "kente-court": {
    name: "Kente Court Joy",
    description: "Maroon and gold heritage pages with grand lettering.",
    style: "Kente inspired",
  },
  "gilded-opulence-pages": {
    name: "Gilded Opulence Gallery",
    description: "Five page gilded experience with parallax cover and drifting motifs.",
    style: "Editorial",
  },
  "emerald-cathedral": {
    name: "Emerald Cathedral",
    description: "Arched emerald pages with drifting vines and a venue journey.",
    style: "Floral",
  },
  "kente-royale-pages": {
    name: "Kente Royale",
    description: "Full royal kente experience with gold foil, grand type and drifting weave.",
    style: "Kente inspired",
  },
  "candlelight-farewell": {
    name: "Chapel Candle Farewell",
    description: "Dignified candlelit pages announcing a celebration of life.",
    style: "Minimal",
  },
  "white-lily-rest": {
    name: "White Lily Rest",
    description: "Serene ivory pages with lily motifs and quiet typography.",
    style: "Clean White",
  },
  "royal-mourning-lite": {
    name: "Royal Mourning Rite",
    description: "Black, red and white pages honouring Ghanaian funeral custom.",
    style: "Traditional",
  },
  "candlelight-elegy-pages": {
    name: "Candlelight Tribute Chapters",
    description: "Six solemn pages with a full tribute and biography chapter.",
    style: "Candlelit",
  },
  "white-lily-memorial-pages": {
    name: "White Lily Tribute",
    description: "Full memorial journey in serene ivory with a tribute chapter.",
    style: "Classic",
  },
  "royal-mourning-pages": {
    name: "Royal Mourning Full",
    description: "The full black red white rite with tribute and family pages.",
    style: "Traditional Ghanaian",
  },
  "black-red-cloth-rite": {
    name: "Black Red Cloth Rite",
    description:
      "Akan mourning announcement in black and red cloth with formal silver type and family tribute.",
    style: "Solemn",
  },
  "white-cloth-homegoing": {
    name: "White Cloth Homegoing",
    description:
      "Black and white celebration of life for a life well lived with quiet thanksgiving details.",
    style: "Homegoing",
  },
  "kente-border-farewell": {
    name: "Kente Border Farewell",
    description:
      "Heritage funeral banner with kente border motifs, gold accents and a dignified programme path.",
    style: "Heritage Cloth",
  },
  "one-week-vigil-notice": {
    name: "One Week Vigil Notice",
    description:
      "Digital one week notice with wake keeping details, burial path and community gathering cues.",
    style: "Vigil",
  },
  "pastel-balloon-garden": {
    name: "Pastel Balloon Garden",
    description:
      "Soft pink and sky curtain opens onto balloons, cake light and cheerful celebration music.",
    style: "Playful",
  },
  "gold-glam-milestone": {
    name: "Gold Glam Milestone",
    description:
      "Champagne foil night with a pink wax seal and soft lounge jazz for milestone birthdays.",
    style: "Glam",
  },
  "concert-night-bash": {
    name: "Concert Night Bash",
    description:
      "Stage curtain drop with concert lights, ticket RSVP and live drum celebration energy.",
    style: "Festive",
  },
  "surprise-gift-soiree": {
    name: "Surprise Gift Soiree",
    description:
      "Warm gift-ribbon soiree with balloon burst reveal and soft garden piano.",
    style: "Milestone",
  },
  "executive-boardroom-brief": {
    name: "Executive Boardroom Brief",
    description:
      "Crisp boardroom briefing with dossier unfold, speaker cards and registration path.",
    style: "Executive",
  },
  "product-launch-pulse": {
    name: "Product Launch Pulse",
    description:
      "High clarity product launch with pulse reveal, media grid and badge RSVP.",
    style: "Launch",
  },
  "investor-night-pass": {
    name: "Investor Night Pass",
    description:
      "Credential pass opening for investor night with pitch chapters and venue path.",
    style: "Investor",
  },
  "keynote-agenda-flip": {
    name: "Keynote Agenda Flip",
    description:
      "Keynote stage agenda with flip chapters, speaker lineup and calendar save.",
    style: "Boardroom",
  },
  "femmora-flagship-soft-opening": {
    name: "Femmora Flagship Opening",
    description:
      "A luxury fashion lunch invitation with a couture envelope, invitation card rise, boutique film and editorial lookbook.",
    style: "Couture",
  },
};

export type DemoIdentity = {
  title: string;
  hostName: string;
  message: string;
  invitationName: string;
  venueName: string;
  landmark: string;
  dressCode?: string;
  /** Memorial / event seal override for catalogue envelopes. */
  sealInitials?: string;
};

/**
 * Unique sample celebrants / hosts for catalogue live previews.
 * Fictional only. No live client names, phones, or venues. No invented Mr/Mrs titles.
 * No em dashes. Each layout gets its own names, venue and tone.
 */
export const CATALOG_DEMO_IDENTITIES: Record<string, DemoIdentity> = {
  "classic-gold": {
    title: "The Wedding of Adwoa & Kofi",
    hostName: "Adwoa Serwaa & Kofi Amoako",
    message: "With golden hearts we invite you to our ivory and gold ceremony.",
    invitationName: "Adwoa & Kofi Wedding",
    venueName: "Ivory Ballroom Sample Hall",
    landmark: "La, Accra",
    dressCode: "Formal · Ivory and gold welcome",
  },
  "luxury-rings": {
    title: "The Wedding of Diana & Samuel",
    hostName: "Diana Ofori & Samuel Asante",
    message: "A black tie evening where two rings become one story.",
    invitationName: "Diana & Samuel Vows",
    venueName: "Onyx Ring Gallery",
    landmark: "Cantonments, Accra",
    dressCode: "Black tie · Gold accents welcome",
  },
  "arch-green": {
    title: "The Wedding of Efua & Yaw",
    hostName: "Efua Agyeman & Yaw Boateng",
    message: "Walk with us through the forest arch into forever.",
    invitationName: "Efua & Yaw Union",
    venueName: "Vine Arch Gardens",
    landmark: "Aburi, Eastern Region",
  },
  "rustic-lace": {
    title: "The Wedding of Abena & Malik",
    hostName: "Abena Owusu & Malik Ibrahim",
    message: "Lace, timber and laughter under open skies.",
    invitationName: "Abena & Malik Celebration",
    venueName: "Timber Lake Retreat",
    landmark: "Ashanti Region",
  },
  "boho-hexagon": {
    title: "The Wedding of Lena & Jordan",
    hostName: "Lena Park & Jordan Blake",
    message: "Soft florals, golden geometry and barefoot joy.",
    invitationName: "Lena & Jordan Reverie",
    venueName: "The Wildflower Barn",
    landmark: "Dodowa",
  },
  "floral-garden": {
    title: "The Wedding of Priya & Thomas",
    hostName: "Priya Sharma & Thomas Reid",
    message: "Petals fall as we say yes in the hidden garden.",
    invitationName: "Priya & Thomas Garden",
    venueName: "Rosewood Conservatory",
    landmark: "East Legon, Accra",
  },
  "passport-luxe": {
    title: "The Wedding of Lila & Luca",
    hostName: "Lila Mensima & Luca Romano",
    message: "Your passport to our destination celebration.",
    invitationName: "Lila & Luca Voyage",
    venueName: "Cliff Terrace Pavilion",
    landmark: "Destination wedding",
  },
  "glass-acrylic": {
    title: "The Wedding of Noelle & Andre",
    hostName: "Noelle Chen & Andre Silva",
    message: "Step through frosted glass into a luminous evening.",
    invitationName: "Noelle & Andre Premiere",
    venueName: "Skyglass Pavilion",
    landmark: "Airport City, Accra",
  },
  "royal-emerald-wedding": {
    title: "The Wedding of Queenie & Edmund",
    hostName: "Queenie Ampofo & Edmund Hastings",
    message: "Palace gates open for an emerald and gold coronation of love.",
    invitationName: "Queenie & Edmund Reign",
    venueName: "Palace Emerald Grand Hall",
    landmark: "East Legon, Accra",
  },
  "midnight-velvet-reception": {
    title: "The Wedding of Isabel & Marcus",
    hostName: "Isabel Laurent & Marcus Webb",
    message: "Curtain rises on navy velvet and silver champagne.",
    invitationName: "Isabel & Marcus Soirée",
    venueName: "The Velvet Room",
    landmark: "Labone, Accra",
    dressCode: "Cocktail · Midnight palette",
  },
  "kente-heritage-union": {
    title: "The Wedding of Akosua & Kwabena",
    hostName: "Akosua Frimpong & Kwabena Anane",
    message: "Cloth unfolds and drums pulse as we witness our heritage union.",
    invitationName: "Akosua & Kwabena Covenant",
    venueName: "Heritage Palace Gardens",
    landmark: "Kumasi",
  },
  "traditional-marriage-ceremony": {
    title: "The Traditional Marriage of Sena & Kwaku",
    hostName: "Sena Adjei & Kwaku Boateng",
    message: "Two families welcome you to a joyful traditional marriage ceremony.",
    invitationName: "Sena & Kwaku Traditional",
    venueName: "Family Courtyard Sample Home",
    landmark: "Community 4, Tema",
    dressCode: "Elegant traditional African wear",
  },
  "forever-afaris-wedding": {
    title: "The Wedding of Amara & Kwame",
    hostName: "Amara Mensah & Kwame Osei",
    message: "We joyfully invite you to witness and celebrate our union.",
    invitationName: "Amara & Kwame Aurora",
    venueName: "Aurora Garden Pavilion",
    landmark: "East Legon, Accra",
    dressCode: "Formal · Soft neutrals and gold",
  },
  "aurelia-editorial-wedding": {
    title: "The Wedding of Selene & Raphael",
    hostName: "Selene Addae & Raphael Quaye",
    message: "Together with their families, Selene and Raphael invite you to an ivory editorial wedding.",
    invitationName: "Selene & Raphael Editorial",
    venueName: "Ivory Atelier Chapel",
    landmark: "Accra",
    dressCode: "Palette for Thursday, elegant formal for Saturday",
    sealInitials: "S & R",
  },
  "seraphine-champagne-wedding": {
    title: "The Wedding of Nhyira & Elikem",
    hostName: "Nhyira Owusu & Elikem Tetteh",
    message: "Together with their families, Nhyira and Elikem invite you to a champagne editorial wedding.",
    invitationName: "Nhyira & Elikem Seraphine",
    venueName: "Champagne Garden House",
    landmark: "West Legon",
    dressCode: "Kente or white with a touch of green, then bright airy wedding colours",
    sealInitials: "N & E",
  },
  "floral-garden-romance": {
    title: "The Wedding of Hannah & David",
    hostName: "Hannah Cole & David Addo",
    message: "Garden romance blooms in a cinematic grove of roses.",
    invitationName: "Hannah & David Promise",
    venueName: "Petal Grove Estate",
    landmark: "Aburi hills",
  },
  "passport-destination-wedding": {
    title: "The Wedding of Zuri & Ethan",
    hostName: "Zuri Adeyemi & Ethan Moore",
    message: "Boarding now for a destination wedding at golden hour.",
    invitationName: "Zuri & Ethan Horizon",
    venueName: "Sunset Deck Pavilion",
    landmark: "Stone Town coast",
  },
  "crystal-acrylic-luxury": {
    title: "The Wedding of Vivian & Oliver",
    hostName: "Vivian Steele & Oliver Grant",
    message: "Glass shimmer, champagne gold and crystal vows.",
    invitationName: "Vivian & Oliver Crystal",
    venueName: "The Prism Gallery",
    landmark: "Airport Residential, Accra",
  },
  "golden-islamic-nikkah": {
    title: "The Nikkah of Fatima & Hassan",
    hostName: "Fatima Al Rashid & Hassan Sulemana",
    message: "With blessings we invite you to our ornamental nikkah.",
    invitationName: "Fatima & Hassan Nikkah",
    venueName: "Ornamental Palace Hall",
    landmark: "Accra Central",
  },
  "memorial-candle-tribute": {
    title: "In Loving Memory of Joseph Atta Danso",
    hostName: "The Danso Family",
    message: "Gather with us in candlelight to honour a faithful life.",
    invitationName: "Joseph Danso Memorial",
    venueName: "Sample Cathedral Chapel",
    landmark: "High Street, Accra",
  },
  "neon-celebration-party": {
    title: "Nia's Electric Birthday Night",
    hostName: "Nia Adom",
    message: "Neon lights, bass drops and birthday energy all night.",
    invitationName: "Nia Electric Pulse",
    venueName: "Pulse Nightclub",
    landmark: "Osu, Accra",
    dressCode: "Neon · Street luxe",
  },
  "corporate-prestige-summit": {
    title: "Platinum Summit 2027",
    hostName: "West Africa Business Council",
    message: "Executive briefing, keynote and platinum networking.",
    invitationName: "Platinum Summit",
    venueName: "Platinum Civic Centre",
    landmark: "Accra",
    dressCode: "Business formal",
  },
  "luxury-fashion-flagship": {
    title: "Flagship Opening",
    hostName: "THE HOUSE",
    message: "A quiet house. A first light. You are invited to the flagship unveiling.",
    invitationName: "Flagship Opening",
    venueName: "The House",
    landmark: "",
    dressCode: "Atelier dress",
    sealInitials: "H",
  },
  "femmora-flagship-soft-opening": {
    title: "Soft Opening",
    hostName: "FEMMORA",
    message: "A quiet house. A first light. You are invited to the Femmora flagship unveiling.",
    invitationName: "Femmora Soft Opening",
    venueName: "FEMMORA GH",
    landmark: "Westlands",
    dressCode: "Atelier dress",
    sealInitials: "F",
  },
  "custom-media": {
    title: "The Sarpong Family Premiere",
    hostName: "The Sarpong Circle",
    message: "Your artwork and video, framed for a private premiere.",
    invitationName: "Sarpong Canvas Premiere",
    venueName: "Private Gallery Residence",
    landmark: "Cantonments, Accra",
  },
  "gilded-opulence-pages": {
    title: "The Wedding of Camille & Theo",
    hostName: "Camille Boateng & Theo Nkrumah",
    message: "Turn gilded pages as our forever begins.",
    invitationName: "Camille & Theo Gallery",
    venueName: "The Gold Leaf Conservatory",
    landmark: "Ridge, Accra",
  },
  "emerald-cathedral": {
    title: "The Wedding of Imani & Julian",
    hostName: "Imani Quaye & Julian Frempong",
    message: "Walk the emerald aisle beneath drifting vines.",
    invitationName: "Imani & Julian Cathedral",
    venueName: "Emerald Nave Gardens",
    landmark: "Christiansborg",
  },
  "kente-royale-pages": {
    title: "The Wedding of Afia & Kwesi",
    hostName: "Afia Sarpong & Kwesi Owusu",
    message: "Gold foil and royal kente welcome you to our celebration.",
    invitationName: "Afia & Kwesi Royale",
    venueName: "Banquet of Kings Hall",
    landmark: "Kumasi",
  },
  "gilded-vows": {
    title: "The Wedding of Elise & Nathan",
    hostName: "Elise Addo & Nathan Quartey",
    message: "A foil letter unfolds with our vows.",
    invitationName: "Elise & Nathan Gilded",
    venueName: "Ivory Library Hall",
    landmark: "Accra",
  },
  "emerald-promise": {
    title: "The Wedding of Maya & Gabriel",
    hostName: "Maya Ansah & Gabriel Tetteh",
    message: "Under starlight we seal our promise.",
    invitationName: "Maya & Gabriel Emerald",
    venueName: "Observatory Terrace",
    landmark: "Legon",
  },
  "kente-court": {
    title: "The Wedding of Akua & Fiifi",
    hostName: "Akua Poku & Fiifi Badu",
    message: "Drum pulse and joyful colour open our day.",
    invitationName: "Akua & Fiifi Kente Joy",
    venueName: "Heritage Courtyard",
    landmark: "Cape Coast",
  },
  "candlelight-farewell": {
    title: "Celebration of Life for Akua Dwemoh",
    hostName: "The Dwemoh Family",
    message: "A quiet chapel light in remembrance.",
    invitationName: "Akua Dwemoh Farewell",
    venueName: "Grace Chapel Sample",
    landmark: "Tema",
  },
  "white-lily-rest": {
    title: "In Memory of Daniel Okyere",
    hostName: "The Okyere Family",
    message: "Ivory stillness and lily motifs for a gentle farewell.",
    invitationName: "Daniel Okyere Rest",
    venueName: "Peace Gardens Sample",
    landmark: "Madina",
  },
  "royal-mourning-lite": {
    title: "Funeral Rites for Nana Kwaku Asante",
    hostName: "The Asante Family",
    message: "Black, red and white honour a life of dignity.",
    invitationName: "Nana Asante Rites",
    venueName: "Family House Sample Yard",
    landmark: "Kumasi",
  },
  "candlelight-elegy-pages": {
    title: "Tribute for Elom Kofi Addo",
    hostName: "The Addo Family",
    message: "Chapters of light for a life of service.",
    invitationName: "Elom Addo Tribute",
    venueName: "University Chapel Sample",
    landmark: "Legon",
  },
  "white-lily-memorial-pages": {
    title: "Memorial for Grace Osei",
    hostName: "The Osei Children",
    message: "A full memorial journey in serene ivory.",
    invitationName: "Grace Osei Tribute",
    venueName: "Lily Hall Sample",
    landmark: "Accra",
  },
  "royal-mourning-pages": {
    title: "Final Rites for Nana Yaa Dufie",
    hostName: "The Royal House of Dufie",
    message: "The full black red white rite with family pages.",
    invitationName: "Nana Yaa Dufie Rites",
    venueName: "Palace Forecourt Sample",
    landmark: "Ashanti Region",
  },
  "black-red-cloth-rite": {
    title: "Funeral Rites for Nana Kwaku Agyeman",
    hostName: "The Agyeman Family",
    message: "The family invites you to honour a life of dignity in black and red cloth.",
    invitationName: "Nana Agyeman Rites",
    venueName: "Family House Courtyard Sample",
    landmark: "Kumasi",
    dressCode: "Black and red mourning cloth",
  },
  "white-cloth-homegoing": {
    title: "Homegoing Celebration for Efua Nyarko",
    hostName: "The Nyarko Family and Church Board",
    message: "Join us in white cloth thanksgiving for a life of faith and service.",
    invitationName: "Efua Nyarko Homegoing",
    venueName: "Sample Homegoing Church",
    landmark: "Accra New Town",
    dressCode: "Black and white or white cloth",
  },
  "kente-border-farewell": {
    title: "Final Funeral Rites for Nana Afia Serwaa",
    hostName: "The Serwaa Royal Household",
    message: "With heritage and honour we invite you to the farewell.",
    invitationName: "Nana Afia Serwaa Farewell",
    venueName: "Banquet of Honour Grounds Sample",
    landmark: "Manhyia, Kumasi",
    dressCode: "Black red white with kente accents welcome",
  },
  "one-week-vigil-notice": {
    title: "One Week Observance for Kwesi Sarpong",
    hostName: "The Sarpong Family",
    message: "You are invited to the one week vigil, wake keeping and burial programme.",
    invitationName: "Kwesi Sarpong One Week",
    venueName: "Family Residence then Community Park",
    landmark: "Tema Community 8",
    dressCode: "Dark colours for vigil, mourning cloth for burial",
  },
  "pastel-balloon-garden": {
    title: "Aba's Pastel Balloon Birthday",
    hostName: "Aba Yankson",
    message: "Come float through pastel balloons, cake and garden light with us.",
    invitationName: "Aba Pastel Balloon",
    venueName: "Sky Garden Pavilion",
    landmark: "Airport Residential, Accra",
    dressCode: "Pastels and soft florals welcome",
  },
  "gold-glam-milestone": {
    title: "Kofi's Gold Glam Thirty",
    hostName: "Kofi Darku",
    message: "Champagne gold and pink seal glam for a milestone birthday night.",
    invitationName: "Kofi Gold Glam",
    venueName: "Gold Terrace Ballroom",
    landmark: "Ridge, Accra",
    dressCode: "Black tie with gold accents",
  },
  "concert-night-bash": {
    title: "Zuri's Concert Night Bash",
    hostName: "Zuri Mensima",
    message: "Stage lights, ticket energy and birthday bass until late.",
    invitationName: "Zuri Concert Bash",
    venueName: "Harbour Stage Club",
    landmark: "Jamestown, Accra",
    dressCode: "Concert glam, neon welcome",
  },
  "surprise-gift-soiree": {
    title: "Surprise Soiree for Efua",
    hostName: "The Quartey Circle",
    message: "A warm surprise gift soiree for Efua with soft lights and laughter.",
    invitationName: "Efua Surprise Soiree",
    venueName: "Private Courtyard Lounge",
    landmark: "Cantonments, Accra",
    dressCode: "Smart casual, soft gold welcome",
  },
  "executive-boardroom-brief": {
    title: "Q3 Leadership Boardroom Brief",
    hostName: "Northridge Executive Office",
    message: "Join the closed boardroom briefing for strategy, speakers and decisions.",
    invitationName: "Leadership Boardroom Brief",
    venueName: "Northridge Tower Boardroom",
    landmark: "Airport City, Accra",
    dressCode: "Business formal",
  },
  "product-launch-pulse": {
    title: "Pulse Product Launch Night",
    hostName: "Pulse Studio Team",
    message: "Be first in the room for the Pulse product unveil and media grid night.",
    invitationName: "Pulse Product Launch",
    venueName: "Innovation Hall Stage",
    landmark: "Accra Digital Centre",
    dressCode: "Smart creative, teal accents welcome",
  },
  "investor-night-pass": {
    title: "West Africa Investor Night",
    hostName: "Horizon Capital Partners",
    message: "Present your pass for an evening of pitches, capital and quiet networking.",
    invitationName: "Investor Night Pass",
    venueName: "The Ledger Lounge",
    landmark: "Ridge, Accra",
    dressCode: "Black tie optional, dark tones",
  },
  "keynote-agenda-flip": {
    title: "Accra Keynote Summit Agenda",
    hostName: "Accra Keynote Bureau",
    message: "Flip through the keynote agenda, speaker lineup and session calendar.",
    invitationName: "Keynote Agenda Flip",
    venueName: "National Theatre Conference Wing",
    landmark: "Accra",
    dressCode: "Business formal",
  },
};

/** Strip every dash/hyphen from guest-facing catalogue copy. */
export function withoutCatalogDashes(value?: string | null): string {
  if (!value) return "";
  return value
    .replace(/\s*[—–‐‑‒―−]\s*/g, ". ")
    .replace(/(\w)\s+-\s+(\w)/g, "$1. $2")
    .replace(/-/g, " ")
    .replace(/\.\s*\./g, ".")
    .replace(/\. ([a-z])/g, (_m, ch: string) => `. ${ch.toUpperCase()}`)
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

export function applyPublicCatalogCopy(template: CatalogTemplate): CatalogTemplate {
  const copy = PUBLIC_CATALOG_COPY[template.slug];
  if (!copy) {
    return {
      ...template,
      name: withoutCatalogDashes(template.name),
      description: withoutCatalogDashes(template.description),
      style: withoutCatalogDashes(template.style) as CatalogTemplate["style"],
    };
  }
  return {
    ...template,
    name: withoutCatalogDashes(copy.name),
    description: withoutCatalogDashes(copy.description),
    style: withoutCatalogDashes(copy.style) as CatalogTemplate["style"],
  };
}
