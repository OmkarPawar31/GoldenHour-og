// app/api/tts/route.ts
// Server-side proxy for ElevenLabs Text-to-Speech API
// Keeps the API key secure on the server side

import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // "George" - clear male voice

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing 'text' field" }, { status: 400 });
    }

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.85,
            style: 0.4,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TTS] ElevenLabs error:", response.status, errorText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}` },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[TTS] Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
