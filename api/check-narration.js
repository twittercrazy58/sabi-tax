// api/check-narration.js
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // Only allow POST requests from your frontend
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { narration } = req.body;

  // Use the secret key you'll save in Vercel Settings
  const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

  // Note: 'gemini-3-flash' is the new Jan 2026 standard for high-speed reasoning
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    thinkingConfig: { thinkingBudget: 0 },
  });

  try {
    const prompt = `You are an elite Nigerian Tax Consultant specializing in the 2026 Tax Reform Acts. 
Analyze this bank narration: "${narration}". 

CONTEXT FOR 2026 GUIDELINES:
- The Nigeria Tax Administration Act (NTAA) is now in full effect as of Jan 1, 2026.
- The Nigeria Revenue Service (NRS) replaces the FIRS.
- Tax ID (TIN) is mandatory for all taxable bank accounts.
- Personal income under ₦800,000/year is tax-exempt.
- Vague narrations like "Payment" or "Services" without a TRC (Tax Reference Code) or Period are RISKY.

YOUR TASK:
1. Categorize as: **SAFE**, **TAXABLE**, or **RISKY**.
2. Give a 1-sentence explanation in Pidgin/English mix.
3. If RISKY or TAXABLE, mention the TRC/TIN requirement.
4. On a NEW LINE, start with "SUGGESTION:" followed by a tax-compliant narration.

Start with the CATEGORY in bold.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Send the text back to your frontend
    res.status(200).json({ text: response.text() });
  } catch (error) {
    res.status(500).json({ error: "SabiAI backend error" });
  }
}
