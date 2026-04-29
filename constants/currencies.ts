import currencyCodes from "currency-codes";

export const getAllCurrencies = () => {
  const seen = new Set();

  return currencyCodes.data
    .filter((item) => {
      return (
        item.code &&
        item.currency &&
        item.countries &&
        item.countries.length > 0 &&

        // 🚫 buang semua kode aneh
        !item.code.startsWith("X") &&

        // 🚫 buang yang ga punya numeric ISO
        item.number &&

        // 🚫 buang duplikat
        !seen.has(item.code)
      );
    })
    .map((item) => {
      seen.add(item.code);

      return {
        code: item.code,
        name: item.currency,
        country: item.countries[0], // optional
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
};