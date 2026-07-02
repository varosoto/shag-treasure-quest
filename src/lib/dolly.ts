export const dollyLines = [
  {
    before: "Tumble out of bed and I stumble to the kitchen,",
    answer: "pour myself a cup of ambition",
    display: "Pour myself a cup of ambition",
    placeholder: "fill in the next line...",
  },
  {
    before: "Jump in the shower and the blood starts pumpin',",
    answer: "out on the street, the traffic starts jumpin'",
    display: "Out on the street, the traffic starts jumpin'",
    placeholder: "out on the street...",
  },
  {
    before: "They just use your mind and they never give you credit,",
    answer: "it's enough to drive you crazy if you let it",
    display: "It's enough to drive you crazy if you let it",
    placeholder: "it's enough to drive you...",
  },
  {
    before: "9 to 5, for service and devotion,",
    answer: "you would think that i would deserve a fair promotion",
    display: "You would think that I would deserve a fair promotion",
    placeholder: "you would think that...",
  },
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
