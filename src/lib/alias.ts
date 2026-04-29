const ADJECTIVES = [
  "happy", "swift", "clever", "brave", "calm", "eager", "kind", "bold",
  "bright", "cool", "swift", "gentle", "noble", "quick", "warm", "zen",
  "shiny", "crisp", "solid", "vivid",
];

const NOUNS = [
  "panda", "falcon", "river", "storm", "wolf", "eagle", "fox", "bear",
  "hawk", "lion", "tiger", "otter", "raven", "whale", "deer", "lynx",
  "cobra", "heron", "bison", "crane",
];

export function generateRandomAlias(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}-${noun}`;
}
