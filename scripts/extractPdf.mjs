import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const filePath = 'Product/Hakim Proyas Draft Clean.pdf';

try {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);

  console.log('PDF Info:');
  console.log('Pages:', data.numpages);
  console.log('Info:', JSON.stringify(data.info, null, 2));
  console.log('Meta:', JSON.stringify(data.metadata, null, 2));
  console.log('\n--- Content Preview (first 3000 chars) ---');
  console.log(data.text.substring(0, 3000));

  // Save full text
  fs.writeFileSync('Product/V4_English_Original.txt', data.text, 'utf-8');
  console.log('\nFull text saved to Product/V4_English_Original.txt');
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}
