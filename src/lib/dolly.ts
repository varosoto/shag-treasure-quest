export const dollyLines = [
  { before: "Tumble outta bed and I stumble to the kitchen,", answer: "pour myself a cup of ambition", display: "Pour myself a cup of ambition", placeholder: "fill in the next line..." },
  { before: "It's a rich man's game, no matter what they call it,", answer: "and you spend your life puttin' money in his wallet", display: "And you spend your life puttin' money in his wallet", placeholder: "what do you spend your life doing?" },
  { before: "They let you dream just to watch 'em shatter,", answer: "you're just a step on the boss man's ladder", display: "You're just a step on the boss man's ladder", placeholder: "what are you on the boss man's..." },
  { before: "9 to 5, what a way to make a living,", answer: "barely gettin' by, it's all takin' and no givin'", display: "Barely gettin' by, it's all takin' and no givin'", placeholder: "barely gettin' by..." },
  { before: "They just use your mind and they never give you credit,", answer: "it's enough to drive you crazy if you let it", display: "It's enough to drive you crazy if you let it", placeholder: "it's enough to drive you..." },
];

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function scoreLine(input: string, answer: string): boolean {
  const a = norm(answer);
  const i = new Set(norm(input));
  if (a.length === 0) return false;
  const hits = a.filter((w) => i.has(w)).length;
  return hits / a.length >= 0.6;
}
