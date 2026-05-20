// lib/receiptParser.ts

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
  total: number;
}

export interface ParsedReceipt {
  merchant: string;
  date: string | null;
  items: ReceiptItem[];
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  payment: number | null;
  change: number | null;
  currency: "IDR" | "OTHER";
  category: "retail" | "restaurant" | "service" | "unknown";
  confidence: number;
}

// ======================
// NORMALIZE TEXT
// ======================
function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[|]/g, "I")
    .replace(/[oO](?=\d)/g, "0")
    .replace(/Rp\.?/gi, "")
    .replace(/RP\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ======================
// PARSE CURRENCY VALUE
// ======================
function parseCurrencyValue(value: string): number {
  if (!value) return 0;

  // Remove currency symbols and letters
  let cleaned = value
    .replace(/[^\d.,]/g, "")
    .trim();

  // Detect format: 1.000,00 (Indonesian) vs 1,000.00 (International)
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // Check which appears last
    const lastDot = cleaned.lastIndexOf(".");
    const lastComma = cleaned.lastIndexOf(",");
    
    if (lastComma > lastDot) {
      // Indonesian format: 1.000,00
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // International format: 1,000.00
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(",") && !cleaned.includes(".")) {
    // Could be decimal separator
    const parts = cleaned.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = cleaned.replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  }

  const number = parseFloat(cleaned);
  return isNaN(number) ? 0 : Math.round(number * 100) / 100;
}

// ======================
// EXTRACT MERCHANT
// ======================
function extractMerchant(lines: string[]): string {
  // Common merchant indicators
  const skipKeywords = [
    "jl.", "jalan", "telp", "phone", "npwp", "fax",
    "www.", "http", ".com", ".co.id", "struk", "receipt",
    "customer", "pelanggan", "date", "tanggal", "time", "waktu",
    "kasir", "cashier", "no.", "#"
  ];

  // Check first 8 lines for merchant name
  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const line = lines[i].trim();
    
    // Skip empty or short lines
    if (line.length < 3) continue;
    
    // Skip lines with skip keywords
    if (skipKeywords.some(keyword => line.toLowerCase().includes(keyword))) continue;
    
    // Skip lines that are mostly numbers
    const numberRatio = (line.match(/\d/g) || []).length / line.length;
    if (numberRatio > 0.3) continue;
    
    // Skip lines with date patterns
    if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line)) continue;
    
    // Found potential merchant name
    return line.toUpperCase().replace(/[^\w\s&'-]/g, "").trim();
  }

  return "UNKNOWN MERCHANT";
}

// ======================
// EXTRACT DATE
// ======================
function extractDate(lines: string[]): string | null {
  const datePatterns = [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
    /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
    /(?:date|tanggal|tgl)[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        let dateStr = match[1];
        
        // Normalize to YYYY-MM-DD
        const parts = dateStr.split(/[\/\-\.]/);
        if (parts.length === 3) {
          let year, month, day;
          
          if (parts[0].length === 4) {
            // YYYY-MM-DD
            year = parts[0];
            month = parts[1].padStart(2, "0");
            day = parts[2].padStart(2, "0");
          } else {
            // DD-MM-YYYY or MM-DD-YYYY
            // Assume DD-MM-YYYY for Indonesian receipts
            day = parts[0].padStart(2, "0");
            month = parts[1].padStart(2, "0");
            year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          }
          
          return `${year}-${month}-${day}`;
        }
      }
    }
  }

  return null;
}

// ======================
// FIND VALUE BY KEYWORDS
// ======================
function findValueByKeywords(lines: string[], keywords: string[]): number | null {
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (keywords.some(keyword => lowerLine.includes(keyword))) {
      // Extract number from the line
      const matches = line.match(/[\d.,]+/g);
      if (matches && matches.length > 0) {
        // Get the last number in the line (usually the amount)
        const value = matches[matches.length - 1];
        const parsed = parseCurrencyValue(value);
        if (parsed > 0) return parsed;
      }
    }
  }
  
  return null;
}

// ======================
// EXTRACT RECEIPT ITEMS
// ======================
function extractItems(lines: string[]): ReceiptItem[] {
  const items: ReceiptItem[] = [];
  const skipKeywords = [
    "total", "grand total", "subtotal", "sub total",
    "tax", "ppn", "pajak", "discount", "diskon",
    "cash", "tunai", "bayar", "payment",
    "change", "kembali", "kembalian",
    "item", "qty", "harga", "price",
    "---", "===", "***"
  ];

  for (const line of lines) {
    const cleanedLine = line.trim();
    
    // Skip empty or short lines
    if (cleanedLine.length < 5) continue;
    
    // Skip lines with skip keywords
    if (skipKeywords.some(keyword => cleanedLine.toLowerCase().includes(keyword))) continue;
    
    // Skip lines that are just numbers
    if (/^[\d\s.,]+$/.test(cleanedLine)) continue;

    // Try multiple parsing patterns
    let item = parseItemPattern1(cleanedLine) || 
               parseItemPattern2(cleanedLine) || 
               parseItemPattern3(cleanedLine);

    if (item && item.name.length > 2 && item.total > 0) {
      items.push(item);
    }
  }

  return items;
}

// Pattern: ITEM_NAME QTY x PRICE TOTAL
function parseItemPattern1(line: string): ReceiptItem | null {
  // Match: Name [Qty] [x] Price Total
  const regex = /(.+?)\s+(\d+)?\s*(?:x|X|@)?\s*(\d[\d.,]+)\s+(\d[\d.,]+)$/;
  const match = line.match(regex);
  
  if (match) {
    const name = match[1].trim();
    const qty = match[2] ? parseInt(match[2]) : 1;
    const price = parseCurrencyValue(match[3]);
    const total = parseCurrencyValue(match[4]);
    
    // Validate logic: total should be approximately qty * price
    if (qty > 0 && price > 0) {
      const expectedTotal = qty * price;
      const difference = Math.abs(expectedTotal - total);
      const tolerance = Math.max(expectedTotal * 0.1, 100); // 10% tolerance
      
      if (difference <= tolerance) {
        return { name, qty, price, total };
      }
    }
    
    // If validation fails, use detected total
    return { name, qty, price, total };
  }
  
  return null;
}

// Pattern: ITEM_NAME QTY TOTAL (no unit price)
function parseItemPattern2(line: string): ReceiptItem | null {
  // Match: Name Qty Total
  const regex = /(.+?)\s+(\d+)\s+(\d[\d.,]+)$/;
  const match = line.match(regex);
  
  if (match) {
    const name = match[1].trim();
    const qty = parseInt(match[2]);
    const total = parseCurrencyValue(match[3]);
    
    if (total > 0 && qty <= 100) { // Reasonable quantity
      const price = Math.round((total / qty) * 100) / 100;
      return { name, qty, price, total };
    }
  }
  
  return null;
}

// Pattern: ITEM_NAME TOTAL (single item)
function parseItemPattern3(line: string): ReceiptItem | null {
  // Match: Name [maybe some text] Total
  const regex = /(.+?)\s+(\d[\d.,]+)\s*$/;
  const match = line.match(regex);
  
  if (match) {
    const name = match[1].trim();
    const total = parseCurrencyValue(match[2]);
    
    // Filter out non-item lines
    if (name.length > 3 && total > 0 && total < 10000000) {
      return { name, qty: 1, price: total, total };
    }
  }
  
  return null;
}

// ======================
// DETECT CATEGORY
// ======================
function detectCategory(items: ReceiptItem[], merchant: string): "retail" | "restaurant" | "service" | "unknown" {
  const allText = [...items.map(i => i.name), merchant].join(" ").toLowerCase();
  
  // Service keywords
  const serviceKeywords = ["salon", "barber", "cukur", "potong", "service", "repair", "servis", "laundry", "cuci"];
  if (serviceKeywords.some(k => allText.includes(k))) return "service";
  
  // Restaurant keywords
  const restaurantKeywords = ["food", "drink", "meal", "coffee", "tea", "kopi", "makan", "minum", "nasi", "mie", "ayam", "burger", "pizza", "sushi", "steak", "resto", "cafe", "restaurant", "bakery"];
  if (restaurantKeywords.some(k => allText.includes(k))) return "restaurant";
  
  // Retail keywords
  const retailKeywords = ["mart", "store", "toko", "supermarket", "minimarket", "indomaret", "alfamart", "grocery", "shop", "mall"];
  if (retailKeywords.some(k => allText.includes(k))) return "retail";
  
  // Default logic based on item count and type
  if (items.length > 0) {
    if (items.length >= 3 && items.every(i => i.qty === 1)) return "restaurant";
    if (items.some(i => i.name.toLowerCase().includes("service") || i.name.toLowerCase().includes("jasa"))) return "service";
  }
  
  return "unknown";
}

// ======================
// CALCULATE CONFIDENCE
// ======================
function calculateConfidence(
  merchant: string,
  items: ReceiptItem[],
  total: number | null,
  payment: number | null,
  change: number | null,
  rawText: string
): number {
  let score = 0;
  const weights = {
    merchant: 0.2,
    items: 0.35,
    total: 0.25,
    payment: 0.1,
    change: 0.1
  };
  
  // Merchant confidence
  if (merchant && merchant !== "UNKNOWN MERCHANT") {
    score += weights.merchant;
  }
  
  // Items confidence
  if (items.length > 0) {
    const itemScore = Math.min(items.length / 5, 1) * weights.items;
    score += itemScore;
    
    // Bonus for items with valid prices
    const validItems = items.filter(i => i.total > 0 && i.name.length > 3);
    if (validItems.length === items.length) {
      score += weights.items * 0.3;
    }
  }
  
  // Total confidence
  if (total && total > 0) {
    score += weights.total;
    
    // Check if total matches sum of items
    if (items.length > 0) {
      const itemsTotal = items.reduce((sum, item) => sum + item.total, 0);
      const difference = Math.abs(itemsTotal - total);
      const tolerance = Math.max(itemsTotal * 0.15, 500); // 15% tolerance
      
      if (difference <= tolerance) {
        score += weights.total * 0.5;
      }
    }
  }
  
  // Payment confidence
  if (payment && payment > 0) {
    score += weights.payment;
  }
  
  // Change confidence (payment - total should equal change)
  if (change && payment && total) {
    const expectedChange = payment - total;
    const difference = Math.abs(expectedChange - change);
    
    if (difference < 1000) { // Within 1000 tolerance
      score += weights.change;
    }
  }
  
  // Penalize very messy text
  const noiseRatio = (rawText.match(/[^\w\s]/g) || []).length / Math.max(rawText.length, 1);
  if (noiseRatio > 0.1) {
    score -= 0.1;
  }
  
  return Math.max(0, Math.min(1, score));
}

// ======================
// MAIN PARSER FUNCTION
// ======================
export function parseReceipt(rawText: string): ParsedReceipt {
  if (!rawText || rawText.trim().length === 0) {
    return {
      merchant: "UNKNOWN MERCHANT",
      date: null,
      items: [],
      subtotal: null,
      tax: null,
      total: null,
      payment: null,
      change: null,
      currency: "IDR",
      category: "unknown",
      confidence: 0,
    };
  }

  console.log("🔍 Parsing receipt text:", rawText.substring(0, 200) + "...");

  // Normalize text
  const normalized = normalizeText(rawText);
  
  // Split into lines and clean
  const lines = normalized
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  console.log(`📝 Processing ${lines.length} lines`);

  // Detect currency
  const isIDR = /Rp|IDR|rp|indonesia|INDONESIA/i.test(rawText);
  const currency = isIDR ? "IDR" : "OTHER";

  // Extract components
  const merchant = extractMerchant(lines);
  console.log("🏪 Merchant:", merchant);

  const date = extractDate(lines);
  console.log("📅 Date:", date);

  const items = extractItems(lines);
  console.log(`🛒 Found ${items.length} items:`, 
    items.map(i => `${i.name} (${i.qty}x ${i.price} = ${i.total})`).join(", "));

  // Extract financial data
  const subtotal = findValueByKeywords(lines, ["subtotal", "sub total", "sub-total"]);
  
  const tax = findValueByKeywords(lines, ["tax", "ppn", "pajak", "tax:", "ppn:"]);
  
  const total = findValueByKeywords(lines, [
    "total", "grand total", "grandtotal", "jumlah", "amount",
    "total pembayaran", "total belanja"
  ]);
  
  const payment = findValueByKeywords(lines, [
    "tunai", "cash", "bayar", "payment", "dibayar",
    "pembayaran", "cash:", "tunai:"
  ]);
  
  const change = findValueByKeywords(lines, [
    "kembali", "change", "kembalian", "change:", "kembali:"
  ]);

  console.log("💰 Financial data:", { subtotal, tax, total, payment, change });

  // Detect category
  const category = detectCategory(items, merchant);
  console.log("📂 Category:", category);

  // Calculate confidence
  const confidence = calculateConfidence(merchant, items, total, payment, change, rawText);
  console.log("✨ Confidence:", confidence);

  const result: ParsedReceipt = {
    merchant,
    date,
    items,
    subtotal: subtotal || null,
    tax: tax || null,
    total: total || null,
    payment: payment || null,
    change: change || null,
    currency,
    category,
    confidence: Math.round(confidence * 100) / 100,
  };

  console.log("✅ Final parsed result:", JSON.stringify(result, null, 2));

  return result;
}

// ======================
// ENHANCED PARSER FOR BETTER ACCURACY
// ======================
export function parseReceiptEnhanced(rawText: string): ParsedReceipt {
  const result = parseReceipt(rawText);
  
  // Post-processing improvements
  
  // 1. If no items found, try alternative parsing
  if (result.items.length === 0) {
    console.log("⚠️ No items found with standard parser, trying alternative methods...");
    // Could implement additional parsing strategies here
  }
  
  // 2. If total is missing but items exist, calculate from items
  if (!result.total && result.items.length > 0) {
    const calculatedTotal = result.items.reduce((sum, item) => sum + item.total, 0);
    if (calculatedTotal > 0) {
      result.total = Math.round(calculatedTotal * 100) / 100;
      console.log("🔄 Calculated total from items:", result.total);
    }
  }
  
  // 3. Validate payment and change
  if (result.payment && result.total && !result.change) {
    const calculatedChange = result.payment - result.total;
    if (calculatedChange > 0) {
      result.change = Math.round(calculatedChange * 100) / 100;
      console.log("🔄 Calculated change:", result.change);
    }
  }
  
  // 4. Clean item names
  result.items = result.items.map(item => ({
    ...item,
    name: item.name
      .replace(/[^\w\s&'\-()]/g, "") // Remove special chars
      .replace(/\s+/g, " ") // Normalize spaces
      .trim()
      .toUpperCase(),
  }));
  
  return result;
}