import * as fs from "fs";
import * as path from "path";

interface StandupDay {
  date: string;
  content: string;
}

function formatDate(dateStr: string): string {
  // Convert "January 14, 2025" to "20250114"
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function parseXMLStandups(filePath: string): void {
  // Create output directory if it doesn't exist
  const outDir = "./out";
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const content = fs.readFileSync(filePath, "utf-8");

  // Split into individual day entries
  const dayMatches = content.match(/<day date="([^"]+)">([\s\S]*?)<\/day>/g);

  if (!dayMatches) {
    console.error("No standup entries found");
    return;
  }

  dayMatches.forEach(dayMatch => {
    // Extract date and content
    const dateMatch = dayMatch.match(/<day date="([^"]+)">/);
    const contentMatch = dayMatch.match(/<day date="[^"]+">([\s\S]*?)<\/day>/);
    if (!dateMatch || !contentMatch) {
      console.log('Failed to match:', dayMatch); // Debug logging
      return;
    }

    const originalDate = dateMatch[1];
    const formattedDate = formatDate(originalDate);
    
    // Extract and clean the content
    let content = contentMatch[1].trim();
    // Remove any XML/HTML tags if present
    content = content.replace(/<[^>]*>/g, '');
    // Unescape any HTML entities
    content = content
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    
    // Create markdown content with frontmatter
    const markdownContent = `---
date: "${originalDate}"
---

${content}`;
    
    // Create the output file with .md extension
    const outputPath = path.join(outDir, `${formattedDate}.md`);
    
    // Write the content
    fs.writeFileSync(outputPath, markdownContent, 'utf-8');
    
    console.log(`Created ${outputPath}`);
  });
}

// Parse and split the file
const inputFile = "./data/inputs/1mostandups.xml";

try {
  parseXMLStandups(inputFile);
  console.log("Successfully split standup notes into individual files");
} catch (error) {
  console.error("Error processing file:", error);
}
