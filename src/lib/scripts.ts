export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface Script {
  text: string;
  difficulty: Difficulty;
}

export const practiceScripts: Script[] = [
  // 초급 (Beginner) - 짧고 간단한 문장
  { text: "Nice to meet you.", difficulty: "beginner" },
  { text: "How are you doing today?", difficulty: "beginner" },
  { text: "I like coffee in the morning.", difficulty: "beginner" },
  { text: "What time is it now?", difficulty: "beginner" },
  { text: "Can I have some water, please?", difficulty: "beginner" },
  { text: "Where is the bathroom?", difficulty: "beginner" },
  { text: "I'm from South Korea.", difficulty: "beginner" },
  { text: "Thank you very much for your help.", difficulty: "beginner" },
  { text: "I don't understand. Could you repeat that?", difficulty: "beginner" },
  { text: "It's a beautiful day today.", difficulty: "beginner" },

  // 중급 (Intermediate) - 복합 문장, 관용 표현
  { text: "I have plans tomorrow, so I don't think I'll be at the library.", difficulty: "intermediate" },
  { text: "Could you tell me where the nearest subway station is?", difficulty: "intermediate" },
  { text: "I've been studying English for about three years now.", difficulty: "intermediate" },
  { text: "I'm looking forward to the weekend because I need some rest.", difficulty: "intermediate" },
  { text: "Do you happen to know what time the meeting starts?", difficulty: "intermediate" },
  { text: "Let me know if there's anything I can do to help you out.", difficulty: "intermediate" },
  { text: "She said she would call me back, but I haven't heard from her yet.", difficulty: "intermediate" },
  { text: "The weather has been really unpredictable lately, hasn't it?", difficulty: "intermediate" },
  { text: "I was wondering if you could help me with this assignment.", difficulty: "intermediate" },
  { text: "Would you mind if I opened the window? It's a bit stuffy in here.", difficulty: "intermediate" },

  // 고급 (Advanced) - 긴 문장, 복잡한 구조, 발음 난이도 높음
  { text: "Although I initially thought the project would be straightforward, it turned out to be far more complicated than anyone had anticipated.", difficulty: "advanced" },
  { text: "The government has implemented a series of measures aimed at reducing carbon emissions by thirty percent over the next decade.", difficulty: "advanced" },
  { text: "Had I known about the cancellation earlier, I would have made alternative arrangements instead of waiting at the airport for three hours.", difficulty: "advanced" },
  { text: "The phenomenon of social media influencing public opinion has been extensively studied, yet its long-term effects remain largely unpredictable.", difficulty: "advanced" },
  { text: "Notwithstanding the considerable challenges we faced throughout the negotiation process, we managed to reach a mutually beneficial agreement.", difficulty: "advanced" },
  { text: "It's worth noting that the correlation between economic growth and environmental sustainability is not as straightforward as it might seem.", difficulty: "advanced" },
  { text: "The researcher emphasized that while the preliminary results were promising, further investigation would be necessary before drawing any definitive conclusions.", difficulty: "advanced" },
  { text: "What distinguishes truly effective leaders from the rest is their ability to adapt their communication style to resonate with diverse audiences.", difficulty: "advanced" },
];

export const difficultyLabels: Record<Difficulty, string> = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
};

export const difficultyColors: Record<Difficulty, string> = {
  beginner: "text-accent",
  intermediate: "text-warning",
  advanced: "text-destructive",
};

export function getRandomScript(exclude?: string, difficulty?: Difficulty): string {
  let filtered = difficulty
    ? practiceScripts.filter((s) => s.difficulty === difficulty)
    : practiceScripts;
  if (exclude) {
    filtered = filtered.filter((s) => s.text !== exclude);
  }
  if (filtered.length === 0) filtered = practiceScripts;
  return filtered[Math.floor(Math.random() * filtered.length)].text;
}
