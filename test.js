require("dotenv").config({ path: ".env.local" });
const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
async function run() {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { inlineData: { data: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF").toString("base64"), mimeType: "application/pdf" } },
          { text: "What is this document?" }
        ]
      }]
    });
    console.log("Success:", res.text);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
