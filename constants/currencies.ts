// constants/currencies.ts

export type Currency = {
  code: string;
  name: string;
  country: string;
  symbol: string;
};

export const getAllCurrencies = (): Currency[] => {
  return [
    // Asia Tenggara
    { code: "IDR", name: "Rupiah", country: "Indonesia", symbol: "Rp" },
    { code: "USD", name: "US Dollar", country: "Amerika Serikat", symbol: "$" },
    { code: "SGD", name: "Singapore Dollar", country: "Singapura", symbol: "S$" },
    { code: "MYR", name: "Malaysian Ringgit", country: "Malaysia", symbol: "RM" },
    { code: "THB", name: "Thai Baht", country: "Thailand", symbol: "฿" },
    { code: "VND", name: "Vietnamese Dong", country: "Vietnam", symbol: "₫" },
    { code: "PHP", name: "Philippine Peso", country: "Filipina", symbol: "₱" },
    
    // Asia Timur
    { code: "JPY", name: "Japanese Yen", country: "Jepang", symbol: "¥" },
    { code: "CNY", name: "Chinese Yuan", country: "China", symbol: "¥" },
    { code: "KRW", name: "South Korean Won", country: "Korea Selatan", symbol: "₩" },
    
    // Asia Selatan
    { code: "INR", name: "Indian Rupee", country: "India", symbol: "₹" },
    
    // Eropa
    { code: "EUR", name: "Euro", country: "Eropa", symbol: "€" },
    { code: "GBP", name: "British Pound", country: "Inggris", symbol: "£" },
    
    // Oceania
    { code: "AUD", name: "Australian Dollar", country: "Australia", symbol: "A$" },
    
    // Timur Tengah
    { code: "SAR", name: "Saudi Riyal", country: "Arab Saudi", symbol: "﷼" },
    { code: "AED", name: "UAE Dirham", country: "Uni Emirat Arab", symbol: "د.إ" },
    
    // Tambahan lainnya
    { code: "CAD", name: "Canadian Dollar", country: "Kanada", symbol: "C$" },
    { code: "CHF", name: "Swiss Franc", country: "Swiss", symbol: "Fr" },
    { code: "NZD", name: "New Zealand Dollar", country: "Selandia Baru", symbol: "NZ$" },
    { code: "ZAR", name: "South African Rand", country: "Afrika Selatan", symbol: "R" },
    { code: "RUB", name: "Russian Ruble", country: "Rusia", symbol: "₽" },
    { code: "BRL", name: "Brazilian Real", country: "Brazil", symbol: "R$" },
    { code: "MXN", name: "Mexican Peso", country: "Meksiko", symbol: "$" },
    { code: "TRY", name: "Turkish Lira", country: "Turki", symbol: "₺" },
    { code: "HKD", name: "Hong Kong Dollar", country: "Hong Kong", symbol: "HK$" },
    { code: "TWD", name: "New Taiwan Dollar", country: "Taiwan", symbol: "NT$" },
  ];
};

// Fungsi untuk mendapatkan simbol mata uang berdasarkan kode
export const getCurrencySymbol = (code: string): string => {
  const currencies = getAllCurrencies();
  const currency = currencies.find(c => c.code === code);
  return currency?.symbol || code;
};

// Fungsi untuk mendapatkan nama mata uang berdasarkan kode
export const getCurrencyName = (code: string): string => {
  const currencies = getAllCurrencies();
  const currency = currencies.find(c => c.code === code);
  return currency?.name || code;
};