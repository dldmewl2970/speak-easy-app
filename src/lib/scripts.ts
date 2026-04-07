export const practiceScripts = [
  "I have plans tomorrow, so I don't think I'll be at the library.",
  "Could you tell me where the nearest subway station is?",
  "I've been studying English for about three years now.",
  "Would you mind if I opened the window? It's a bit stuffy in here.",
  "She said she would call me back, but I haven't heard from her yet.",
  "I'm looking forward to the weekend because I need some rest.",
  "Do you happen to know what time the meeting starts?",
  "I was wondering if you could help me with this assignment.",
  "The weather has been really unpredictable lately, hasn't it?",
  "Let me know if there's anything I can do to help you out.",
];

export function getRandomScript(exclude?: string): string {
  const filtered = exclude
    ? practiceScripts.filter((s) => s !== exclude)
    : practiceScripts;
  return filtered[Math.floor(Math.random() * filtered.length)];
}
