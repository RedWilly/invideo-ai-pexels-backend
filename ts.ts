import { AssemblyAI } from "assemblyai";

const client = new AssemblyAI({ 
  apiKey: "5138684a13ec4263a6ed347cd352dca1" 
});

// const audioFile = './local_file.mp3'
const audioFile = "https://87c129bea46e5e69d2d92f9b9ef83ca8.r2.cloudflarestorage.com/cdk-ttsopenai-gpt-prod-upload-bucket/flare_uploaded/663437/20250518_105654_456136/When_we_turn_to_the_Hebrew_Bible__we_discover_hint.mp3?response-content-type=application%2Foctet-stream&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=c059c5e08a0dd199cb0fb22ee31dad1b%2F20250518%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250518T105703Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=8c6c235c1931243fd9b46073a96656102931a1da570a29e49e0b6a63b32e075b";

const params = { 
  audio: audioFile 
};

const run = async () => {
  const transcript = await client.transcripts.transcribe(params);
  
  // console.log(transcript.text);
  
  // Print word-level details
  for (const word of transcript.words!) {
    console.log(
      `Word: ${word.text}, Start: ${word.start}, End: ${word.end}, Confidence: ${word.confidence}`
    );
  }
};

run();