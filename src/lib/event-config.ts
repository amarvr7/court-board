// Event details shown in the site header / hero. Edit here to update every page.
export const EVENT_INFO = {
  name: "International Tennis Championship",
  shortName: "ITC",
  dates: "November 24 – December 6, 2026",
  location: "Tennis & Basketball Facility, Bradenton, FL",
  totalCourts: 49,
  // Drop the IMG Academy Tennis wordmark into /public/brand with this exact
  // file name and the header picks it up automatically.
  logo: {
    src: "/brand/IMGA_Tennis_Wordmark_Black_Blue.jpg",
    alt: "IMG Academy Tennis",
  },
  zones: [
    { name: "Stadium", courts: 2, note: "Feature matches" },
    { name: "Hard Courts", courts: 28, note: "Main hard-court complex" },
    { name: "East Clay", courts: 9, note: "Clay surface" },
    { name: "Legacy", courts: 6, note: "Legacy courts" },
    { name: "Indoors", courts: 4, note: "Weather backup" },
  ],
} as const;
