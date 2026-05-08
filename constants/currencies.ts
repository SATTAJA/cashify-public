import currencyCodes from "currency-codes";

type Currency = {
  code: string;
  name: string;
  country: string;
};

// 🔥 mapping negara utama biar UI lebih masuk akal
const preferredCountries: Record<string, string> = {
  IDR: "Indonesia",
  USD: "United States",
  EUR: "European Union",
  GBP: "United Kingdom",
  JPY: "Japan",
  CNY: "China",
  KRW: "South Korea",
  SGD: "Singapore",
  MYR: "Malaysia",
  THB: "Thailand",
  AUD: "Australia",
  CAD: "Canada",
  CHF: "Switzerland",
  HKD: "Hong Kong",
  NZD: "New Zealand",
  INR: "India",
  RUB: "Russia",
  SAR: "Saudi Arabia",
  AED: "United Arab Emirates",
};

export const getAllCurrencies = (): Currency[] => {
  const seen = new Set<string>();

  return currencyCodes.data
    .filter((item) => {
      return (
        item.code &&
        item.currency &&
        item.countries &&
        item.countries.length > 0 &&
        !item.code.startsWith("X") && // buang kode aneh
        item.number && // harus punya numeric ISO
        !seen.has(item.code) // buang duplikat
      );
    })
    .map((item) => {
      seen.add(item.code);

      return {
        code: item.code,
        name: item.currency,

        // 🔥 pakai mapping dulu, fallback ke data asli
        country:
          preferredCountries[item.code] ||
          item.countries.find((c) =>
            c.toLowerCase().includes("united")
          ) ||
          item.countries[0],
      };
    })

    // 🔥 sort lebih enak dibaca (nama dulu, bukan kode)
    .sort((a, b) => a.name.localeCompare(b.name));
};