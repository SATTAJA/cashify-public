// app/resultscan.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";

import {
  ChevronLeft,
  ShoppingCart,
  Utensils,
  Stethoscope,
  Gamepad2,
  Car,
  Shirt,
  Package,
  PlusCircle,
  Receipt,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Store,
  CalendarDays,
  Clock,
  CreditCard,
  BadgePercent,
  Banknote,
  FileText,
  Info,
} from "lucide-react-native";

import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getCurrencySymbol,
  getAllCurrencies,
} from "../../constants/currencies";

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
  note: string;
  rawText: string;
  extractMode: string;
};

const PRESET_CATEGORIES = [
  {
    name: "Belanja Bulanan",
    icon: <ShoppingCart color="#74C1FF" size={20} />,
  },
  {
    name: "Makan & Minum",
    icon: <Utensils color="#74C1FF" size={20} />,
  },
  {
    name: "Kesehatan",
    icon: <Stethoscope color="#74C1FF" size={20} />,
  },
  {
    name: "Hiburan",
    icon: <Gamepad2 color="#74C1FF" size={20} />,
  },
  {
    name: "Transportasi",
    icon: <Car color="#74C1FF" size={20} />,
  },
  {
    name: "Pakaian",
    icon: <Shirt color="#74C1FF" size={20} />,
  },
  {
    name: "Barang",
    icon: <Package color="#74C1FF" size={20} />,
  },
  {
    name: "Lainnya",
    icon: <PlusCircle color="#74C1FF" size={20} />,
  },
];

const getParamString = (
  value: string | string[] | undefined,
  fallback = ""
) => {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
};

const getParamNumber = (
  value: string | string[] | undefined
) => {
  const raw = getParamString(value, "0");
  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.round(parsed));
};

const safeNumber = (value: unknown) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.round(parsed));
};

const formatCurrency = (
  value: string | number,
  currencyCode = "IDR"
) => {
  const numeric = String(value || "0").replace(/\D/g, "");

  if (!numeric) {
    return "";
  }

  if (currencyCode === "IDR") {
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const formatMoney = (
  amount: number,
  currencySymbol = "Rp",
  currencyCode = "IDR"
) => {
  return `${currencySymbol} ${formatCurrency(
    amount,
    currencyCode
  ) || "0"}`;
};

const parseItemsParam = (
  value: string | string[] | undefined
): ReceiptItem[] => {
  try {
    const raw = getParamString(value, "[]");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item && item.name)
      .map((item) => {
        const qty =
          Number(item.qty) > 0 ? Number(item.qty) : 1;

        const price = safeNumber(item.price);

        const total =
          safeNumber(item.total) ||
          Math.round(qty * price);

        const discount = safeNumber(item.discount);

        const finalTotal =
          safeNumber(item.finalTotal) ||
          Math.max(total - discount, 0);

        return {
          name: String(item.name || "Barang").trim(),
          qty,
          price,
          total,
          discount,
          finalTotal,
        };
      });
  } catch (error) {
    console.log("PARSE ITEMS PARAM ERROR:", error);
    return [];
  }
};

const buildReceiptNote = (
  receipt: ReceiptData,
  categoryName: string | null
) => {
  const itemLines =
    receipt.items.length > 0
      ? receipt.items.map((item, index) => {
          const discountText =
            item.discount > 0
              ? ` | Diskon: Rp ${item.discount.toLocaleString("id-ID")}`
              : "";

          return `${index + 1}. ${item.name} | Qty: ${
            item.qty
          } | Harga: Rp ${item.price.toLocaleString(
            "id-ID"
          )} | Total: Rp ${item.finalTotal.toLocaleString(
            "id-ID"
          )}${discountText}`;
        })
      : ["Barang tidak terdeteksi jelas"];

  return [
    `Kategori: ${categoryName || "-"}`,
    `Merchant: ${receipt.merchant || "Struk Belanja"}`,
    receipt.date ? `Tanggal: ${receipt.date}` : "",
    receipt.time ? `Waktu: ${receipt.time}` : "",
    `Metode Bayar: ${
      receipt.paymentMethod || "Tidak diketahui"
    }`,
    `Mode Ekstraksi: ${
      receipt.extractMode === "ai"
        ? "AI Gemini"
        : receipt.extractMode === "parser"
          ? "Parser Lokal"
          : "Manual"
    }`,
    "",
    "BARANG/JASA:",
    ...itemLines,
    "",
    "RINGKASAN:",
    `Subtotal: Rp ${receipt.subtotal.toLocaleString("id-ID")}`,
    `Diskon: Rp ${receipt.totalDiscount.toLocaleString("id-ID")}`,
    `Pajak/PPN: Rp ${receipt.tax.toLocaleString("id-ID")}`,
    `Biaya Layanan/Admin: Rp ${receipt.serviceCharge.toLocaleString(
      "id-ID"
    )}`,
    `Total: Rp ${receipt.total.toLocaleString("id-ID")}`,
    `Bayar/Tunai: Rp ${receipt.cash.toLocaleString("id-ID")}`,
    `Kembalian: Rp ${receipt.change.toLocaleString("id-ID")}`,
    receipt.saved > 0
      ? `Anda Hemat: Rp ${receipt.saved.toLocaleString("id-ID")}`
      : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
};

const guessCategoryFromReceipt = (
  receipt: ReceiptData
) => {
  const text = [
    receipt.merchant,
    receipt.paymentMethod,
    ...receipt.items.map((item) => item.name),
  ]
    .join(" ")
    .toLowerCase();

  if (
    /ayam|nasi|mie|bakso|kopi|coffee|teh|resto|cafe|kfc|mcd|richeese|mixue|burger|pizza|makan|minum|roti|snack|susu/.test(
      text
    )
  ) {
    return "Makan & Minum";
  }

  if (
    /obat|apotek|farmasi|vitamin|masker|dokter|klinik|kesehatan/.test(
      text
    )
  ) {
    return "Kesehatan";
  }

  if (/bensin|grab|gojek|ojek|parkir|tol|transport|bus|kereta/.test(text)) {
    return "Transportasi";
  }

  if (/baju|kaos|celana|sepatu|sandal|shirt|pakaian/.test(text)) {
    return "Pakaian";
  }

  if (/game|bioskop|cinema|hiburan|netflix|spotify/.test(text)) {
    return "Hiburan";
  }

  return "Belanja Bulanan";
};

const ResultScan = () => {
  const params = useLocalSearchParams();

  const fromScan = getParamString(params.fromScan) === "true";
  const manualInput =
    getParamString(params.manualInput) === "true";

  const scannedReceipt = useMemo<ReceiptData>(() => {
    const items = parseItemsParam(params.items);

    const subtotalFromItems = items.reduce(
      (sum, item) => sum + item.total,
      0
    );

    const finalTotalFromItems = items.reduce(
      (sum, item) => sum + item.finalTotal,
      0
    );

    const total =
      getParamNumber(params.total) ||
      getParamNumber(params.amount) ||
      finalTotalFromItems ||
      subtotalFromItems;

    const subtotal =
      getParamNumber(params.subtotal) ||
      subtotalFromItems ||
      total;

    const totalDiscount =
      getParamNumber(params.discount) ||
      items.reduce(
        (sum, item) => sum + item.discount,
        0
      );

    const tax = getParamNumber(params.tax);

    const serviceCharge = getParamNumber(
      params.serviceCharge
    );

    const cash = getParamNumber(params.cash);

    const change =
      getParamNumber(params.change) ||
      (cash >= total ? cash - total : 0);

    return {
      merchant:
        getParamString(params.merchant).trim() ||
        "Struk Belanja",
      date: getParamString(params.date).trim(),
      time: getParamString(params.time).trim(),
      items,
      subtotal,
      totalDiscount,
      total,
      cash,
      change,
      saved: getParamNumber(params.saved),
      tax,
      serviceCharge,
      paymentMethod:
        getParamString(params.paymentMethod).trim() ||
        "Tidak diketahui",
      note: getParamString(params.note).trim(),
      rawText: getParamString(params.rawText).trim(),
      extractMode:
        getParamString(params.extractMode).trim() ||
        (fromScan ? "parser" : "manual"),
    };
  }, [params, fromScan]);

  const [rawAmount, setRawAmount] = useState(
    String(scannedReceipt.total || "")
  );

  const [displayAmount, setDisplayAmount] = useState("");

  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(
      fromScan
        ? guessCategoryFromReceipt(scannedReceipt)
        : null
    );

  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);

  const [cashPaid, setCashPaid] = useState(
    scannedReceipt.cash > 0
      ? String(scannedReceipt.cash)
      : ""
  );

  const [displayCashPaid, setDisplayCashPaid] =
    useState("");

  const [changeAmount, setChangeAmount] =
    useState(scannedReceipt.change || 0);

  const [recordChange, setRecordChange] =
    useState(false);

  const [currency, setCurrency] =
    useState<string>("IDR");

  const [currencySymbol, setCurrencySymbol] =
    useState<string>("Rp");

  const [exchangeRates, setExchangeRates] =
    useState<{ [key: string]: number } | null>(
      null
    );

  const [loadingCurrency, setLoadingCurrency] =
    useState(true);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        if (fromScan) {
          setCurrency("IDR");
          setCurrencySymbol("Rp");
          setLoadingCurrency(false);
          return;
        }

        const savedCurrency =
          await AsyncStorage.getItem("currency");

        if (savedCurrency) {
          setCurrency(savedCurrency);
          setCurrencySymbol(
            getCurrencySymbol(savedCurrency)
          );
        } else {
          setCurrency("IDR");
          setCurrencySymbol("Rp");
        }
      } catch (error) {
        console.error("Error loading currency:", error);
        setCurrency("IDR");
        setCurrencySymbol("Rp");
      } finally {
        if (fromScan) {
          setLoadingCurrency(false);
        }
      }
    };

    loadCurrency();
  }, [fromScan]);

  useEffect(() => {
    const loadExchangeRates = async () => {
      if (fromScan || currency === "IDR") {
        setExchangeRates({ IDR: 1 });
        setLoadingCurrency(false);
        return;
      }

      try {
        const response = await fetch(
          "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/idr.json"
        );

        if (response.ok) {
          const data = await response.json();

          if (data && data.idr) {
            const rates: { [key: string]: number } = {
              IDR: 1,
            };

            const supportedCurrencies =
              getAllCurrencies().map((item) => item.code);

            supportedCurrencies.forEach(
              (currencyCode) => {
                if (currencyCode === "IDR") {
                  rates[currencyCode] = 1;
                  return;
                }

                const lowerCurrency =
                  currencyCode.toLowerCase();

                rates[currencyCode] =
                  data.idr[lowerCurrency] || 1;
              }
            );

            setExchangeRates(rates);
          }
        }
      } catch (error) {
        console.error(
          "Error loading exchange rates:",
          error
        );
      } finally {
        setLoadingCurrency(false);
      }
    };

    loadExchangeRates();
  }, [currency, fromScan]);

  useEffect(() => {
    setDisplayAmount(formatCurrency(rawAmount, currency));
  }, [rawAmount, currency]);

  useEffect(() => {
    setDisplayCashPaid(
      cashPaid ? formatCurrency(cashPaid, currency) : ""
    );
  }, [cashPaid, currency]);

  useEffect(() => {
    if (fromScan) {
      const smartNote =
        scannedReceipt.note ||
        buildReceiptNote(
          scannedReceipt,
          selectedCategory
        );

      setNote(smartNote);
    } else {
      setNote("");
    }
  }, [fromScan]);

  const handleBack = () => {
    router.replace("/home");
  };

  const calculateChange = (
    totalStr: string,
    paidStr: string
  ) => {
    const total = Number(totalStr) || 0;
    const paid = Number(paidStr) || 0;
    const change = Math.max(0, paid - total);

    setChangeAmount(change);
  };

  const handleAmountChange = (text: string) => {
    const clean = text.replace(/\D/g, "");

    setRawAmount(clean);
    setDisplayAmount(formatCurrency(clean, currency));

    if (cashPaid) {
      calculateChange(clean, cashPaid);
    }
  };

  const handleCashPaidChange = (text: string) => {
    const clean = text.replace(/\D/g, "");

    setCashPaid(clean);
    setDisplayCashPaid(
      formatCurrency(clean, currency)
    );
    calculateChange(rawAmount, clean);
  };

  const handleAutoSetCashPaid = () => {
    if (!rawAmount || Number(rawAmount) <= 0) {
      return;
    }

    setCashPaid(rawAmount);
    setDisplayCashPaid(
      formatCurrency(rawAmount, currency)
    );
    setChangeAmount(0);
  };

  const handleUseScannedCash = () => {
    if (scannedReceipt.cash <= 0) {
      return;
    }

    setCashPaid(String(scannedReceipt.cash));
    setDisplayCashPaid(
      formatCurrency(scannedReceipt.cash, currency)
    );
    setChangeAmount(scannedReceipt.change);
  };

  const ensureCategoryExists = async (
    categoryName: string
  ) => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      Alert.alert(
        "Error",
        "User belum login. Silakan login ulang."
      );
      return null;
    }

    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("name", categoryName)
      .eq("type", "expense")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      return existing.id;
    }

    const { data, error } = await supabase
      .from("categories")
      .insert([
        {
          name: categoryName,
          type: "expense",
          user_id: userId,
        },
      ])
      .select()
      .single();

    if (error) {
      console.log("Insert category error:", error);
      Alert.alert("Error", "Gagal membuat kategori.");
      return null;
    }

    return data.id;
  };

  const ensureIncomeCategoryExists = async () => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      return null;
    }

    const categoryName = "Kembalian Belanja";

    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("name", categoryName)
      .eq("type", "income")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      return existing.id;
    }

    const { data, error } = await supabase
      .from("categories")
      .insert([
        {
          name: categoryName,
          type: "income",
          user_id: userId,
        },
      ])
      .select()
      .single();

    if (error) {
      console.log("Insert income category error:", error);
      return null;
    }

    return data.id;
  };

  const getFinalNote = () => {
    const receiptWithLatestTotal: ReceiptData = {
      ...scannedReceipt,
      total: Number(rawAmount) || 0,
      cash: Number(cashPaid) || 0,
      change: changeAmount,
    };

    const receiptDetailNote = buildReceiptNote(
      receiptWithLatestTotal,
      selectedCategory
    );

    if (!note.trim()) {
      return receiptDetailNote;
    }

    return `${note.trim()}\n\n--- Detail Scan Cashify ---\n${receiptDetailNote}`;
  };

  const handleSave = async () => {
    if (!rawAmount || Number(rawAmount) === 0) {
      Alert.alert(
        "Error",
        "Nominal pengeluaran harus diisi."
      );
      return;
    }

    if (!selectedCategory) {
      Alert.alert("Error", "Kategori harus dipilih.");
      return;
    }

    setLoading(true);

    try {
      let amountInIDR = Number(rawAmount);

      if (
        !fromScan &&
        currency !== "IDR" &&
        exchangeRates
      ) {
        const rate = exchangeRates[currency];

        if (rate && rate > 0) {
          amountInIDR = amountInIDR / rate;
        }
      }

      const categoryId =
        await ensureCategoryExists(selectedCategory);

      if (!categoryId) {
        setLoading(false);
        return;
      }

      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) {
        setLoading(false);
        Alert.alert(
          "Error",
          "User belum login. Silakan login ulang."
        );
        return;
      }

      const finalNote = getFinalNote();

      const { error: expenseError } = await supabase
        .from("transactions")
        .insert([
          {
            user_id: userId,
            amount: Math.round(amountInIDR),
            category_id: categoryId,
            type: "expense",
            note: finalNote,
          },
        ]);

      if (expenseError) {
        console.log("SAVE EXPENSE ERROR:", expenseError);
        setLoading(false);
        Alert.alert(
          "Error",
          "Gagal menambahkan pengeluaran."
        );
        return;
      }

      if (recordChange && changeAmount > 0) {
        let changeInIDR = changeAmount;

        if (
          !fromScan &&
          currency !== "IDR" &&
          exchangeRates
        ) {
          const rate = exchangeRates[currency];

          if (rate && rate > 0) {
            changeInIDR = changeAmount / rate;
          }
        }

        const incomeCategoryId =
          await ensureIncomeCategoryExists();

        if (incomeCategoryId) {
          const changeNote = [
            `Kembalian dari belanja ${selectedCategory}`,
            `Merchant: ${scannedReceipt.merchant}`,
            `Total belanja: Rp ${Number(
              rawAmount
            ).toLocaleString("id-ID")}`,
          ].join("\n");

          const { error: incomeError } = await supabase
            .from("transactions")
            .insert([
              {
                user_id: userId,
                amount: Math.round(changeInIDR),
                category_id: incomeCategoryId,
                type: "income",
                note: changeNote,
              },
            ]);

          if (incomeError) {
            console.log(
              "SAVE CHANGE INCOME ERROR:",
              incomeError
            );
          }
        }
      }

      setLoading(false);

      Alert.alert(
        "Berhasil",
        "Transaksi dari struk berhasil disimpan!"
      );

      router.replace("/home");
    } catch (error) {
      console.log("HANDLE SAVE ERROR:", error);
      setLoading(false);
      Alert.alert(
        "Error",
        "Terjadi kesalahan saat menyimpan transaksi."
      );
    }
  };

  const extractionLabel =
    scannedReceipt.extractMode === "ai"
      ? "AI Gemini"
      : scannedReceipt.extractMode === "parser"
        ? "Parser Lokal"
        : "Manual";

  if (loadingCurrency) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
        ]}
      >
        <ActivityIndicator
          size="large"
          color="#44DA76"
        />
        <Text style={styles.loadingText}>
          Memuat data transaksi...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.back}
          onPress={handleBack}
        >
          <ChevronLeft color="#FF6B6B" size={35} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Receipt color="#FF6B6B" size={24} />
          <Text style={styles.title}>
            Hasil Scan Struk
          </Text>
        </View>
      </View>

      {fromScan && (
        <View style={styles.scanInfoContainer}>
          {scannedReceipt.extractMode === "ai" ? (
            <Sparkles color="#44DA76" size={22} />
          ) : (
            <CheckCircle color="#44DA76" size={22} />
          )}

          <View style={styles.scanInfoContent}>
            <Text style={styles.scanInfoTitle}>
              Struk berhasil dipindai
            </Text>

            <Text style={styles.scanInfoSubtitle}>
              Data diambil dari {extractionLabel}
              {manualInput
                ? " • total perlu dicek manual"
                : ""}
            </Text>

            <Text style={styles.scanInfoSubtitle}>
              {scannedReceipt.items.length} item terdeteksi
            </Text>
          </View>
        </View>
      )}

      <View style={styles.merchantCard}>
        <View style={styles.merchantTop}>
          <View style={styles.storeIcon}>
            <Store color="#44DA76" size={22} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.merchantLabel}>
              Merchant
            </Text>
            <Text style={styles.merchantName}>
              {scannedReceipt.merchant}
            </Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <CalendarDays
              color="#A9A9A9"
              size={16}
            />
            <Text style={styles.metaText}>
              {scannedReceipt.date || "-"}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <Clock color="#A9A9A9" size={16} />
            <Text style={styles.metaText}>
              {scannedReceipt.time || "-"}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <CreditCard
              color="#A9A9A9"
              size={16}
            />
            <Text style={styles.metaText}>
              {scannedReceipt.paymentMethod}
            </Text>
          </View>
        </View>
      </View>

      {scannedReceipt.items.length > 0 ? (
        <View style={styles.itemsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.itemsTitle}>
              Barang dari Struk
            </Text>
            <Text style={styles.itemsCount}>
              {scannedReceipt.items.length} item
            </Text>
          </View>

          {scannedReceipt.items.map((item, index) => (
            <View
              key={`${item.name}-${index}`}
              style={styles.itemRow}
            >
              <View style={styles.itemNumber}>
                <Text style={styles.itemNumberText}>
                  {index + 1}
                </Text>
              </View>

              <View style={styles.itemContent}>
                <Text style={styles.itemName}>
                  {item.name}
                </Text>

                <Text style={styles.itemMeta}>
                  Qty {item.qty} ×{" "}
                  {formatMoney(
                    item.price,
                    currencySymbol,
                    currency
                  )}
                </Text>

                {item.discount > 0 && (
                  <Text style={styles.itemDiscount}>
                    Diskon{" "}
                    {formatMoney(
                      item.discount,
                      currencySymbol,
                      currency
                    )}
                  </Text>
                )}
              </View>

              <Text style={styles.itemTotal}>
                {formatMoney(
                  item.finalTotal || item.total,
                  currencySymbol,
                  currency
                )}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyItemCard}>
          <Info color="#FFB84D" size={20} />
          <Text style={styles.emptyItemText}>
            Barang belum terdeteksi jelas. Kamu tetap
            bisa menyimpan total belanjanya.
          </Text>
        </View>
      )}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>
          Ringkasan dari AI
        </Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Subtotal
          </Text>
          <Text style={styles.summaryValue}>
            {formatMoney(
              scannedReceipt.subtotal,
              currencySymbol,
              currency
            )}
          </Text>
        </View>

        {scannedReceipt.totalDiscount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Diskon
            </Text>
            <Text
              style={[
                styles.summaryValue,
                styles.discountValue,
              ]}
            >
              -{" "}
              {formatMoney(
                scannedReceipt.totalDiscount,
                currencySymbol,
                currency
              )}
            </Text>
          </View>
        )}

        {scannedReceipt.tax > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Pajak/PPN
            </Text>
            <Text style={styles.summaryValue}>
              {formatMoney(
                scannedReceipt.tax,
                currencySymbol,
                currency
              )}
            </Text>
          </View>
        )}

        {scannedReceipt.serviceCharge > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Biaya layanan/admin
            </Text>
            <Text style={styles.summaryValue}>
              {formatMoney(
                scannedReceipt.serviceCharge,
                currencySymbol,
                currency
              )}
            </Text>
          </View>
        )}

        {scannedReceipt.saved > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Anda hemat
            </Text>
            <Text
              style={[
                styles.summaryValue,
                styles.savedValue,
              ]}
            >
              {formatMoney(
                scannedReceipt.saved,
                currencySymbol,
                currency
              )}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.label}>
        Total Belanja
      </Text>
      <View style={styles.nominalWrapper}>
        <Text style={styles.currencySymbol}>
          {currencySymbol}
        </Text>

        <TextInput
          style={styles.amountInput}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor="#555"
          value={displayAmount}
          onChangeText={handleAmountChange}
          maxLength={15}
        />
      </View>

      <Text style={styles.label}>
        Uang yang Dibayarkan
      </Text>

      <View style={styles.cashWrapper}>
        <View style={styles.nominalWrapper}>
          <Text style={styles.currencySymbol}>
            {currencySymbol}
          </Text>

          <TextInput
            style={styles.amountInput}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#555"
            value={displayCashPaid}
            onChangeText={handleCashPaidChange}
            maxLength={15}
          />
        </View>

        <View style={styles.cashButtonRow}>
          <TouchableOpacity
            style={styles.autoSetButton}
            onPress={handleAutoSetCashPaid}
          >
            <Text style={styles.autoSetText}>
              Sama dengan total
            </Text>
          </TouchableOpacity>

          {scannedReceipt.cash > 0 && (
            <TouchableOpacity
              style={styles.autoSetButton}
              onPress={handleUseScannedCash}
            >
              <Banknote color="#FF6B6B" size={14} />
              <Text style={styles.autoSetText}>
                Pakai bayar dari struk
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {changeAmount > 0 && (
        <View style={styles.changeContainer}>
          <View style={styles.changeIconContainer}>
            <ArrowRight color="#44DA76" size={20} />
          </View>

          <View style={styles.changeContent}>
            <Text style={styles.changeLabel}>
              Kembalian
            </Text>

            <Text style={styles.changeValue}>
              {formatMoney(
                changeAmount,
                currencySymbol,
                currency
              )}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.recordChangeButton,
              recordChange &&
                styles.recordChangeButtonActive,
            ]}
            onPress={() =>
              setRecordChange(!recordChange)
            }
          >
            <Text
              style={[
                styles.recordChangeText,
                recordChange &&
                  styles.recordChangeTextActive,
              ]}
            >
              {recordChange
                ? "✓ Catat"
                : "Tidak dicatat"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {cashPaid &&
        Number(cashPaid) > 0 &&
        Number(cashPaid) < Number(rawAmount) && (
          <View
            style={[
              styles.changeContainer,
              styles.noChangeContainer,
            ]}
          >
            <Text style={styles.noChangeText}>
              Uang yang dibayarkan kurang dari total
              belanja.
            </Text>
          </View>
        )}

      <Text style={styles.label}>
        Catatan Pengeluaran
      </Text>

      <View style={styles.noteHeader}>
        <FileText color="#FF6B6B" size={16} />
        <Text style={styles.noteHelper}>
          Catatan sudah memakai detail dari hasil scan
          AI/backend.
        </Text>
      </View>

      <TextInput
        style={styles.inputNote}
        placeholder="Catatan pengeluaran..."
        placeholderTextColor="#777"
        value={note}
        onChangeText={setNote}
        multiline
        editable
      />

      <Text style={styles.label}>
        Kategori Pengeluaran
      </Text>

      <View style={styles.categoryWrapper}>
        {PRESET_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.name}
            style={[
              styles.categoryButton,
              selectedCategory === cat.name &&
                styles.categorySelected,
            ]}
            onPress={() =>
              setSelectedCategory(cat.name)
            }
          >
            <View style={styles.categoryIcon}>
              {cat.icon}
            </View>

            <Text style={styles.categoryText}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.finalSummaryCard}>
        <View style={styles.finalSummaryTop}>
          <BadgePercent
            color="#44DA76"
            size={20}
          />
          <Text style={styles.finalSummaryTitle}>
            Ringkasan Simpan
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Total pengeluaran
          </Text>
          <Text style={styles.finalTotalValue}>
            {formatMoney(
              Number(rawAmount) || 0,
              currencySymbol,
              currency
            )}
          </Text>
        </View>

        {cashPaid && Number(cashPaid) > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Dibayar
            </Text>
            <Text style={styles.summaryValue}>
              {formatMoney(
                Number(cashPaid) || 0,
                currencySymbol,
                currency
              )}
            </Text>
          </View>
        )}

        {changeAmount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Kembalian
            </Text>
            <Text
              style={[
                styles.summaryValue,
                styles.savedValue,
              ]}
            >
              {formatMoney(
                changeAmount,
                currencySymbol,
                currency
              )}
            </Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Kategori
          </Text>
          <Text style={styles.summaryValue}>
            {selectedCategory || "-"}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.saveButton,
          loading && { opacity: 0.5 },
        ]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator
            color="#151716"
            size="small"
          />
        ) : (
          <Text style={styles.saveText}>
            Simpan Transaksi
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ResultScan;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#151716",
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "white",
    marginTop: 20,
    fontSize: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 60,
    marginBottom: 25,
  },

  back: {
    padding: 5,
  },

  headerTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },

  scanInfoContainer: {
    backgroundColor: "#1E2A1E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#44DA76",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  scanInfoContent: {
    flex: 1,
  },

  scanInfoTitle: {
    color: "#44DA76",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },

  scanInfoSubtitle: {
    color: "#D5D5D5",
    fontSize: 13,
    lineHeight: 18,
  },

  merchantCard: {
    backgroundColor: "#1E201F",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2B2F2D",
  },

  merchantTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  storeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#44DA7620",
    alignItems: "center",
    justifyContent: "center",
  },

  merchantLabel: {
    color: "#8D8D8D",
    fontSize: 12,
    marginBottom: 2,
  },

  merchantName: {
    color: "white",
    fontSize: 19,
    fontWeight: "800",
  },

  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#252827",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },

  metaText: {
    color: "#D9D9D9",
    fontSize: 12,
    fontWeight: "600",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  itemsContainer: {
    backgroundColor: "#1E201F",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2B2F2D",
  },

  itemsTitle: {
    color: "#FF6B6B",
    fontSize: 15,
    fontWeight: "800",
  },

  itemsCount: {
    color: "#999",
    fontSize: 12,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2D2B",
  },

  itemNumber: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#264E6E",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  itemNumberText: {
    color: "#74C1FF",
    fontSize: 12,
    fontWeight: "800",
  },

  itemContent: {
    flex: 1,
  },

  itemName: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },

  itemMeta: {
    color: "#A9A9A9",
    fontSize: 12,
  },

  itemDiscount: {
    color: "#44DA76",
    fontSize: 11,
    marginTop: 3,
  },

  itemTotal: {
    color: "white",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 8,
  },

  emptyItemCard: {
    backgroundColor: "#2A241A",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFB84D40",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  emptyItemText: {
    color: "#FFD699",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },

  summaryCard: {
    backgroundColor: "#1E201F",
    borderRadius: 18,
    padding: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#2B2F2D",
  },

  summaryTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9,
    gap: 12,
  },

  summaryLabel: {
    color: "#AAA",
    fontSize: 14,
    flex: 1,
  },

  summaryValue: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },

  discountValue: {
    color: "#FF6B6B",
  },

  savedValue: {
    color: "#44DA76",
  },

  label: {
    color: "#FF6B6B",
    fontSize: 15,
    marginBottom: 10,
    marginTop: 20,
    fontWeight: "700",
  },

  nominalWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  currencySymbol: {
    color: "gray",
    fontSize: 36,
    marginRight: 10,
    fontWeight: "bold",
  },

  amountInput: {
    color: "white",
    fontSize: 40,
    flex: 1,
    textAlign: "left",
    padding: 0,
  },

  cashWrapper: {
    gap: 10,
  },

  cashButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  autoSetButton: {
    backgroundColor: "#2A2A2A",
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  autoSetText: {
    color: "#FF6B6B",
    fontSize: 12,
    fontWeight: "700",
  },

  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E2A1E",
    borderRadius: 14,
    padding: 16,
    marginTop: 15,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "#44DA76",
  },

  noChangeContainer: {
    backgroundColor: "#2A1E1E",
    borderColor: "#FF6B6B",
  },

  changeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#44DA7620",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  changeContent: {
    flex: 1,
  },

  changeLabel: {
    color: "#AAA",
    fontSize: 12,
  },

  changeValue: {
    color: "#44DA76",
    fontSize: 18,
    fontWeight: "bold",
  },

  noChangeText: {
    color: "#FF6B6B",
    fontSize: 14,
    textAlign: "center",
    flex: 1,
  },

  recordChangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: "#2A2A2A",
  },

  recordChangeButtonActive: {
    backgroundColor: "#44DA7620",
    borderWidth: 1,
    borderColor: "#44DA76",
  },

  recordChangeText: {
    color: "#AAA",
    fontSize: 12,
    fontWeight: "700",
  },

  recordChangeTextActive: {
    color: "#44DA76",
  },

  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },

  inputNote: {
    backgroundColor: "#1E201F",
    borderRadius: 14,
    padding: 13,
    color: "white",
    minHeight: 120,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#2B2F2D",
  },

  noteHelper: {
    color: "#888",
    fontSize: 12,
    flex: 1,
  },

  categoryWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 5,
  },

  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#252525",
    borderWidth: 1,
    borderColor: "transparent",
  },

  categorySelected: {
    borderColor: "#FF6B6B",
    shadowColor: "#FF6B6B",
    shadowOpacity: 0.25,
    elevation: 5,
  },

  categoryIcon: {
    backgroundColor: "#264E6E",
    borderRadius: 10,
    padding: 10,
  },

  categoryText: {
    color: "white",
    fontWeight: "700",
  },

  finalSummaryCard: {
    backgroundColor: "#1E201F",
    borderRadius: 18,
    padding: 16,
    marginTop: 25,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2B2F2D",
  },

  finalSummaryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  finalSummaryTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
  },

  finalTotalValue: {
    color: "#44DA76",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
  },

  saveButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 20,
    marginBottom: 20,
    alignItems: "center",
  },

  saveText: {
    color: "#151716",
    fontSize: 16,
    fontWeight: "800",
  },
});
