// Client-supplied content. Anything still in [SQUARE BRACKETS] is waiting on
// the client and renders as-is so it stays visible. Links set to null render
// as "#" until a real URL arrives.

export const site = {
  name: 'Leya.M',
  owner: 'Leya Mnangagwa',
  url: process.env.SITE_URL || 'http://localhost:3000',

  contact: {
    email: '[EMAIL ADDRESS]',
    phone: '[PHONE NUMBER]',
    location: '[CITY, COUNTRY]',
    replyDays: '[0]',
  },

  social: {
    instagram: null,
    facebook: null,
    linkedin: null,
    youtube: null,
  },

  ventures: {
    // On hold for now: links go to the philanthropy page instead. Put
    // 'https://wellnesswithoutlimits.org/' back here to link out again.
    wellnessWithoutLimits: null,
    arimahTravel: 'https://arimahtravel.com/',
    podcast: null,
    foundation: null,
    herSecretPlace: null,
  },

  copy: {
    podcastLine: "[One line on what the podcast covers and who it's for.]",
    travelLine: '[One line on the kinds of trips and experiences offered.]',
    foundationLine: "[One line on the foundation's mission and who it serves.]",
    foundationMission: '[Mission statement: who the foundation serves, where it works and what it provides.]',
    retreatDetails: "[Add who it's for, how often it runs and how to attend.]",
    authorRole: '[Role]',
    authorBio: '[Short bio: qualifications, areas of focus, and what they enjoy about the work.]',
  },

  // Home hero and philanthropy impact numbers. Never ship invented figures.
  stats: {
    peopleSupported: '[NUMBER]',
    womenReached: '[000]',
    retreatsHeld: '[00]',
    communitiesServed: '[00]',
    podcastEpisodes: '[000]',
  },

  video: {
    url: null,
    length: '[0:00]',
  },

  // Payment provider still to be decided. Set DONATE_URL to a hosted checkout
  // link (Stripe Payment Link, PayPal, Givebutter...) and the button uses it.
  donateUrl: process.env.DONATE_URL || null,

  categories: ['Anxiety', 'Relationships', 'Self-care', 'Mindfulness', 'Grief', 'Faith', 'Family'],

  contactTopics: [
    'Speaking & events',
    'Mentorship',
    'Wellness Without Limits',
    'Arimah Travel & Tours',
    'The Unqualified Podcast',
    'Arimah Foundation',
    'Media & press',
    'Something else',
  ],
};

export const link = (url) => url || '#';
