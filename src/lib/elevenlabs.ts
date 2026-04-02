import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export function createClient(apiKey: string): ElevenLabsClient {
  return new ElevenLabsClient({ apiKey });
}

export async function streamToDataUri(
  stream: ReadableStream,
  mimeType = "audio/mpeg"
): Promise<string> {
  const buffer = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:${mimeType};base64,${base64}`;
}
