// Filter by terms and non-ASCII characters
const foreignChar = /([^\x00-\x7F]+)/gim;
const cleanMatch = /(?<!so)((^clean)|(clean$)|\W+clean\W+)(?!\W*bandit)/gim;
const styleMatch = /(?<!(gangnam)\s*)(?<!(harry)\s*)(style)/gim;
const coverMatch = /((?<!(on the\s))\b(covers*)\b)/gim;
const karaokeMatch = /(?<!like(\s))(karaoke)/gim;

const filterArray = [
  "piano",
  "live",
  "demo",
  "pangilinan",
  "slowed",
  "lesson",
  "but everytime",
  "but every time",
  "gets faster",
  "speeds up",
  "blog",
  "grammys",
  "grammy's",
  "tutorial",
  "ucla",
  "commentator",
  "reworked",
  "christmas special",
  "commentary",
  "interview",
  "american idol",
  "backing track",
  "backingtrack",
  "masked singer",
  "playlist",
  "free for profit",
  "sample",
  "type beat",
  "story behind",
  "zoey's extraordinary",
  "easter eggs",
  "programmers",
  "hall of fame",
  "power ballad",
  "trump",
  "obama",
  "swap",
  "choir",
  "amazon music",
  "gameplay",
  "orchestra",
  "making of",
  "guitar",
  "storytellers",
  "vh1",
  "tour",
  "playing for change",
  "song around the world",
  "good morning america",
  "gma",
  "today show",
  "tonight show",
  "late show",
  "starring",
  "concert",
  "theatre",
  "theater",
  "fallon",
  "ed sullivan",
  "letterman",
  "conan",
  "ferguson",
  "kimmel",
  "sabrina carpenter",
  "pomplamoose",
  "jay leno",
  "jon stewart",
  "trevor noah",
  "chappelle",
  "colbert",
  "glee",
  "s l o w e d",
  "reverb",
  "r e v e r b",
  "pitch",
  "instrumental",
  "choreography",
  "festival",
  "challenge",
  "mirrored",
  "unplugged",
  "live from",
  "live at",
  "live @",
  "live earth",
  "elyse",
  "en vivo",
  "awards",
  "christmas special",
  "halloween special",
  "thanksgiving special",
  "t in the park",
  "coachella",
  "pitchfork",
  "sxsw",
  "singing live",
  "south by southwest",
  "south by south west",
  "electric daisy carnival",
  "edc",
  "austin city limits",
  "governors ball",
  "governor's ball",
  "gov ball",
  "burning man",
  "bonnaroo",
  "nye",
  "music city midnight",
  "firefly",
  "rolling loud",
  "glasgow",
  "glastonbury",
  "pinkpop",
  "lollapalooza",
  "iheart",
  "behind the music",
  "disney",
  "sing along",
  "backing",
  "dance video",
  "vocal",
  "vox",
  "how to sing",
  "tik tok",
  "tiktok",
  karaokeMatch,
  "shorts",
  "loop",
  "hour",
  "perform",
  "cmt",
  "version",
  "baby shark",
  "nursery",
  "acoustic",
  "amazingmusic",
  "behind the scenes",
  "audition",
  "reaction",
  "reaccion",
  "explain",
  "explanation",
  "react",
  "freestyle",
  "mtv",
  "vma",
  "chipmunk",
  "metal version",
  "male version",
  "acapella",
  "nightcore",
  "nightcrore",
  "minecraft",
  "kidz bop",
  "kidzbop",
  "verified",
  "parody",
  "parodia",
  "parodie",
  "spoof",
  "pronunciation",
  "meaning",
  "music box",
  "the voice",
  "extended",
  "learn english",
  "translation",
  "traducao",
  "mashup",
  "mash-up",
  cleanMatch,
  styleMatch,
  foreignChar,
  coverMatch,
];

const descriptionFilterArray = [
  coverMatch,
  karaokeMatch,
  "acapella",
  "parody",
  "parodie",
  "reworked",
  "parodia",
  "pangilinan",
  "spoof",
  "version",
  "live from",
  "live @",
  "singing live",
  "originally performed",
  "elyse",
  "grammys",
  "grammy's",
  "live earth",
  "interview",
  "backing track",
  "backingtrack",
  "american idol",
  "masked singer",
  "christmas special",
  "halloween special",
  "thanksgiving special",
  "hall of fame",
  "playing for change",
  "song around the world",
  "iheart",
  "teen choice awards",
  "video music awards",
  "vma",
  "nye",
  "new years eve",
  "new year's eve",
  "music city midnight",
  "t in the park",
  "coachella",
  "pitchfork",
  "sxsw",
  "south by southwest",
  "south by south west",
  "electric daisy carnival",
  "good morning america",
  "today show",
  "edc",
  "austin city limits",
  "governors ball",
  "governor's ball",
  "gov ball",
  "burning man",
  "bonnaroo",
  "firefly",
  "rolling loud",
  "glasgow",
  "glastonbury",
  "pinkpop",
  "lollapalooza",
  "tonight show",
  "late show",
  "fallon",
  "ed sullivan",
  "letterman",
  "conan",
  "ferguson",
  "kimmel",
  "jay leno",
  "jon stewart",
  "trevor noah",
  "chappelle",
  "colbert",
];

const channelAboutFilterArray = [
  coverMatch,
  "karaoke",
  "acapella",
  "parody",
  "parodia",
  "parodie",
];

const mustContainArray = [
  "video",
  "audio",
  "lyrics",
  "letra",
  "official",
  "mv",
  "music video",
  "music",
];

module.exports = {
  filterArray,
  descriptionFilterArray,
  channelAboutFilterArray,
  mustContainArray,
};
