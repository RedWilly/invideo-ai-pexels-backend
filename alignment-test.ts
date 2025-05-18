/**
 * Test script for the text alignment implementation
 */
import { AssemblyAI } from "assemblyai";
import { textNormalizer } from "./src/services/alignment/text-normalizer";
import { sequenceAligner } from "./src/services/alignment/sequence-aligner";
import { textAlignmentService } from "./src/services/alignment/text-alignment-service";

// Test audio URL
const audioUrl = "https://87c129bea46e5e69d2d92f9b9ef83ca8.r2.cloudflarestorage.com/cdk-ttsopenai-gpt-prod-upload-bucket/flare_uploaded/663437/20250518_105654_456136/When_we_turn_to_the_Hebrew_Bible__we_discover_hint.mp3?response-content-type=application%2Foctet-stream&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=c059c5e08a0dd199cb0fb22ee31dad1b%2F20250518%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250518T105703Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=8c6c235c1931243fd9b46073a96656102931a1da570a29e49e0b6a63b32e075b";

// Initialize AssemblyAI client
const client = new AssemblyAI({ 
  apiKey: process.env.ASSEMBLYAI_API_KEY || "5138684a13ec4263a6ed347cd352dca1"
});

// Test segments
const testSegments = [
  "When we turn to the Hebrew Bible",
  "we discover hints that Adam might not be the sole origin of humanity.",
  "In Genesis Chapter One, verses twenty-six and twenty-seven, the text speaks of",
  "Let us make humankind in our image,” suggesting a divine council at work.",
  "Then, in Chapter Two, verse seven, a distinct narrative presents",
  "Adam being formed from dust and granted life by God’s breath.",
  "These two creation accounts woven side by side suggest different traditions and perhaps",
  "different populations of early humans being acknowledged by the ancient editors or storytellers."
];

const run = async () => {
  console.log("Starting text alignment test...");
  
  try {
    // Step 1: Transcribe the audio
    console.log("Transcribing audio...");
    const transcript = await client.transcripts.transcribe({ audio: audioUrl });
    
    console.log("\nTranscript text:", transcript.text);
    console.log("Words detected:", transcript.words?.length || 0);
    
    // Step 2: Test text normalization
    console.log("\nTesting text normalization:");
    for (const segment of testSegments) {
      const normalized = textNormalizer.normalizeText(segment);
      console.log(`Original: "${segment}"`);
      console.log(`Normalized: "${normalized}"`);
      console.log(`Tokens: ${textNormalizer.tokenize(segment).join(", ")}`);
      console.log("---");
    }
    
    // Step 3: Test sequence alignment
    console.log("\nTesting sequence alignment:");
    const normalizedTranscript = textNormalizer.normalizeText(transcript.text || "");
    const transcriptTokens = textNormalizer.tokenize(normalizedTranscript);
    
    for (const segment of testSegments) {
      const normalizedSegment = textNormalizer.normalizeText(segment);
      const segmentTokens = textNormalizer.tokenize(normalizedSegment);
      
      console.log(`Aligning segment: "${segment}"`);
      const alignments = sequenceAligner.alignSequences(segmentTokens, transcriptTokens);
      console.log(`Found ${alignments.length} alignments`);
      
      for (const alignment of alignments) {
        console.log(`  Ref[${alignment.refIndex}]: "${segmentTokens[alignment.refIndex]}" -> Target[${alignment.targetIndex}]: "${transcriptTokens[alignment.targetIndex]}" (distance: ${alignment.distance})`);
      }
      console.log("---");
    }
    
    // Step 4: Test full text alignment service
    console.log("\nTesting full text alignment service:");
    const timings = textAlignmentService.alignSegmentsWithTranscript(
      transcript.text || "",
      transcript.words || [],
      testSegments
    );
    
    console.log("Alignment results:");
    for (const timing of timings) {
      console.log(`Segment: "${timing.text}"`);
      console.log(`Start time: ${timing.startTime}ms`);
      console.log(`End time: ${timing.endTime}ms`);
      console.log(`Duration: ${timing.duration}ms`);
      console.log("---");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
};

run();
