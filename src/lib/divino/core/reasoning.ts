// Raciocínio — chamada ao modelo de linguagem (Gemini) quando a chave existe.
export async function callGemini(
  apiKey: string,
  modelId: string,
  system: string,
  history: { role: string; text: string }[],
  userText: string
): Promise<string | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [
          ...history.map((h) => ({ role: h.role === 'divino' ? 'model' : 'user', parts: [{ text: h.text }] })),
          { role: 'user', parts: [{ text: userText }] },
        ],
        generationConfig: { temperature: 0.6, topP: 0.9, maxOutputTokens: 900 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}
