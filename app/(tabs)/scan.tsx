// app/scan.tsx

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";

import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";

import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File as ExpoFile } from "expo-file-system";
import Constants from "expo-constants";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { scanReceiptOCR } from "../../lib/ocr";

const { width } = Dimensions.get("window");

const AI_BACKEND_PORT = "3001";

const getAIBackendBaseUrl = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    "";

  const host = hostUri
    .replace("exp://", "")
    .replace("http://", "")
    .replace("https://", "")
    .split(":")[0];

  if (host) {
    return `http://${host}:${AI_BACKEND_PORT}`;
  }

  return `http://localhost:${AI_BACKEND_PORT}`;
};

const AI_API_BASE_URL = getAIBackendBaseUrl();


type ReceiptItem = {
  name: string;
  qty: number;
  price: number;
  total: number;
  discount: number;
  finalTotal: number;
};

type ReceiptData = {
  merchant: string;
  date: string;
  time: string;
  items: ReceiptItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  cash: number;
  change: number;
  saved: number;
  tax: number;
  serviceCharge: number;
  paymentMethod: string;
  rawText: string;
};

export default function ScanPage() {
  const cameraRef = useRef<any>(null);

  const [permission, requestPermission] =
    useCameraPermissions();

  const [flashMode, setFlashMode] =
    useState<"off" | "torch">("off");

  const [loading, setLoading] =
    useState(false);

  const [ocrText, setOcrText] =
    useState("");

  const scanAnim = useRef(
    new Animated.Value(0)
  ).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scanAnim]);

  // ======================
  // OCR NORMALIZER
  // ======================

  const normalizeOCRText = (text: string) => {
    return text
      .replace(/\r/g, "\n")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[|]/g, "I")
      .replace(/[¥]/g, "Y")
      .replace(/\bR[Pp]\b/g, "Rp")
      .replace(/\bRPM\b/gi, "RP")
      .replace(/\b1DR\b/gi, "IDR")
      .replace(/\bTUTAL\b/gi, "TOTAL")
      .replace(/\bT0TAL\b/gi, "TOTAL")
      .replace(/\bTOTAI\b/gi, "TOTAL")
      .replace(/\bT0TAI\b/gi, "TOTAL")
      .replace(/\bSUB T0TAL\b/gi, "SUBTOTAL")
      .replace(/\bSUB-TOTAL\b/gi, "SUBTOTAL")
      .replace(/\bTUNAT\b/gi, "TUNAI")
      .replace(/\bTUNA1\b/gi, "TUNAI")
      .replace(/\bTUNAL\b/gi, "TUNAI")
      .replace(/\bKEMGALI\b/gi, "KEMBALI")
      .replace(/\bKEMGALT\b/gi, "KEMBALI")
      .replace(/\bKEMBALT\b/gi, "KEMBALI")
      .replace(/\bKEMBAL1\b/gi, "KEMBALI")
      .replace(/\bKEMBALl\b/gi, "KEMBALI")
      .replace(/\bHARCA JUAL\b/gi, "HARGA JUAL")
      .replace(/\bDISK0N\b/gi, "DISKON")
      .replace(/\bDISC\b/gi, "DISKON")
      .replace(/\bD1SC\b/gi, "DISKON")
      .replace(/\bP0TONGAN\b/gi, "POTONGAN")
      .replace(/\bPPM\b/gi, "PPN")
      .replace(/\bPAJ4K\b/gi, "PAJAK")
      .replace(/\bQTY\b/gi, "QTY");
  };

  const normalizeLine = (line: string) => {
    return normalizeOCRText(line)
      .replace(/\s*,\s*/g, ",")
      .replace(/\s*\.\s*/g, ".")
      .replace(/\s+/g, " ")
      .trim();
  };

  const getLines = (text: string) => {
    return normalizeOCRText(text)
      .split("\n")
      .map(normalizeLine)
      .filter(Boolean);
  };

  // ======================
  // MONEY PARSER
  // ======================

  const parseMoney = (value?: string) => {
    if (!value) return 0;

    const isNegative =
      value.includes("(") ||
      value.includes("-");

    let cleaned = value
      .replace(/Rp/gi, "")
      .replace(/IDR/gi, "")
      .replace(/[^\d.,]/g, "");

    if (!cleaned) return 0;

    const hasThousandSeparator =
      /[.,]\d{3}/.test(cleaned);

    const hasDecimalEnding =
      /[.,]\d{2}$/.test(cleaned);

    if (
      hasThousandSeparator &&
      hasDecimalEnding
    ) {
      cleaned = cleaned.replace(
        /[.,]\d{2}$/,
        ""
      );
    }

    cleaned = cleaned.replace(/[.,]/g, "");

    const number = Number(cleaned);

    if (!Number.isFinite(number)) return 0;

    return isNegative ? -number : number;
  };

  const moneyRegex =
    /(?:Rp|IDR)?\s*\(?-?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?\)?|(?:Rp|IDR)?\s*\(?-?\d{4,}(?:[.,]\d{2})?\)?/gi;

  const getMoneyMatchesFromLine = (
    line: string
  ) => {
    return line.match(moneyRegex) || [];
  };

  const getMoneyValuesFromLine = (
    line: string
  ) => {
    return getMoneyMatchesFromLine(line)
      .map(parseMoney)
      .filter((value) => value !== 0);
  };

  const isAmount = (amount: number) => {
    const absolute = Math.abs(amount);

    return (
      absolute >= 1 &&
      absolute <= 100000000
    );
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Math.abs(amount || 0));
  };

  // ======================
  // LINE CHECKER
  // ======================

  const isSeparatorLine = (line: string) => {
    return /^[-=_*]{4,}$/.test(
      line.replace(/\s/g, "")
    );
  };

  const isSummaryLine = (line: string) => {
    const upper = line.toUpperCase();

    return /SUBTOTAL|SUB TOTAL|TOTAL|GRAND TOTAL|HARGA JUAL|TUNAI|CASH|BAYAR|DIBAYAR|KEMBALI|KEMBALIAN|CHANGE|DISKON TOTAL|POTONGAN TOTAL|ANDA HEMAT|HEMAT|PPN|PAJAK|TAX|SERVICE|LAYANAN|ADMIN|ROUNDING|PEMBULATAN/.test(
      upper
    );
  };

  const isHardStopLine = (line: string) => {
    const upper = line.toUpperCase();

    return /SUBTOTAL|SUB TOTAL|GRAND TOTAL|TOTAL BELANJA|TOTAL BAYAR|TOTAL HARGA|HARGA JUAL|PEMBAYARAN|TUNAI|CASH|KEMBALI|KEMBALIAN/.test(
      upper
    );
  };

  const isHeaderLine = (line: string) => {
    const upper = line.toUpperCase();

    return /NO\.|ORDER|STRUK|RECEIPT|INVOICE|NOTA|KASIR|CASHIER|CUSTOMER|MEMBER|POINT|POIN|NPWP|TELP|PHONE|CALL|EMAIL|WWW|HTTP|JL\.|JALAN|RUKO|RT\.|RW\.|TOKO|CABANG|STORE|OUTLET|INDOMARET|ALFAMART|ALFAMIDI|POINT COFFEE|LAWSON|SUPERINDO|HYPERMART|ALFAGIFT|TERIMA KASIH|THANK YOU|SELAMAT|PROMO|VOUCHER|KU PON|KUPON/.test(
      upper
    );
  };

  const isPossibleItemName = (
    value: string
  ) => {
    const text = value.trim();

    if (text.length < 2) return false;
    if (!/[A-Za-z]/.test(text)) return false;
    if (isSeparatorLine(text)) return false;
    if (isSummaryLine(text)) return false;
    if (isHeaderLine(text)) return false;

    return true;
  };

  const cleanItemName = (name: string) => {
    return name
      .replace(/^\d+\s*[.)-]?\s*/, "")
      .replace(/\bRp\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // ======================
  // LABEL PARSER
  // ======================

  const lineHasAny = (
    line: string,
    labels: string[]
  ) => {
    const upper = line.toUpperCase();

    return labels.some((label) =>
      upper.includes(label.toUpperCase())
    );
  };

  const findAmountByLabel = (
    lines: string[],
    labels: string[],
    excludeLabels: string[] = []
  ) => {
    for (let i = 0; i < lines.length; i++) {
      const upper = lines[i].toUpperCase();

      const hasLabel = labels.some((label) =>
        upper.includes(label.toUpperCase())
      );

      const hasExclude =
        excludeLabels.length > 0 &&
        excludeLabels.some((label) =>
          upper.includes(label.toUpperCase())
        );

      if (!hasLabel || hasExclude) continue;

      const sameLineAmounts =
        getMoneyValuesFromLine(lines[i]).filter(
          isAmount
        );

      if (sameLineAmounts.length > 0) {
        return Math.abs(
          sameLineAmounts[
            sameLineAmounts.length - 1
          ]
        );
      }

      for (
        let next = i + 1;
        next <= i + 2;
        next++
      ) {
        if (!lines[next]) continue;

        const nextAmounts =
          getMoneyValuesFromLine(
            lines[next]
          ).filter(isAmount);

        if (nextAmounts.length > 0) {
          return Math.abs(
            nextAmounts[
              nextAmounts.length - 1
            ]
          );
        }
      }
    }

    return 0;
  };

  const sumAmountsByLabel = (
    lines: string[],
    labels: string[]
  ) => {
    let total = 0;

    for (const line of lines) {
      if (!lineHasAny(line, labels)) continue;

      const amounts =
        getMoneyValuesFromLine(line).filter(
          isAmount
        );

      if (amounts.length > 0) {
        total += Math.abs(
          amounts[amounts.length - 1]
        );
      }
    }

    return total;
  };

  // ======================
  // DATE & PAYMENT PARSER
  // ======================

  const parseDateTime = (lines: string[]) => {
    let date = "";
    let time = "";

    for (const line of lines) {
      const dateMatch = line.match(
        /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/
      );

      const timeMatch = line.match(
        /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/
      );

      if (!date && dateMatch) {
        date = dateMatch[1];
      }

      if (!time && timeMatch) {
        time = timeMatch[1];
      }

      if (date && time) break;
    }

    return { date, time };
  };

  const parsePaymentMethod = (
    lines: string[]
  ) => {
    const joined = lines
      .join(" ")
      .toUpperCase();

    if (/QRIS|QR CODE/.test(joined)) {
      return "QRIS";
    }

    if (/DEBIT|KARTU DEBIT|ATM/.test(joined)) {
      return "Debit";
    }

    if (/CREDIT|KREDIT|VISA|MASTERCARD/.test(joined)) {
      return "Kartu Kredit";
    }

    if (/GOPAY|OVO|DANA|SHOPEEPAY|LINKAJA/.test(joined)) {
      return "E-Wallet";
    }

    if (/TUNAI|CASH/.test(joined)) {
      return "Tunai";
    }

    return "Tidak diketahui";
  };

  // ======================
  // MERCHANT PARSER
  // ======================

  const parseMerchant = (
    lines: string[]
  ) => {
    const knownMerchantLine = lines.find(
      (line) =>
        /INDOMARET|ALFAMART|ALFAMIDI|POINT COFFEE|LAWSON|SUPERINDO|HYPERMART|TRANSMART|CARREFOUR|MCD|KFC|RICHEESE|MIXUE|JANJI JIWA|CHATIME|KOPI KENANGAN/i.test(
          line
        )
    );

    if (knownMerchantLine) {
      return knownMerchantLine;
    }

    const firstReadableLine = lines.find(
      (line) => {
        if (isSeparatorLine(line)) return false;
        if (/^\d/.test(line)) return false;
        if (isSummaryLine(line)) return false;
        if (/Rp|IDR/i.test(line)) return false;
        if (line.length < 3) return false;

        return true;
      }
    );

    return firstReadableLine || "Struk Belanja";
  };

  // ======================
  // ITEM PARSER
  // ======================

  const makeItem = (
    name: string,
    qty: number,
    price: number,
    total?: number
  ): ReceiptItem | null => {
    const cleanName = cleanItemName(name);
    const safeQty =
      Number.isFinite(qty) && qty > 0
        ? qty
        : 1;

    const safePrice = Math.abs(price || 0);
    const calculatedTotal =
      safeQty * safePrice;

    const safeTotal =
      total && total > 0
        ? Math.abs(total)
        : calculatedTotal;

    if (!isPossibleItemName(cleanName)) {
      return null;
    }

    if (safePrice <= 0 && safeTotal <= 0) {
      return null;
    }

    return {
      name: cleanName,
      qty: safeQty,
      price:
        safePrice > 0
          ? safePrice
          : safeTotal / safeQty,
      total: safeTotal,
      discount: 0,
      finalTotal: safeTotal,
    };
  };

  const parseItemLine = (
    line: string
  ): ReceiptItem | null => {
    const normalized = normalizeLine(line);

    if (!normalized) return null;
    if (isSeparatorLine(normalized)) return null;
    if (isSummaryLine(normalized)) return null;
    if (isHeaderLine(normalized)) return null;

    const upper = normalized.toUpperCase();

    if (/DISKON|POTONGAN|VOUCHER|PROMO/.test(upper)) {
      return null;
    }

    const moneyMatches =
      getMoneyMatchesFromLine(normalized);

    if (moneyMatches.length === 0) {
      return null;
    }

    // Format:
    // Nama Barang 2 x 5.000 10.000
    const qtyXPriceTotal = normalized.match(
      /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*[xX*]\s*(?:Rp|IDR)?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s+(?:Rp|IDR)?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})$/
    );

    if (qtyXPriceTotal) {
      return makeItem(
        qtyXPriceTotal[1],
        Number(
          qtyXPriceTotal[2].replace(",", ".")
        ),
        parseMoney(qtyXPriceTotal[3]),
        parseMoney(qtyXPriceTotal[4])
      );
    }

    // Format:
    // Nama Barang 2 5.000 10.000
    const qtyPriceTotal = normalized.match(
      /^(.+?)\s+(\d{1,3})\s+(?:Rp|IDR)?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s+(?:Rp|IDR)?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})$/
    );

    if (qtyPriceTotal) {
      const qty = Number(qtyPriceTotal[2]);
      const price = parseMoney(
        qtyPriceTotal[3]
      );
      const total = parseMoney(
        qtyPriceTotal[4]
      );

      if (
        qty > 0 &&
        qty <= 999 &&
        Math.abs(total - qty * price) <=
          Math.max(1000, price)
      ) {
        return makeItem(
          qtyPriceTotal[1],
          qty,
          price,
          total
        );
      }
    }

    // Format:
    // Nama Barang @5.000 2 10.000
    const atPriceQtyTotal = normalized.match(
      /^(.+?)\s+@?\s*(?:Rp|IDR)?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s+(\d{1,3})\s+(?:Rp|IDR)?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})$/
    );

    if (atPriceQtyTotal) {
      return makeItem(
        atPriceQtyTotal[1],
        Number(atPriceQtyTotal[3]),
        parseMoney(atPriceQtyTotal[2]),
        parseMoney(atPriceQtyTotal[4])
      );
    }

    // Format:
    // Nama Barang 5.000
    if (moneyMatches.length === 1) {
      const firstMatch = moneyMatches[0];

      if (!firstMatch) {
        return null;
      }

      const amount = parseMoney(firstMatch);

      const name = normalized
        .replace(firstMatch, "")
        .trim();

      if (amount > 0) {
        return makeItem(name, 1, amount, amount);
      }
    }

    // Format umum:
    // Nama Barang 5.000 10.000
    // dianggap qty 1, harga terakhir sebagai total.
    if (moneyMatches.length >= 2) {
  const firstMatch = moneyMatches[0];
  const lastMatch =
    moneyMatches[moneyMatches.length - 1];

  if (!firstMatch || !lastMatch) {
    return null;
  }

  const firstAmount = parseMoney(firstMatch);
  const lastAmount = parseMoney(lastMatch);

  const firstIndex =
    normalized.indexOf(firstMatch);

  const name =
    firstIndex >= 0
      ? normalized.slice(0, firstIndex).trim()
      : normalized
          .replace(firstMatch, "")
          .trim();

  return makeItem(
    name,
    1,
    firstAmount,
    lastAmount
  );
}

    return null;
  };

  const parsePendingNameWithAmountLine = (
    nameLine: string,
    amountLine: string
  ) => {
    const normalized =
      normalizeLine(amountLine);

    // Format:
    // 2 x 5.000 10.000
    const qtyXPriceTotal = normalized.match(
      /^(\d+(?:[.,]\d+)?)\s*[xX*]\s*(?:Rp|IDR)?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s+(?:Rp|IDR)?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})$/
    );

    if (qtyXPriceTotal) {
      return makeItem(
        nameLine,
        Number(
          qtyXPriceTotal[1].replace(",", ".")
        ),
        parseMoney(qtyXPriceTotal[2]),
        parseMoney(qtyXPriceTotal[3])
      );
    }

    // Format:
    // 5.000
    const amounts =
      getMoneyValuesFromLine(normalized).filter(
        isAmount
      );

    if (amounts.length === 1) {
      return makeItem(
        nameLine,
        1,
        Math.abs(amounts[0]),
        Math.abs(amounts[0])
      );
    }

    if (amounts.length >= 2) {
      const qtyMatch = normalized.match(
        /^(\d{1,3})\s+/
      );

      const qty = qtyMatch
        ? Number(qtyMatch[1])
        : 1;

      const price =
        amounts.length >= 2
          ? Math.abs(amounts[0])
          : Math.abs(amounts[amounts.length - 1]);

      const total = Math.abs(
        amounts[amounts.length - 1]
      );

      return makeItem(
        nameLine,
        qty,
        price,
        total
      );
    }

    return null;
  };

  const applyDiscountToLastItem = (
    items: ReceiptItem[],
    discount: number
  ) => {
    if (items.length === 0) return items;

    const lastIndex = items.length - 1;
    const lastItem = items[lastIndex];

    const updated: ReceiptItem = {
      ...lastItem,
      discount:
        lastItem.discount + Math.abs(discount),
      finalTotal: Math.max(
        lastItem.finalTotal - Math.abs(discount),
        0
      ),
    };

    const clone = [...items];
    clone[lastIndex] = updated;

    return clone;
  };

  const parseReceiptItems = (
    lines: string[]
  ) => {
    let items: ReceiptItem[] = [];
    let pendingName = "";
    let reachedSummary = false;

    for (const line of lines) {
      const upper = line.toUpperCase();

      if (isHardStopLine(line)) {
        reachedSummary = true;
      }

      const isDiscountLine =
        /DISKON|POTONGAN|VOUCHER|PROMO/.test(
          upper
        );

      if (
        isDiscountLine &&
        !reachedSummary &&
        items.length > 0
      ) {
        const amounts =
          getMoneyValuesFromLine(line).filter(
            isAmount
          );

        if (amounts.length > 0) {
          items = applyDiscountToLastItem(
            items,
            Math.abs(
              amounts[amounts.length - 1]
            )
          );
        }

        continue;
      }

      if (reachedSummary) continue;

      const directItem = parseItemLine(line);

      if (directItem) {
        items.push(directItem);
        pendingName = "";
        continue;
      }

      if (
        pendingName &&
        getMoneyMatchesFromLine(line).length > 0
      ) {
        const pendingItem =
          parsePendingNameWithAmountLine(
            pendingName,
            line
          );

        if (pendingItem) {
          items.push(pendingItem);
          pendingName = "";
          continue;
        }
      }

      if (
        isPossibleItemName(line) &&
        getMoneyMatchesFromLine(line).length === 0
      ) {
        pendingName = line;
      }
    }

    return items;
  };

  // ======================
  // FULL RECEIPT PARSER
  // ======================

  const parseReceipt = (
    text: string
  ): ReceiptData => {
    const cleanedText =
      normalizeOCRText(text);

    const lines = getLines(cleanedText);

    const items = parseReceiptItems(lines);

    const { date, time } =
      parseDateTime(lines);

    const subtotalByLabel = findAmountByLabel(
      lines,
      [
        "SUBTOTAL",
        "SUB TOTAL",
        "HARGA JUAL",
        "TOTAL HARGA",
        "JUMLAH",
      ],
      [
        "DISKON",
        "POTONGAN",
        "KEMBALI",
        "TUNAI",
        "CASH",
      ]
    );

    const totalByLabel = findAmountByLabel(
      lines,
      [
        "GRAND TOTAL",
        "TOTAL BAYAR",
        "TOTAL BELANJA",
        "TOTAL",
        "TAGIHAN",
      ],
      [
        "SUBTOTAL",
        "SUB TOTAL",
        "DISKON",
        "POTONGAN",
        "KEMBALI",
        "KEMBALIAN",
        "QTY",
        "ITEM",
      ]
    );

    const cash = findAmountByLabel(lines, [
      "TUNAI",
      "CASH",
      "BAYAR",
      "DIBAYAR",
      "JUMLAH BAYAR",
    ]);

    let change = findAmountByLabel(lines, [
      "KEMBALI",
      "KEMBALIAN",
      "CHANGE",
    ]);

    const saved = findAmountByLabel(lines, [
      "ANDA HEMAT",
      "HEMAT",
    ]);

    const tax = findAmountByLabel(lines, [
      "PPN",
      "PAJAK",
      "TAX",
    ]);

    const serviceCharge =
      findAmountByLabel(lines, [
        "SERVICE",
        "LAYANAN",
        "ADMIN",
      ]);

    const summaryDiscount =
      sumAmountsByLabel(lines, [
        "DISKON TOTAL",
        "TOTAL DISKON",
        "POTONGAN TOTAL",
        "VOUCHER",
      ]);

    const itemGrossTotal = items.reduce(
      (sum, item) => sum + item.total,
      0
    );

    const itemFinalTotal = items.reduce(
      (sum, item) => sum + item.finalTotal,
      0
    );

    const itemDiscountTotal = items.reduce(
      (sum, item) => sum + item.discount,
      0
    );

    const subtotal =
      subtotalByLabel || itemGrossTotal;

    const totalDiscount =
      summaryDiscount ||
      itemDiscountTotal ||
      saved ||
      Math.max(subtotal - totalByLabel, 0);

    const calculatedTotal = Math.max(
      subtotal -
        totalDiscount +
        tax +
        serviceCharge,
      0
    );

    const total =
      totalByLabel ||
      itemFinalTotal ||
      calculatedTotal;

    if (
      !change &&
      cash > 0 &&
      total > 0 &&
      cash >= total
    ) {
      change = cash - total;
    }

    return {
      merchant: parseMerchant(lines),
      date,
      time,
      items,
      subtotal,
      totalDiscount,
      total,
      cash,
      change,
      saved,
      tax,
      serviceCharge,
      paymentMethod: parsePaymentMethod(lines),
      rawText: cleanedText,
    };
  };

  const buildReceiptNote = (
    receipt: ReceiptData
  ) => {
    const itemLines =
      receipt.items.length > 0
        ? receipt.items.map((item, index) => {
            const discountText =
              item.discount > 0
                ? ` | Diskon: ${formatRupiah(
                    item.discount
                  )}`
                : "";

            return `${index + 1}. ${
              item.name
            } | Qty: ${item.qty} | Harga: ${formatRupiah(
              item.price
            )} | Total: ${formatRupiah(
              item.finalTotal
            )}${discountText}`;
          })
        : ["Barang tidak terdeteksi jelas"];

    return [
      `Merchant: ${receipt.merchant}`,
      receipt.date
        ? `Tanggal: ${receipt.date}`
        : "",
      receipt.time
        ? `Waktu: ${receipt.time}`
        : "",
      `Metode Bayar: ${receipt.paymentMethod}`,
      "",
      "BARANG/JASA:",
      ...itemLines,
      "",
      "RINGKASAN:",
      `Subtotal: ${formatRupiah(
        receipt.subtotal
      )}`,
      `Diskon: ${formatRupiah(
        receipt.totalDiscount
      )}`,
      `Pajak/PPN: ${formatRupiah(
        receipt.tax
      )}`,
      `Biaya Layanan/Admin: ${formatRupiah(
        receipt.serviceCharge
      )}`,
      `Total: ${formatRupiah(receipt.total)}`,
      `Bayar/Tunai: ${formatRupiah(
        receipt.cash
      )}`,
      `Kembalian: ${formatRupiah(
        receipt.change
      )}`,
      `Anda Hemat: ${formatRupiah(
        receipt.saved
      )}`,
      "",
      "OCR ASLI:",
      receipt.rawText,
    ]
      .filter((line) => line !== "")
      .join("\n");
  };

  // ======================
  // IMAGE PREPARE
  // ======================

const MAX_OCR_SIZE = 1450 * 1024; 
// 1.45 MB, dibuat sedikit di bawah limit 1.5 MB biar aman

const getFileSize = async (uri: string) => {
  try {
    const file = new ExpoFile(uri);

    if (!file.exists) {
      return 0;
    }

    return file.size || 0;
  } catch (error) {
    console.log("GET FILE SIZE ERROR:", error);
    return 0;
  }
};

const prepareImageForOCR = async (uri: string) => {
  const resizeWidths = [1400, 1200, 1000, 850, 700];
  const qualities = [0.75, 0.6, 0.45, 0.35, 0.25];

  let finalUri = uri;
  let finalSize = await getFileSize(uri);

  console.log("ORIGINAL IMAGE SIZE:", finalSize);

  for (const width of resizeWidths) {
    for (const quality of qualities) {
      const manipulated =
        await ImageManipulator.manipulateAsync(
          uri,
          [
            {
              resize: {
                width,
              },
            },
          ],
          {
            compress: quality,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

      const size = await getFileSize(manipulated.uri);

      console.log(
        `COMPRESSED IMAGE width=${width}, quality=${quality}, size=${size}`
      );

      finalUri = manipulated.uri;
      finalSize = size;

      if (size > 0 && size <= MAX_OCR_SIZE) {
        return manipulated.uri;
      }
    }
  }

  if (finalSize > MAX_OCR_SIZE) {
    Alert.alert(
      "Foto Terlalu Besar",
      "Gambar masih terlalu besar untuk OCR gratis. Coba foto ulang lebih dekat, crop bagian struk saja, atau gunakan gambar yang lebih kecil."
    );
  }

  return finalUri;
};


  // ======================
  // AI EXTRACTOR
  // ======================

  const normalizeAIReceipt = (
    data: any,
    rawText: string
  ): ReceiptData => {
    const items = Array.isArray(data?.items)
      ? data.items
          .filter((item: any) => item?.name)
          .map((item: any) => {
            const qty =
              Number(item.qty) > 0
                ? Number(item.qty)
                : 1;

            const price =
              Number(item.price) > 0
                ? Math.round(Number(item.price))
                : 0;

            const total =
              Number(item.total) > 0
                ? Math.round(Number(item.total))
                : Math.round(qty * price);

            const discount =
              Number(item.discount) > 0
                ? Math.round(Number(item.discount))
                : 0;

            const finalTotal =
              Number(item.finalTotal) > 0
                ? Math.round(Number(item.finalTotal))
                : Math.max(total - discount, 0);

            return {
              name: String(item.name).trim(),
              qty,
              price,
              total,
              discount,
              finalTotal,
            };
          })
      : [];

    const subtotal =
      Number(data?.subtotal) > 0
        ? Math.round(Number(data.subtotal))
        : items.reduce(
            (sum: number, item: ReceiptItem) =>
              sum + item.total,
            0
          );

    const totalDiscount =
      Number(data?.totalDiscount) > 0
        ? Math.round(Number(data.totalDiscount))
        : items.reduce(
            (sum: number, item: ReceiptItem) =>
              sum + item.discount,
            0
          );

    const tax =
      Number(data?.tax) > 0
        ? Math.round(Number(data.tax))
        : 0;

    const serviceCharge =
      Number(data?.serviceCharge) > 0
        ? Math.round(Number(data.serviceCharge))
        : 0;

    const total =
      Number(data?.total) > 0
        ? Math.round(Number(data.total))
        : Math.max(
            subtotal -
              totalDiscount +
              tax +
              serviceCharge,
            0
          );

    const cash =
      Number(data?.cash) > 0
        ? Math.round(Number(data.cash))
        : 0;

    const change =
      Number(data?.change) > 0
        ? Math.round(Number(data.change))
        : cash >= total
          ? cash - total
          : 0;

    return {
      merchant:
        String(data?.merchant || "").trim() ||
        "Struk Belanja",
      date: String(data?.date || "").trim(),
      time: String(data?.time || "").trim(),
      items,
      subtotal,
      totalDiscount,
      total,
      cash,
      change,
      saved:
        Number(data?.saved) > 0
          ? Math.round(Number(data.saved))
          : 0,
      tax,
      serviceCharge,
      paymentMethod:
        String(data?.paymentMethod || "").trim() ||
        "Tidak diketahui",
      rawText,
    };
  };

  const extractReceiptWithAI = async (
    rawOcrText: string
  ): Promise<ReceiptData | null> => {
    try {
      console.log(
        "AI BACKEND URL:",
        AI_API_BASE_URL
      );

      const response = await fetch(
        `${AI_API_BASE_URL}/api/receipt-ai/extract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ocrText: rawOcrText,
          }),
        }
      );

      const json = await response.json();

      if (!response.ok || !json.success) {
        console.log("AI BACKEND ERROR:", json);
        return null;
      }

      return normalizeAIReceipt(
        json.data,
        rawOcrText
      );
    } catch (error) {
      console.log("AI FETCH ERROR:", error);
      return null;
    }
  };

  // ======================
  // OCR PROCESS
  // ======================

  const processOCR = async (
    imageUri: string
  ) => {
    try {
      setLoading(true);

      const text =
        await scanReceiptOCR(imageUri);

      if (!text || text.trim() === "") {
        setLoading(false);

        Alert.alert(
          "Gagal",
          "Teks pada struk tidak ditemukan. Pastikan foto terang, tidak blur, dan seluruh struk terlihat."
        );

        return;
      }

      const aiReceipt =
        await extractReceiptWithAI(text);

      const receipt =
        aiReceipt || parseReceipt(text);

      setOcrText(receipt.rawText);

      const hasResult =
        receipt.total > 0 ||
        receipt.items.length > 0;

      if (!hasResult) {
        setLoading(false);

        Alert.alert(
          "Struk Terbaca",
          "Teks berhasil dibaca, tapi data total/barang belum terdeteksi jelas. Coba foto ulang lebih dekat dan terang."
        );

        return;
      }

      setLoading(false);

      router.push({
        pathname: "/resultscan",
        params: {
          amount: receipt.total.toString(),
          total: receipt.total.toString(),
          subtotal: receipt.subtotal.toString(),
          discount:
            receipt.totalDiscount.toString(),
          cash: receipt.cash.toString(),
          change: receipt.change.toString(),
          saved: receipt.saved.toString(),
          tax: receipt.tax.toString(),
          serviceCharge:
            receipt.serviceCharge.toString(),
          merchant: receipt.merchant,
          date: receipt.date,
          time: receipt.time,
          paymentMethod:
            receipt.paymentMethod,
          items: JSON.stringify(receipt.items),
          note: buildReceiptNote(receipt),
          rawText: receipt.rawText,
          type: "expense",
          fromScan: "true",
          extractMode:
            aiReceipt ? "ai" : "parser",
        },
      });
    } catch (error) {
      setLoading(false);

      console.log("OCR ERROR:", error);

      Alert.alert(
        "Error",
        "Gagal scan struk. Coba ulangi lagi dengan foto yang lebih jelas."
      );
    }
  };

  // ======================
  // PICK IMAGE
  // ======================

  const pickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Izin Ditolak",
          "Izin galeri diperlukan untuk memilih foto struk."
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes:
              ImagePicker.MediaTypeOptions
                .Images,
            allowsEditing: true,
            quality: 1,
          }
        );

      if (result.canceled) return;

      const image = result.assets[0];

      const preparedUri =
        await prepareImageForOCR(image.uri);

      await processOCR(preparedUri);
    } catch (error) {
      setLoading(false);

      console.log("PICK IMAGE ERROR:", error);

      Alert.alert(
        "Error",
        "Gagal memilih gambar struk."
      );
    }
  };

  // ======================
  // TAKE PHOTO
  // ======================

  const takePhoto = async () => {
    try {
      if (!cameraRef.current) return;

      setLoading(true);

      const photo =
        await cameraRef.current.takePictureAsync(
          {
            quality: 1,
            base64: false,
            skipProcessing: false,
          }
        );

      const preparedUri =
        await prepareImageForOCR(photo.uri);

      await processOCR(preparedUri);
    } catch (error) {
      setLoading(false);

      console.log("TAKE PHOTO ERROR:", error);

      Alert.alert(
        "Error",
        "Gagal mengambil gambar struk."
      );
    }
  };

  // ======================
  // PERMISSION
  // ======================

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons
          name="camera-outline"
          size={72}
          color="#44DA76"
        />

        <Text style={styles.permissionTitle}>
          Izin Kamera Dibutuhkan
        </Text>

        <Text style={styles.permissionText}>
          Gunakan kamera untuk scan struk
          dan input pengeluaran otomatis.
        </Text>

        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text
            style={
              styles.permissionButtonText
            }
          >
            Izinkan Kamera
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const translateY =
    scanAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 210],
    });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={
          flashMode === "torch"
        }
      />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.topButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color="white"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Scan Struk
          </Text>

          <View style={{ width: 44 }} />
        </View>

        <View style={styles.scanWrapper}>
          <Text style={styles.scanTitle}>
            Arahkan Kamera ke Struk
          </Text>

          <Text style={styles.scanSubtitle}>
            Pastikan struk terang, tidak
            blur, dan seluruh bagian terlihat.
          </Text>

          <View style={styles.scanFrame}>
            <View
              style={[
                styles.corner,
                styles.topLeft,
              ]}
            />

            <View
              style={[
                styles.corner,
                styles.topRight,
              ]}
            />

            <View
              style={[
                styles.corner,
                styles.bottomLeft,
              ]}
            />

            <View
              style={[
                styles.corner,
                styles.bottomRight,
              ]}
            />

            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [
                    { translateY },
                  ],
                },
              ]}
            />
          </View>

          {!!ocrText && (
            <View style={styles.resultBox}>
              <Text
                style={styles.resultTitle}
              >
                Hasil OCR
              </Text>

              <Text
                style={styles.resultText}
                numberOfLines={7}
              >
                {ocrText}
              </Text>
            </View>
          )}
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator
              size="large"
              color="#44DA76"
            />

            <Text style={styles.loadingText}>
              Memindai dan mengekstrak data
              struk...
            </Text>
          </View>
        )}

        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.sideButton}
            onPress={pickImage}
            disabled={loading}
          >
            <Ionicons
              name="images-outline"
              size={24}
              color="white"
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.captureOuter}
            onPress={takePhoto}
            disabled={loading}
          >
            <View style={styles.captureMiddle}>
              <View style={styles.captureBase}>
                <View
                  style={styles.captureInner}
                >
                  <Ionicons
                    name="scan"
                    size={34}
                    color="#151716"
                  />
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sideButton,
              flashMode === "torch" && {
                backgroundColor:
                  "#44DA76",
              },
            ]}
            onPress={() => {
              setFlashMode((prev) =>
                prev === "off"
                  ? "torch"
                  : "off"
              );
            }}
            disabled={loading}
          >
            <Ionicons
              name={
                flashMode === "torch"
                  ? "flash"
                  : "flash-outline"
              }
              size={24}
              color={
                flashMode === "torch"
                  ? "#151716"
                  : "white"
              }
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  permissionContainer: {
    flex: 1,
    backgroundColor: "#151716",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  permissionTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 24,
  },

  permissionText: {
    color: "#999",
    fontSize: 15,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },

  permissionButton: {
    marginTop: 28,
    backgroundColor: "#44DA76",
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 18,
  },

  permissionButtonText: {
    color: "#151716",
    fontSize: 16,
    fontWeight: "700",
  },

  overlay: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.35)",
  },

  header: {
    marginTop: 60,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  topButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor:
      "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },

  scanWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 70,
  },

  scanTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
  },

  scanSubtitle: {
    color: "#D1D1D1",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 28,
    paddingHorizontal: 30,
    lineHeight: 20,
  },

  scanFrame: {
    width: width * 0.78,
    height: width * 1.05,
    borderRadius: 28,
    overflow: "hidden",
  },

  corner: {
    position: "absolute",
    width: 42,
    height: 42,
    borderColor: "#44DA76",
    zIndex: 10,
  },

  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 24,
  },

  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 24,
  },

  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 24,
  },

  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 24,
  },

  scanLine: {
    width: "100%",
    height: 3,
    backgroundColor: "#44DA76",
  },

  bottomContainer: {
    marginBottom: 40,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
  },

  sideButton: {
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor:
      "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  captureOuter: {
    width: 92,
    height: 92,
    borderRadius: 999,
    backgroundColor: "#181818",
    justifyContent: "center",
    alignItems: "center",
  },

  captureMiddle: {
    width: 82,
    height: 82,
    borderRadius: 999,
    backgroundColor: "#2B2B2B",
    justifyContent: "center",
    alignItems: "center",
  },

  captureBase: {
    width: 68,
    height: 68,
    borderRadius: 999,
    backgroundColor: "#2FBF62",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 4,
  },

  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: "#44DA76",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor:
      "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  loadingText: {
    color: "white",
    marginTop: 14,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  resultBox: {
    marginTop: 20,
    width: width * 0.82,
    backgroundColor:
      "rgba(0,0,0,0.5)",
    padding: 16,
    borderRadius: 20,
  },

  resultTitle: {
    color: "#44DA76",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },

  resultText: {
    color: "white",
    fontSize: 13,
    lineHeight: 20,
  },
});