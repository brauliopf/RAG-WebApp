import Groq from 'groq-sdk'; // Adjust import if SDK name differs

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY, // Use env variable for security
  dangerouslyAllowBrowser: true,
});

export async function transcribeWithWhisper(audioBlob: Blob) {
  // Adjust method and params to match Groq SDK's API
  const transcription = await groq.audio.transcriptions.create({
    file: new File([audioBlob], 'audio.mp3', { type: 'audio/mp3' }),
    model: 'whisper-large-v3-turbo', // Required model to use for transcription
    // prompt: "Specify context or spelling", // Optional
    // response_format: "json", // Optional
    // timestamp_granularities: ["word", "segment"], // Optional (must set response_format to "json" to use and can specify "word", "segment" (default), or both)
    // language: "en", // Optional
    temperature: 0.0, // Optional
  });

  console.log(JSON.stringify(transcription, null, 2));
  return transcription;
}
