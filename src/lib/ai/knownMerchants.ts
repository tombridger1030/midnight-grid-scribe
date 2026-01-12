/**
 * Known Merchant Patterns Database
 *
 * Maps credit card statement patterns to clean vendor names.
 * Used as Layer 1 of the 3-layer vendor detection system.
 */

export type MerchantCategory =
  | "entertainment"
  | "productivity"
  | "shopping"
  | "food"
  | "transportation"
  | "utilities"
  | "health"
  | "finance"
  | "education"
  | "lifestyle"
  | "gaming"
  | "news"
  | "other";

export interface MerchantPattern {
  pattern: string;
  name?: string;
  category?: MerchantCategory;
  extractVendor?: boolean; // For payment processors - extract the actual vendor after the prefix
  isSubscription?: boolean; // Likely a subscription service
}

/**
 * Payment processor prefixes that wrap the actual vendor
 * These require special handling to extract the real vendor name
 */
export const PAYMENT_PROCESSOR_PREFIXES: MerchantPattern[] = [
  { pattern: "PAYPAL *", extractVendor: true },
  { pattern: "PP*", extractVendor: true },
  { pattern: "SQ *", extractVendor: true },
  { pattern: "SQC*", extractVendor: true },
  { pattern: "SQUARE *", extractVendor: true },
  { pattern: "STRIPE *", extractVendor: true },
  { pattern: "GUMROAD *", extractVendor: true },
  { pattern: "PADDLE *", extractVendor: true },
  { pattern: "LEMONSQUEEZY *", extractVendor: true },
  { pattern: "GOCARDLESS *", extractVendor: true },
  { pattern: "BRAINTREE *", extractVendor: true },
  { pattern: "SHOPIFY *", extractVendor: true },
  { pattern: "WIX *", extractVendor: true },
  { pattern: "2CO *", extractVendor: true }, // 2Checkout
  { pattern: "DRI*", extractVendor: true }, // Digital River
  { pattern: "FS *", extractVendor: true }, // FastSpring
  { pattern: "CLOVER *", extractVendor: true },
  { pattern: "VENMO *", extractVendor: true },
  { pattern: "ZELLE *", extractVendor: true },
  { pattern: "ETRANSFER *", extractVendor: true },
];

/**
 * Known subscription and merchant patterns
 * Organized by category for maintainability
 */
export const KNOWN_MERCHANTS: MerchantPattern[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // STREAMING & ENTERTAINMENT
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: "NETFLIX",
    name: "Netflix",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "HULU",
    name: "Hulu",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "DISNEY PLUS",
    name: "Disney+",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "DISNEYPLUS",
    name: "Disney+",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "HBO MAX",
    name: "Max",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "HBOMAX",
    name: "Max",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "PRIME VIDEO",
    name: "Prime Video",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "AMAZON PRIME",
    name: "Amazon Prime",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "AMZN PRIME",
    name: "Amazon Prime",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "PEACOCK",
    name: "Peacock",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "PARAMOUNT+",
    name: "Paramount+",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "PARAMOUNTPLUS",
    name: "Paramount+",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "APPLE TV",
    name: "Apple TV+",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "CRAVE",
    name: "Crave",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "MUBI",
    name: "MUBI",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "CRITERION",
    name: "Criterion Channel",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "CRUNCHYROLL",
    name: "Crunchyroll",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "FUNIMATION",
    name: "Funimation",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "DAZN",
    name: "DAZN",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "ESPN+",
    name: "ESPN+",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "ESPNPLUS",
    name: "ESPN+",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "FUBO",
    name: "FuboTV",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "SLING",
    name: "Sling TV",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "YOUTUBE TV",
    name: "YouTube TV",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "YOUTUBE PREMIUM",
    name: "YouTube Premium",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "YOUTUBE MUSIC",
    name: "YouTube Music",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "YOUTUBE.COM",
    name: "YouTube",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "TWITCH",
    name: "Twitch",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "CURIOSITY STREAM",
    name: "CuriosityStream",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "NEBULA",
    name: "Nebula",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "FLOATPLANE",
    name: "Floatplane",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "BRITBOX",
    name: "BritBox",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "ACORN TV",
    name: "Acorn TV",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "AMC+",
    name: "AMC+",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "SHUDDER",
    name: "Shudder",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "MASTERCLASS",
    name: "MasterClass",
    category: "education",
    isSubscription: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MUSIC & AUDIO
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: "SPOTIFY",
    name: "Spotify",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "SP *",
    name: "Spotify",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "APPLE MUSIC",
    name: "Apple Music",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "TIDAL",
    name: "Tidal",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "DEEZER",
    name: "Deezer",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "AMAZON MUSIC",
    name: "Amazon Music",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "PANDORA",
    name: "Pandora",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "AUDIBLE",
    name: "Audible",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "SOUNDCLOUD",
    name: "SoundCloud",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "POCKET CASTS",
    name: "Pocket Casts",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "OVERCAST",
    name: "Overcast",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "STITCHER",
    name: "Stitcher",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "LUMINARY",
    name: "Luminary",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "SIRIUS",
    name: "SiriusXM",
    category: "entertainment",
    isSubscription: true,
  },
  {
    pattern: "SIRIUSXM",
    name: "SiriusXM",
    category: "entertainment",
    isSubscription: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GAMING
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: "XBOX", name: "Xbox", category: "gaming", isSubscription: true },
  {
    pattern: "MICROSOFT XBOX",
    name: "Xbox",
    category: "gaming",
    isSubscription: true,
  },
  {
    pattern: "GAME PASS",
    name: "Xbox Game Pass",
    category: "gaming",
    isSubscription: true,
  },
  {
    pattern: "PLAYSTATION",
    name: "PlayStation",
    category: "gaming",
    isSubscription: true,
  },
  {
    pattern: "PSN*",
    name: "PlayStation",
    category: "gaming",
    isSubscription: true,
  },
  {
    pattern: "SONY PLAYSTATION",
    name: "PlayStation",
    category: "gaming",
    isSubscription: true,
  },
  {
    pattern: "NINTENDO",
    name: "Nintendo",
    category: "gaming",
    isSubscription: true,
  },
  { pattern: "STEAM", name: "Steam", category: "gaming" },
  { pattern: "STEAMGAMES", name: "Steam", category: "gaming" },
  { pattern: "EPIC GAMES", name: "Epic Games", category: "gaming" },
  {
    pattern: "EA.COM",
    name: "EA Games",
    category: "gaming",
    isSubscription: true,
  },
  {
    pattern: "ELECTRONIC ARTS",
    name: "EA Games",
    category: "gaming",
    isSubscription: true,
  },
  { pattern: "UBISOFT", name: "Ubisoft", category: "gaming" },
  {
    pattern: "BLIZZARD",
    name: "Blizzard",
    category: "gaming",
    isSubscription: true,
  },
  { pattern: "ACTIVISION", name: "Activision", category: "gaming" },
  { pattern: "ROBLOX", name: "Roblox", category: "gaming" },
  { pattern: "RIOT GAMES", name: "Riot Games", category: "gaming" },
  {
    pattern: "HUMBLE BUNDLE",
    name: "Humble Bundle",
    category: "gaming",
    isSubscription: true,
  },
  { pattern: "ITCH.IO", name: "itch.io", category: "gaming" },
  { pattern: "GOG.COM", name: "GOG", category: "gaming" },
  {
    pattern: "DISCORD",
    name: "Discord Nitro",
    category: "gaming",
    isSubscription: true,
  },
  {
    pattern: "GEFORCE NOW",
    name: "GeForce NOW",
    category: "gaming",
    isSubscription: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCTIVITY & SOFTWARE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: "CHATGPT",
    name: "ChatGPT Plus",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "OPENAI",
    name: "OpenAI",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "CLAUDE",
    name: "Claude Pro",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "ANTHROPIC",
    name: "Anthropic",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "PERPLEXITY",
    name: "Perplexity",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "GITHUB",
    name: "GitHub",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "GITLAB",
    name: "GitLab",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "NOTION",
    name: "Notion",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "FIGMA",
    name: "Figma",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "CANVA",
    name: "Canva",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "ADOBE",
    name: "Adobe",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "CREATIVE CLOUD",
    name: "Adobe Creative Cloud",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "MICROSOFT 365",
    name: "Microsoft 365",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "OFFICE 365",
    name: "Microsoft 365",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "MSFT *",
    name: "Microsoft",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "MSBILL",
    name: "Microsoft",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "GOOGLE WORKSPACE",
    name: "Google Workspace",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "GOOGLE ONE",
    name: "Google One",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "GOOGLE STORAGE",
    name: "Google One",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "DROPBOX",
    name: "Dropbox",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "ICLOUD",
    name: "iCloud+",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "APPLE.COM/BILL",
    name: "Apple Services",
    category: "productivity",
    isSubscription: true,
  },
  { pattern: "APPLE.COM", name: "Apple", category: "productivity" },
  {
    pattern: "SLACK",
    name: "Slack",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "ZOOM",
    name: "Zoom",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "ZOOM.US",
    name: "Zoom",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "WEBEX",
    name: "Webex",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "LOOM",
    name: "Loom",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "CALENDLY",
    name: "Calendly",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "ASANA",
    name: "Asana",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "TRELLO",
    name: "Trello",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "MONDAY.COM",
    name: "Monday.com",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "CLICKUP",
    name: "ClickUp",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "LINEAR",
    name: "Linear",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "JIRA",
    name: "Jira",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "ATLASSIAN",
    name: "Atlassian",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "CONFLUENCE",
    name: "Confluence",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "AIRTABLE",
    name: "Airtable",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "EVERNOTE",
    name: "Evernote",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "TODOIST",
    name: "Todoist",
    category: "productivity",
    isSubscription: true,
  },
  { pattern: "THINGS", name: "Things", category: "productivity" },
  {
    pattern: "BEAR",
    name: "Bear",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "OBSIDIAN",
    name: "Obsidian",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "ROAM",
    name: "Roam Research",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "GRAMMARLY",
    name: "Grammarly",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "JASPER",
    name: "Jasper AI",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "COPY.AI",
    name: "Copy.ai",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "MIDJOURNEY",
    name: "Midjourney",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "RUNWAY",
    name: "Runway",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "DESCRIPT",
    name: "Descript",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "INVIDEO",
    name: "InVideo",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "VIMEO",
    name: "Vimeo",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "WISTIA",
    name: "Wistia",
    category: "productivity",
    isSubscription: true,
  },
  { pattern: "CLEANSHOT", name: "CleanShot X", category: "productivity" },
  {
    pattern: "SETAPP",
    name: "Setapp",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "1PASSWORD",
    name: "1Password",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "LASTPASS",
    name: "LastPass",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "BITWARDEN",
    name: "Bitwarden",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "DASHLANE",
    name: "Dashlane",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "NORDPASS",
    name: "NordPass",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "EXPRESSVPN",
    name: "ExpressVPN",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "NORDVPN",
    name: "NordVPN",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "SURFSHARK",
    name: "Surfshark",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "PROTONVPN",
    name: "ProtonVPN",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "PROTON",
    name: "Proton",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "SUPERHUMAN",
    name: "Superhuman",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "HEY.COM",
    name: "HEY",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "MAILCHIMP",
    name: "Mailchimp",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "CONVERTKIT",
    name: "ConvertKit",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "SUBSTACK",
    name: "Substack",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "BEEHIIV",
    name: "beehiiv",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "BUTTONDOWN",
    name: "Buttondown",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "VERCEL",
    name: "Vercel",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "NETLIFY",
    name: "Netlify",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "HEROKU",
    name: "Heroku",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "DIGITALOCEAN",
    name: "DigitalOcean",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "LINODE",
    name: "Linode",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "AWS",
    name: "Amazon Web Services",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "AMAZON WEB",
    name: "Amazon Web Services",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "GOOGLE CLOUD",
    name: "Google Cloud",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "CLOUDFLARE",
    name: "Cloudflare",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "NAMECHEAP",
    name: "Namecheap",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "GODADDY",
    name: "GoDaddy",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "SQUARESPACE",
    name: "Squarespace",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "WEBFLOW",
    name: "Webflow",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "FRAMER",
    name: "Framer",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "WORDPRESS",
    name: "WordPress",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "GHOST",
    name: "Ghost",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "MEMBERFUL",
    name: "Memberful",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "PATREON",
    name: "Patreon",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "KOFI",
    name: "Ko-fi",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "KO-FI",
    name: "Ko-fi",
    category: "productivity",
    isSubscription: true,
  },
  { pattern: "GUMROAD", name: "Gumroad", category: "productivity" },
  {
    pattern: "TEACHABLE",
    name: "Teachable",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "THINKIFIC",
    name: "Thinkific",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "KAJABI",
    name: "Kajabi",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "PODIA",
    name: "Podia",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "CIRCLE.SO",
    name: "Circle",
    category: "productivity",
    isSubscription: true,
  },
  {
    pattern: "SKOOL",
    name: "Skool",
    category: "productivity",
    isSubscription: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // E-COMMERCE & SHOPPING
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: "AMAZON", name: "Amazon", category: "shopping" },
  { pattern: "AMZN", name: "Amazon", category: "shopping" },
  { pattern: "AMZN MKTP", name: "Amazon", category: "shopping" },
  { pattern: "WALMART", name: "Walmart", category: "shopping" },
  { pattern: "TARGET", name: "Target", category: "shopping" },
  { pattern: "COSTCO", name: "Costco", category: "shopping" },
  { pattern: "BEST BUY", name: "Best Buy", category: "shopping" },
  { pattern: "BESTBUY", name: "Best Buy", category: "shopping" },
  { pattern: "EBAY", name: "eBay", category: "shopping" },
  { pattern: "ETSY", name: "Etsy", category: "shopping" },
  { pattern: "ALIEXPRESS", name: "AliExpress", category: "shopping" },
  { pattern: "WISH.COM", name: "Wish", category: "shopping" },
  { pattern: "SHEIN", name: "Shein", category: "shopping" },
  { pattern: "TEMU", name: "Temu", category: "shopping" },
  { pattern: "WAYFAIR", name: "Wayfair", category: "shopping" },
  { pattern: "IKEA", name: "IKEA", category: "shopping" },
  { pattern: "HOME DEPOT", name: "Home Depot", category: "shopping" },
  { pattern: "LOWES", name: "Lowe's", category: "shopping" },
  { pattern: "APPLE STORE", name: "Apple Store", category: "shopping" },
  { pattern: "APPLE RETAIL", name: "Apple Store", category: "shopping" },
  { pattern: "SAMSUNG", name: "Samsung", category: "shopping" },

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOD & DELIVERY
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: "UBER EATS", name: "Uber Eats", category: "food" },
  { pattern: "UBEREATS", name: "Uber Eats", category: "food" },
  { pattern: "DOORDASH", name: "DoorDash", category: "food" },
  { pattern: "GRUBHUB", name: "Grubhub", category: "food" },
  { pattern: "POSTMATES", name: "Postmates", category: "food" },
  { pattern: "SKIP THE DISHES", name: "SkipTheDishes", category: "food" },
  { pattern: "SKIPTHEDISHES", name: "SkipTheDishes", category: "food" },
  { pattern: "INSTACART", name: "Instacart", category: "food" },
  {
    pattern: "BLUE APRON",
    name: "Blue Apron",
    category: "food",
    isSubscription: true,
  },
  {
    pattern: "HELLOFRESH",
    name: "HelloFresh",
    category: "food",
    isSubscription: true,
  },
  {
    pattern: "HELLO FRESH",
    name: "HelloFresh",
    category: "food",
    isSubscription: true,
  },
  {
    pattern: "FRESHLY",
    name: "Freshly",
    category: "food",
    isSubscription: true,
  },
  { pattern: "FACTOR", name: "Factor", category: "food", isSubscription: true },
  {
    pattern: "DAILY HARVEST",
    name: "Daily Harvest",
    category: "food",
    isSubscription: true,
  },
  { pattern: "STARBUCKS", name: "Starbucks", category: "food" },
  { pattern: "MCDONALDS", name: "McDonald's", category: "food" },
  { pattern: "MCDONALD'S", name: "McDonald's", category: "food" },
  { pattern: "CHICK-FIL-A", name: "Chick-fil-A", category: "food" },
  { pattern: "CHIPOTLE", name: "Chipotle", category: "food" },
  { pattern: "PANERA", name: "Panera Bread", category: "food" },
  { pattern: "DUNKIN", name: "Dunkin'", category: "food" },
  { pattern: "TIM HORTONS", name: "Tim Hortons", category: "food" },
  { pattern: "TIMS", name: "Tim Hortons", category: "food" },

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSPORTATION & RIDESHARE
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: "UBER", name: "Uber", category: "transportation" },
  { pattern: "LYFT", name: "Lyft", category: "transportation" },
  { pattern: "BIRD", name: "Bird", category: "transportation" },
  { pattern: "LIME", name: "Lime", category: "transportation" },
  { pattern: "SHELL", name: "Shell", category: "transportation" },
  { pattern: "CHEVRON", name: "Chevron", category: "transportation" },
  { pattern: "EXXON", name: "Exxon", category: "transportation" },
  { pattern: "BP", name: "BP", category: "transportation" },
  { pattern: "PETRO-CANADA", name: "Petro-Canada", category: "transportation" },
  { pattern: "ESSO", name: "Esso", category: "transportation" },
  { pattern: "MOBIL", name: "Mobil", category: "transportation" },
  { pattern: "SUNOCO", name: "Sunoco", category: "transportation" },
  { pattern: "TESLA", name: "Tesla", category: "transportation" },
  { pattern: "CHARGEPOINT", name: "ChargePoint", category: "transportation" },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH & FITNESS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: "PELOTON",
    name: "Peloton",
    category: "health",
    isSubscription: true,
  },
  {
    pattern: "FITBIT",
    name: "Fitbit Premium",
    category: "health",
    isSubscription: true,
  },
  {
    pattern: "STRAVA",
    name: "Strava",
    category: "health",
    isSubscription: true,
  },
  {
    pattern: "MYFITNESSPAL",
    name: "MyFitnessPal",
    category: "health",
    isSubscription: true,
  },
  { pattern: "NOOM", name: "Noom", category: "health", isSubscription: true },
  { pattern: "CALM", name: "Calm", category: "health", isSubscription: true },
  {
    pattern: "HEADSPACE",
    name: "Headspace",
    category: "health",
    isSubscription: true,
  },
  {
    pattern: "APPLE FITNESS",
    name: "Apple Fitness+",
    category: "health",
    isSubscription: true,
  },
  {
    pattern: "NIKE TRAINING",
    name: "Nike Training Club",
    category: "health",
    isSubscription: true,
  },
  {
    pattern: "CLASSPASS",
    name: "ClassPass",
    category: "health",
    isSubscription: true,
  },
  { pattern: "WHOOP", name: "Whoop", category: "health", isSubscription: true },
  {
    pattern: "OURA",
    name: "Oura Ring",
    category: "health",
    isSubscription: true,
  },
  {
    pattern: "EQUINOX",
    name: "Equinox",
    category: "health",
    isSubscription: true,
  },
  {
    pattern: "PLANET FITNESS",
    name: "Planet Fitness",
    category: "health",
    isSubscription: true,
  },
  {
    pattern: "LA FITNESS",
    name: "LA Fitness",
    category: "health",
    isSubscription: true,
  },
  {
    pattern: "24 HOUR FITNESS",
    name: "24 Hour Fitness",
    category: "health",
    isSubscription: true,
  },
  {
    pattern: "GOODLIFE",
    name: "GoodLife Fitness",
    category: "health",
    isSubscription: true,
  },
  {
    pattern: "ANYTIME FITNESS",
    name: "Anytime Fitness",
    category: "health",
    isSubscription: true,
  },
  {
    pattern: "ORANGETHEORY",
    name: "Orangetheory",
    category: "health",
    isSubscription: true,
  },
  {
    pattern: "CROSSFIT",
    name: "CrossFit",
    category: "health",
    isSubscription: true,
  },
  { pattern: "YMCA", name: "YMCA", category: "health", isSubscription: true },
  {
    pattern: "BETTERHELP",
    name: "BetterHelp",
    category: "health",
    isSubscription: true,
  },
  {
    pattern: "TALKSPACE",
    name: "Talkspace",
    category: "health",
    isSubscription: true,
  },
  {
    pattern: "CEREBRAL",
    name: "Cerebral",
    category: "health",
    isSubscription: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NEWS & MEDIA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: "NEW YORK TIMES",
    name: "New York Times",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "NYT",
    name: "New York Times",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "NYTIMES",
    name: "New York Times",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "WALL STREET JOURNAL",
    name: "Wall Street Journal",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "WSJ",
    name: "Wall Street Journal",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "WASHINGTON POST",
    name: "Washington Post",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "WAPO",
    name: "Washington Post",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "THE ATLANTIC",
    name: "The Atlantic",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "THE ECONOMIST",
    name: "The Economist",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "BLOOMBERG",
    name: "Bloomberg",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "REUTERS",
    name: "Reuters",
    category: "news",
    isSubscription: true,
  },
  { pattern: "MEDIUM", name: "Medium", category: "news", isSubscription: true },
  { pattern: "WIRED", name: "Wired", category: "news", isSubscription: true },
  {
    pattern: "THE VERGE",
    name: "The Verge",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "APPLE NEWS",
    name: "Apple News+",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "GLOBE AND MAIL",
    name: "The Globe and Mail",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "NATIONAL POST",
    name: "National Post",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "TORONTO STAR",
    name: "Toronto Star",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "THE GUARDIAN",
    name: "The Guardian",
    category: "news",
    isSubscription: true,
  },
  { pattern: "BBC", name: "BBC", category: "news", isSubscription: true },
  {
    pattern: "FINANCIAL TIMES",
    name: "Financial Times",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "BARRONS",
    name: "Barron's",
    category: "news",
    isSubscription: true,
  },
  { pattern: "FORBES", name: "Forbes", category: "news", isSubscription: true },
  {
    pattern: "FORTUNE",
    name: "Fortune",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "THE NEW YORKER",
    name: "The New Yorker",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "THE RINGER",
    name: "The Ringer",
    category: "news",
    isSubscription: true,
  },
  {
    pattern: "THE ATHLETIC",
    name: "The Athletic",
    category: "news",
    isSubscription: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EDUCATION & LEARNING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: "COURSERA",
    name: "Coursera",
    category: "education",
    isSubscription: true,
  },
  { pattern: "UDEMY", name: "Udemy", category: "education" },
  {
    pattern: "LINKEDIN LEARNING",
    name: "LinkedIn Learning",
    category: "education",
    isSubscription: true,
  },
  {
    pattern: "SKILLSHARE",
    name: "Skillshare",
    category: "education",
    isSubscription: true,
  },
  {
    pattern: "BRILLIANT",
    name: "Brilliant",
    category: "education",
    isSubscription: true,
  },
  {
    pattern: "DUOLINGO",
    name: "Duolingo",
    category: "education",
    isSubscription: true,
  },
  {
    pattern: "BABBEL",
    name: "Babbel",
    category: "education",
    isSubscription: true,
  },
  {
    pattern: "ROSETTA STONE",
    name: "Rosetta Stone",
    category: "education",
    isSubscription: true,
  },
  {
    pattern: "CODECADEMY",
    name: "Codecademy",
    category: "education",
    isSubscription: true,
  },
  {
    pattern: "DATACAMP",
    name: "DataCamp",
    category: "education",
    isSubscription: true,
  },
  {
    pattern: "PLURALSIGHT",
    name: "Pluralsight",
    category: "education",
    isSubscription: true,
  },
  {
    pattern: "OREILLY",
    name: "O'Reilly",
    category: "education",
    isSubscription: true,
  },
  {
    pattern: "SAFARI BOOKS",
    name: "O'Reilly Safari",
    category: "education",
    isSubscription: true,
  },
  {
    pattern: "BLINKIST",
    name: "Blinkist",
    category: "education",
    isSubscription: true,
  },
  {
    pattern: "SCRIBD",
    name: "Scribd",
    category: "education",
    isSubscription: true,
  },
  {
    pattern: "KINDLE UNLIMITED",
    name: "Kindle Unlimited",
    category: "education",
    isSubscription: true,
  },
  { pattern: "LIBBY", name: "Libby", category: "education" },
  {
    pattern: "CHEGG",
    name: "Chegg",
    category: "education",
    isSubscription: true,
  },
  {
    pattern: "QUIZLET",
    name: "Quizlet",
    category: "education",
    isSubscription: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FINANCE & INVESTING
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: "WEALTHSIMPLE", name: "Wealthsimple", category: "finance" },
  { pattern: "QUESTRADE", name: "Questrade", category: "finance" },
  {
    pattern: "INTERACTIVE BROKERS",
    name: "Interactive Brokers",
    category: "finance",
  },
  { pattern: "ROBINHOOD", name: "Robinhood", category: "finance" },
  { pattern: "FIDELITY", name: "Fidelity", category: "finance" },
  { pattern: "VANGUARD", name: "Vanguard", category: "finance" },
  { pattern: "CHARLES SCHWAB", name: "Charles Schwab", category: "finance" },
  { pattern: "TD AMERITRADE", name: "TD Ameritrade", category: "finance" },
  { pattern: "ETRADE", name: "E*TRADE", category: "finance" },
  { pattern: "E*TRADE", name: "E*TRADE", category: "finance" },
  {
    pattern: "ACORNS",
    name: "Acorns",
    category: "finance",
    isSubscription: true,
  },
  { pattern: "BETTERMENT", name: "Betterment", category: "finance" },
  {
    pattern: "PERSONAL CAPITAL",
    name: "Personal Capital",
    category: "finance",
  },
  { pattern: "YNAB", name: "YNAB", category: "finance", isSubscription: true },
  { pattern: "MINT", name: "Mint", category: "finance" },
  {
    pattern: "QUICKBOOKS",
    name: "QuickBooks",
    category: "finance",
    isSubscription: true,
  },
  {
    pattern: "FRESHBOOKS",
    name: "FreshBooks",
    category: "finance",
    isSubscription: true,
  },
  { pattern: "XERO", name: "Xero", category: "finance", isSubscription: true },
  { pattern: "WAVE", name: "Wave", category: "finance" },
  { pattern: "TURBOTAX", name: "TurboTax", category: "finance" },
  { pattern: "H&R BLOCK", name: "H&R Block", category: "finance" },
  { pattern: "CREDIT KARMA", name: "Credit Karma", category: "finance" },
  {
    pattern: "EXPERIAN",
    name: "Experian",
    category: "finance",
    isSubscription: true,
  },
  {
    pattern: "TRANSUNION",
    name: "TransUnion",
    category: "finance",
    isSubscription: true,
  },
  {
    pattern: "EQUIFAX",
    name: "Equifax",
    category: "finance",
    isSubscription: true,
  },
  { pattern: "BORROWELL", name: "Borrowell", category: "finance" },

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES & SERVICES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: "ROGERS",
    name: "Rogers",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "BELL",
    name: "Bell",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "TELUS",
    name: "Telus",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "FREEDOM MOBILE",
    name: "Freedom Mobile",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "FIDO",
    name: "Fido",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "KOODO",
    name: "Koodo",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "VIRGIN MOBILE",
    name: "Virgin Mobile",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "SHAW",
    name: "Shaw",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "VERIZON",
    name: "Verizon",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "AT&T",
    name: "AT&T",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "T-MOBILE",
    name: "T-Mobile",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "SPRINT",
    name: "Sprint",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "COMCAST",
    name: "Comcast Xfinity",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "XFINITY",
    name: "Xfinity",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "SPECTRUM",
    name: "Spectrum",
    category: "utilities",
    isSubscription: true,
  },
  { pattern: "COX", name: "Cox", category: "utilities", isSubscription: true },
  {
    pattern: "HYDRO",
    name: "Hydro",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "ENBRIDGE",
    name: "Enbridge",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "UNION GAS",
    name: "Union Gas",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "FORTIS",
    name: "FortisBC",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "BC HYDRO",
    name: "BC Hydro",
    category: "utilities",
    isSubscription: true,
  },
  {
    pattern: "TORONTO HYDRO",
    name: "Toronto Hydro",
    category: "utilities",
    isSubscription: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFESTYLE & MISC
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: "BIRCHBOX",
    name: "Birchbox",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "IPSY",
    name: "Ipsy",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "FABFITFUN",
    name: "FabFitFun",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "BARK BOX",
    name: "BarkBox",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "BARKBOX",
    name: "BarkBox",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "DOLLAR SHAVE",
    name: "Dollar Shave Club",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "HARRYS",
    name: "Harry's",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "MANSCAPED",
    name: "Manscaped",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "STITCH FIX",
    name: "Stitch Fix",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "STITCHFIX",
    name: "Stitch Fix",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "RENT THE RUNWAY",
    name: "Rent the Runway",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "WINE.COM",
    name: "Wine.com",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "WINC",
    name: "Winc",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "TRADE COFFEE",
    name: "Trade Coffee",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "ATLAS COFFEE",
    name: "Atlas Coffee Club",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "COMETEER",
    name: "Cometeer",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "BOOK OF THE MONTH",
    name: "Book of the Month",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "BOOKCLUB",
    name: "Book Club",
    category: "lifestyle",
    isSubscription: true,
  },
  {
    pattern: "AMAZON SUBSCRIBE",
    name: "Amazon Subscribe & Save",
    category: "lifestyle",
    isSubscription: true,
  },
];

/**
 * Get all patterns including payment processors
 */
export function getAllPatterns(): MerchantPattern[] {
  return [...PAYMENT_PROCESSOR_PREFIXES, ...KNOWN_MERCHANTS];
}

/**
 * Find matching merchant pattern
 */
export function findMerchantPattern(
  description: string,
): MerchantPattern | null {
  const normalized = description.toUpperCase().trim();

  // Check all patterns
  for (const pattern of getAllPatterns()) {
    if (
      normalized.startsWith(pattern.pattern) ||
      normalized.includes(pattern.pattern)
    ) {
      return pattern;
    }
  }

  return null;
}

/**
 * Extract vendor from payment processor prefix
 * e.g., "PAYPAL *ETSY INC" -> "Etsy"
 */
export function extractVendorFromProcessor(
  description: string,
  pattern: MerchantPattern,
): string | null {
  if (!pattern.extractVendor) return null;

  const normalized = description.toUpperCase().trim();
  const prefixMatch = normalized.match(
    new RegExp(`^${pattern.pattern.replace("*", "\\*")}\\s*(.+)`),
  );

  if (prefixMatch && prefixMatch[1]) {
    const vendor = prefixMatch[1]
      .replace(/[*#]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Clean up common suffixes
    return vendor.replace(/\s*(INC|LLC|LTD|CORP|CO|PTY|PLC)\s*$/i, "").trim();
  }

  return null;
}

/**
 * Get category color for display
 */
export function getCategoryColor(category: MerchantCategory): string {
  const colors: Record<MerchantCategory, string> = {
    entertainment: "#FF6B6B",
    productivity: "#4ECDC4",
    shopping: "#5FE3B3",
    food: "#FFD700",
    transportation: "#FFA500",
    utilities: "#9B59B6",
    health: "#26C6DA",
    finance: "#3498DB",
    education: "#42A5F5",
    lifestyle: "#EC407A",
    gaming: "#AB47BC",
    news: "#78909C",
    other: "#95A5A6",
  };
  return colors[category] || colors.other;
}

/**
 * Get category label for display
 */
export function getCategoryLabel(category: MerchantCategory): string {
  const labels: Record<MerchantCategory, string> = {
    entertainment: "Entertainment",
    productivity: "Productivity",
    shopping: "Shopping",
    food: "Food & Delivery",
    transportation: "Transportation",
    utilities: "Utilities",
    health: "Health & Fitness",
    finance: "Finance",
    education: "Education",
    lifestyle: "Lifestyle",
    gaming: "Gaming",
    news: "News & Media",
    other: "Other",
  };
  return labels[category] || labels.other;
}
