// Test the hash function to debug the Bf157g issue
function getShortIdFromTicket(ticketId) {
  // Create a simple hash using built-in methods (same as client-side)
  let hash = 0;
  for (let i = 0; i < ticketId.length; i++) {
    const char = ticketId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive number and then to hex
  const positiveHash = Math.abs(hash).toString(16);
  
  // Base62 character set
  const BASE62_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  // Convert hex to Base62
  let num = BigInt('0x' + positiveHash);
  let result = '';
  
  while (num > 0) {
    result = BASE62_CHARS[Number(num % 62n)] + result;
    num = num / 62n;
  }
  
  result = result || '0';
  
  // Pad or truncate to exactly 6 characters
  if (result.length < 6) {
    result = result.padStart(6, BASE62_CHARS[0]);
  } else if (result.length > 6) {
    result = result.substring(0, 6);
  }
  
  return result;
}

// Test with the actual ticket ID
const ticketId = 'EYGOCUDgA6hIha6LiZAd';
const shortId = getShortIdFromTicket(ticketId);

console.log(`Ticket ID: ${ticketId}`);
console.log(`Generated Short ID: ${shortId}`);
console.log(`Expected Short ID: Bf157g`);
console.log(`Match: ${shortId === 'Bf157g'}`);

// Let's also check the hash calculation step by step
let hash = 0;
for (let i = 0; i < ticketId.length; i++) {
  const char = ticketId.charCodeAt(i);
  hash = ((hash << 5) - hash) + char;
  hash = hash & hash;
}

console.log(`\nStep-by-step:`);
console.log(`Raw hash: ${hash}`);
console.log(`Positive hash: ${Math.abs(hash)}`);
console.log(`Hex: ${Math.abs(hash).toString(16)}`);