import * as fs from 'fs';

interface StandupDay {
    date: string;
    content: string;
}

function parseStandupNotes(filePath: string): string {
    const content = fs.readFileSync(filePath, 'utf-8');
    const days: StandupDay[] = [];
    
    // Split the content by the markdown separator
    const sections = content.split('---\n');
    
    for (const section of sections) {
        if (!section.trim()) continue;
        
        // Extract date using regex
        const dateMatch = section.match(/Date: ([^\n]+)/);
        if (dateMatch) {
            days.push({
                date: dateMatch[1].trim(),
                content: section.trim()
            });
        }
    }
    
    // Generate XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<response>\n';
    
    for (const day of days) {
        xml += `  <day date="${day.date}">\n`;
        xml += `    ${day.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}\n`;
        xml += '  </day>\n';
    }
    
    xml += '</response>';
    return xml;
}

// Parse and write the output
const inputFile = './scratch/1week.md';
const outputFile = './scratch/standup.xml';

try {
    const xmlOutput = parseStandupNotes(inputFile);
    fs.writeFileSync(outputFile, xmlOutput, 'utf-8');
    console.log('Successfully parsed standup notes to XML');
} catch (error) {
    console.error('Error processing file:', error);
} 