import * as fs from 'fs';
import * as path from 'path';

export function splitByLength(sentence: string): [string, string] {
  const words = sentence.split(/\s+/);
  const mid = Math.floor(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export function splitSection(text: string): string[] {
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  const segments: string[] = [];

  for (const sentence of sentences) {
    const commaCount = (sentence.match(/,/g) || []).length;

    // Rule 1: Two commas — attempt 3-way split
    if (commaCount >= 2) {
      const parts = sentence.split(",", 3).map(s => s.trim());
      if (parts.length === 3) {
        const [a, b, c] = parts as [string, string, string];
        if (b.split(/\s+/).length > 6 && c.split(/\s+/).length > 6) {
          segments.push(`${a}, ${b}`);
          segments.push(c);
          continue;
        }
      }
    }

    // Rule 2: One comma — split if both sides are long
    const firstCommaIdx = sentence.indexOf(",");
    if (firstCommaIdx !== -1) {
      const before = sentence.slice(0, firstCommaIdx).trim();
      const after = sentence.slice(firstCommaIdx + 1).trim();
      if (before.split(/\s+/).length > 6 && after.split(/\s+/).length > 6) {
        segments.push(before);
        segments.push(after);
        continue;
      }
    }

    // Rule 3: Split on conjunction if valid AND not too early
    const conjRegex = /\b(that|which|where|when|while)\b/i;
    const conjMatch = conjRegex.exec(sentence);
    if (
      sentence.split(/\s+/).length > 12 &&
      conjMatch?.index !== undefined &&
      conjMatch.index > 6
    ) {
      const before = sentence.slice(0, conjMatch.index).trim();
      const after = sentence.slice(conjMatch.index).trim();
      if (before.split(/\s+/).length >= 6 && after.split(/\s+/).length >= 6) {
        segments.push(before);
        segments.push(after);
        continue;
      }
    }

    // Rule 4: Fallback for long sentences
    if (sentence.split(/\s+/).length > 16) {
      const [first, second] = splitByLength(sentence);
      segments.push(first);
      if (second) segments.push(second);
      continue;
    }

    // Default: keep sentence whole
    segments.push(sentence);
  }

  return segments;
}

// Function to read and process the text file
function processTextFile(filePath: string): void {
  try {
    // Read the file content
    const text = fs.readFileSync(filePath, 'utf-8');
    
    // Process the text using splitSection
    const segments = splitSection(text);
    
    // Print the segments
    console.log('Text segments:');
    segments.forEach((segment, index) => {
      console.log(`[${index + 1}] ${segment}`);
    });
    
    // Optionally, write the segments to an output file
    const outputPath = path.join(path.dirname(filePath), 'segmented_output.txt');
    fs.writeFileSync(outputPath, segments.join('\n\n'));
    console.log(`\nSegmented text saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error processing file:', error);
  }
}

// Main execution - automatically process text.txt in the current directory
const textFilePath = path.join(__dirname, 'test-script.txt');
processTextFile(textFilePath);