type SessionTurnForMemory = {
  content: string;
  speaker: string;
};

export function buildSessionContextMemory(turns: SessionTurnForMemory[]) {
  const recentTurns = turns
    .map((turn) => ({
      content: turn.content.trim(),
      speaker: turn.speaker,
    }))
    .filter((turn) => turn.content)
    .slice(-18);

  const latestUserLine = [...recentTurns]
    .reverse()
    .find((turn) => turn.speaker !== "assistant")?.content;
  const latestAssistantAnswer = [...recentTurns]
    .reverse()
    .find((turn) => turn.speaker === "assistant")?.content;
  const topicTrail = recentTurns
    .filter((turn) => turn.speaker !== "assistant")
    .map((turn) => compactLine(turn.content))
    .slice(-8);
  const answerTrail = recentTurns
    .filter((turn) => turn.speaker === "assistant")
    .map((turn) => compactLine(turn.content))
    .slice(-4);

  return [
    "Active session memory:",
    "Use this to understand what the ongoing conversation is about. The latest interviewer/user line is the immediate thing to answer.",
    latestUserLine ? `Latest interviewer/user line: ${compactLine(latestUserLine, 500)}` : "",
    latestAssistantAnswer
      ? `Last assistant answer summary: ${compactLine(latestAssistantAnswer, 500)}`
      : "",
    topicTrail.length ? `Recent question/topic trail:\n${topicTrail.join("\n")}` : "",
    answerTrail.length ? `Recent answer trail:\n${answerTrail.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 5000);
}

function compactLine(value: string, maxLength = 280) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}
