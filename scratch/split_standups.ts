import * as fs from 'fs';
import * as path from 'path';

interface StandupDay {
    date: string;
    content: string;
}

function formatDate(dateStr: string): string {
    // Convert "January 14, 2025" to "20250114"
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function parseXMLStandups(filePath: string): void {
    // Create output directory if it doesn't exist
    const outDir = './out';
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Split into individual day entries
    const dayMatches = content.match(/<day date="([^"]+)">([\s\S]*?)<\/day>/g);
    
    if (!dayMatches) {
        console.error('No standup entries found');
        return;
    }

    dayMatches.forEach(dayMatch => {
        // Extract date and content
        const dateMatch = dayMatch.match(/<day date="([^"]+)">/);
        if (!dateMatch) return;

        const originalDate = dateMatch[1];
        const formattedDate = formatDate(originalDate);
        
        // Create the output file
        const outputPath = path.join(outDir, `${formattedDate}.xml`);
        
        // Write the content
        const dayContent = `<?xml version="1.0" encoding="UTF-8"?>\n${dayMatch}`;
        fs.writeFileSync(outputPath, dayContent, 'utf-8');
        
        console.log(`Created ${outputPath}`);
    });
}

// Parse and split the file
const inputFile = './data/inputs/1mostandups.xml';

try {
    parseXMLStandups(inputFile);
    console.log('Successfully split standup notes into individual files');
} catch (error) {
    console.error('Error processing file:', error);
} 