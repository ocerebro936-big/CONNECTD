import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generate() {
    const prompts = [
        "A beautiful clear blue sky with fluffy white clouds, aesthetic, high resolution, 16:9",
        "A stunning sunset sky with pink and orange clouds, aesthetic, high resolution, 16:9",
        "A starry night sky with subtle glowing clouds, aesthetic, high resolution, 16:9"
    ];

    if (!fs.existsSync('public')) {
        fs.mkdirSync('public');
    }

    for (let i = 0; i < prompts.length; i++) {
        console.log(`Generating image ${i+1}...`);
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: prompts[i],
                config: {
                    imageConfig: {
                        aspectRatio: "16:9"
                    }
                }
            });
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    const buffer = Buffer.from(part.inlineData.data, 'base64');
                    fs.writeFileSync(`public/bg${i+1}.jpeg`, buffer);
                    console.log(`Saved public/bg${i+1}.jpeg`);
                }
            }
        } catch (e) {
            console.error(`Failed to generate image ${i+1}:`, e);
        }
    }
}

generate().catch(console.error);
