// app/resultscan.tsx

import React, { useState, useEffect } from "react";
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
} from "lucide-react-native";

import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrencySymbol, getAllCurrencies } from "../../constants/currencies";

const PRESET_CATEGORIES = [
  { name: "Belanja Bulanan", icon: <ShoppingCart color="#74C1FF" size={20} /> },
  { name: "Makan & Minum", icon: <Utensils color="#74C1FF" size={20} /> },
  { name: "Kesehatan", icon: <Stethoscope color="#74C1FF" size={20} /> },
  { name: "Hiburan", icon: <Gamepad2 color="#74C1FF" size={20} /> },
  { name: "Transportasi", icon: <Car color="#74C1FF" size={20} /> },
  { name: "Pakaian", icon: <Shirt color="#74C1FF" size={20} /> },
  { name: "Barang", icon: <Package color="#74C1FF" size={20} /> },
  { name: "Lainnya", icon: <PlusCircle color="#74C1FF" size={20} /> },
];

// Format angka dengan mata uang tertentu
const formatCurrency = (value: string, currencyCode: string = "IDR") => {
  const numeric = value.replace(/\D/g, "");
  if (currencyCode === "IDR") {
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Fungsi untuk ekstrak item dari teks OCR
const extractItemsFromOCR = (text: string): string[] => {
  const items: string[] = [];
  
  // Pattern umum untuk item belanjaan
  const patterns = [
    /([A-Za-z\s]+?)\s+(\d+[.,]\d+)/g, // Item dengan harga
    /([A-Za-z\s]+?)\s+Rp[\s]*(\d+[.,\d]*)/gi, // Item dengan Rp
    /(\d+)x\s+([A-Za-z\s]+)/gi, // Quantity + item
    /([A-Za-z\s]+?)\s+(\d+)/g, // Item dengan angka
  ];
  
  // Cari item berdasarkan pola umum
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let itemName = match[1]?.trim();
      if (itemName && itemName.length > 2 && itemName.length < 50) {
        // Filter kata-kata umum yang bukan item
        const commonWords = ['total', 'jumlah', 'bayar', 'kembali', 'diskon', 'ppn', 'qty', 'harga', 'subtotal', 'grand total', 'rp', 'indonesia', 'terima kasih'];
        const isCommonWord = commonWords.some(word => itemName.toLowerCase().includes(word));
        
        if (!isCommonWord && !items.includes(itemName)) {
          items.push(itemName);
        }
      }
    }
  }
  
  // Jika tidak ada item yang ditemukan, coba split berdasarkan baris
  if (items.length === 0) {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      // Cari line yang mengandung angka dan bukan header/footer
      if (trimmed && /\d/.test(trimmed) && trimmed.length > 3 && trimmed.length < 60) {
        const hasPrice = /(Rp|\d+[.,]\d+)/.test(trimmed);
        const isNotHeader = !/^(tanggal|date|no|invoice|kasir|cashier)/i.test(trimmed);
        
        if (hasPrice && isNotHeader) {
          // Bersihkan nama item
          let itemName = trimmed.replace(/\s+\d+[.,\d]*\s*$/, '').trim();
          itemName = itemName.replace(/Rp[\s\d.,]+/gi, '').trim();
          
          if (itemName.length > 2 && itemName.length < 40 && !items.includes(itemName)) {
            items.push(itemName);
          }
        }
      }
    }
  }
  
  // Batasi jumlah item
  return items.slice(0, 10);
};

// Generate catatan otomatis
const generateAutoNote = (items: string[], total: number, currencySymbol: string) => {
  if (items.length === 0) {
    return `Total belanja: ${currencySymbol} ${total.toLocaleString('id-ID')}`;
  }
  
  const itemList = items.slice(0, 5).join(", ");
  const moreItems = items.length > 5 ? `, dan ${items.length - 5} item lainnya` : "";
  
  return `Pembelian: ${itemList}${moreItems}. Total: ${currencySymbol} ${total.toLocaleString('id-ID')}`;
};

const ResultScan = () => {
  const params = useLocalSearchParams();
  
  // Data dari hasil scan
  const scannedAmount = params.amount ? parseFloat(params.amount as string) : 0;
  const scannedNote = params.note as string || "";
  const fromScan = params.fromScan === "true";
  const manualInput = params.manualInput === "true";
  
  const [rawAmount, setRawAmount] = useState(scannedAmount.toString());
  const [displayAmount, setDisplayAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [extractedItems, setExtractedItems] = useState<string[]>([]);
  
  // State untuk pembayaran tunai dan kembalian
  const [cashPaid, setCashPaid] = useState("");
  const [displayCashPaid, setDisplayCashPaid] = useState("");
  const [changeAmount, setChangeAmount] = useState(0);
  const [recordChange, setRecordChange] = useState(true);
  
  // State untuk mata uang
  const [currency, setCurrency] = useState<string>("IDR");
  const [currencySymbol, setCurrencySymbol] = useState<string>("Rp");
  const [exchangeRates, setExchangeRates] = useState<{ [key: string]: number } | null>(null);
  const [loadingCurrency, setLoadingCurrency] = useState(true);

  // Ekstrak item dari OCR note
  useEffect(() => {
    if (scannedNote && fromScan) {
      const items = extractItemsFromOCR(scannedNote);
      setExtractedItems(items);
      
      // Generate catatan otomatis
      const autoGeneratedNote = generateAutoNote(items, scannedAmount, currencySymbol);
      setNote(autoGeneratedNote);
    } else if (!fromScan) {
      setNote("");
    }
  }, [scannedNote, fromScan, scannedAmount, currencySymbol]);

  // Load currency dari preferences
  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const savedCurrency = await AsyncStorage.getItem("currency");
        if (savedCurrency) {
          setCurrency(savedCurrency);
          const symbol = getCurrencySymbol(savedCurrency);
          setCurrencySymbol(symbol);
        } else {
          setCurrency("IDR");
          setCurrencySymbol("Rp");
        }
      } catch (error) {
        console.error("Error loading currency:", error);
        setCurrency("IDR");
        setCurrencySymbol("Rp");
      }
    };
    loadCurrency();
  }, []);

  // Load exchange rates
  useEffect(() => {
    const loadExchangeRates = async () => {
      try {
        const response = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/idr.json`);
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.idr) {
            const rates: { [key: string]: number } = { IDR: 1 };
            const supportedCurrencies = getAllCurrencies().map(c => c.code);
            
            supportedCurrencies.forEach(currencyCode => {
              if (currencyCode === "IDR") {
                rates[currencyCode] = 1;
              } else {
                const lowerCurrency = currencyCode.toLowerCase();
                if (data.idr[lowerCurrency]) {
                  rates[currencyCode] = data.idr[lowerCurrency];
                } else {
                  rates[currencyCode] = 1;
                }
              }
            });
            
            setExchangeRates(rates);
          }
        }
      } catch (error) {
        console.error("Error loading exchange rates:", error);
      } finally {
        setLoadingCurrency(false);
      }
    };
    
    loadExchangeRates();
  }, []);

  // Format amount awal
  useEffect(() => {
    if (rawAmount) {
      const formatted = formatCurrency(rawAmount, currency);
      setDisplayAmount(formatted);
    } else {
      setDisplayAmount("");
    }
  }, [rawAmount, currency]);

  // Update catatan saat total berubah
  useEffect(() => {
    if (fromScan && scannedAmount > 0) {
      const updatedNote = generateAutoNote(extractedItems, parseFloat(rawAmount) || 0, currencySymbol);
      setNote(updatedNote);
    }
  }, [rawAmount, extractedItems, currencySymbol]);

  const handleBack = () => router.replace("/home");

  const handleAmountChange = (text: string) => {
    const clean = text.replace(/\D/g, "");
    setRawAmount(clean);
    const formatted = formatCurrency(clean, currency);
    setDisplayAmount(formatted);
    
    // Update kembalian jika cash paid sudah diisi
    if (cashPaid) {
      calculateChange(clean, cashPaid);
    }
  };

  // Auto set cash paid sama dengan total (untuk memudahkan)
  const handleAutoSetCashPaid = () => {
    if (rawAmount && parseFloat(rawAmount) > 0) {
      setCashPaid(rawAmount);
      const formatted = formatCurrency(rawAmount, currency);
      setDisplayCashPaid(formatted);
      setChangeAmount(0);
    }
  };

  const handleCashPaidChange = (text: string) => {
    const clean = text.replace(/\D/g, "");
    setCashPaid(clean);
    const formatted = formatCurrency(clean, currency);
    setDisplayCashPaid(formatted);
    
    // Hitung kembalian
    calculateChange(rawAmount, clean);
  };

  const calculateChange = (totalStr: string, paidStr: string) => {
    const total = parseFloat(totalStr) || 0;
    const paid = parseFloat(paidStr) || 0;
    const change = Math.max(0, paid - total);
    setChangeAmount(change);
  };

  const ensureCategoryExists = async (categoryName: string) => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("name", categoryName)
      .eq("type", "expense")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) return existing.id;

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
    const categoryName = "Kembalian Belanja";

    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("name", categoryName)
      .eq("type", "income")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) return existing.id;

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

  const handleSave = async () => {
    if (!rawAmount || parseFloat(rawAmount) === 0) {
      Alert.alert("Error", "Nominal pengeluaran harus diisi.");
      return;
    }

    if (!selectedCategory) {
      Alert.alert("Error", "Kategori harus dipilih.");
      return;
    }

    setLoading(true);

    // Konversi amount ke IDR jika mata uang bukan IDR
    let amountInIDR = parseFloat(rawAmount);
    
    if (currency !== "IDR" && exchangeRates) {
      const rate = exchangeRates[currency];
      if (rate && rate > 0) {
        amountInIDR = amountInIDR / rate;
      }
    }

    // 1. Catat pengeluaran dengan note yang sudah di-generate
    const categoryId = await ensureCategoryExists(selectedCategory);
    if (!categoryId) {
      setLoading(false);
      return;
    }

    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    const { error: expenseError } = await supabase.from("transactions").insert([
      {
        user_id: userId,
        amount: Math.round(amountInIDR),
        category_id: categoryId,
        type: "expense",
        note: note,
      },
    ]);

    if (expenseError) {
      console.log(expenseError);
      setLoading(false);
      Alert.alert("Error", "Gagal menambahkan pengeluaran.");
      return;
    }

    // 2. Catat kembalian sebagai pendapatan (jika ada dan user memilih)
    if (recordChange && changeAmount > 0) {
      let changeInIDR = changeAmount;
      
      if (currency !== "IDR" && exchangeRates) {
        const rate = exchangeRates[currency];
        if (rate && rate > 0) {
          changeInIDR = changeAmount / rate;
        }
      }
      
      const incomeCategoryId = await ensureIncomeCategoryExists();
      
      if (incomeCategoryId) {
        const changeNote = `Kembalian dari belanja ${selectedCategory}`;
        
        const { error: incomeError } = await supabase.from("transactions").insert([
          {
            user_id: userId,
            amount: Math.round(changeInIDR),
            category_id: incomeCategoryId,
            type: "income",
            note: changeNote,
          },
        ]);
        
        if (incomeError) {
          console.log("Error saving change as income:", incomeError);
        }
      }
    }

    setLoading(false);

    let successMessage = "Pengeluaran berhasil ditambahkan!";
    if (changeAmount > 0) {
      successMessage += `\nKembalian: ${currencySymbol} ${formatCurrency(changeAmount.toString(), currency)}\nTelah dicatat sebagai pendapatan.`;
    }
    
    Alert.alert("Berhasil", successMessage);
    router.replace("/home");
  };

  // Tampilkan loading saat mengambil kurs
  if (loadingCurrency) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Memuat data mata uang...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={handleBack}>
          <ChevronLeft color="#FF6B6B" size={35} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Receipt color="#FF6B6B" size={24} />
          <Text style={styles.title}>Hasil Scan Struk</Text>
        </View>
      </View>

      {/* Informasi Scan */}
      {fromScan && (
        <View style={styles.scanInfoContainer}>
          <CheckCircle color="#44DA76" size={20} />
          <View style={styles.scanInfoContent}>
            <Text style={styles.scanInfoTitle}>✓ Struk berhasil dipindai</Text>
            {manualInput && (
              <Text style={styles.scanInfoSubtitle}>
                Total tidak terbaca otomatis, silakan isi manual
              </Text>
            )}
            {extractedItems.length > 0 && (
              <Text style={styles.scanInfoSubtitle}>
                Ditemukan {extractedItems.length} item dalam struk
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Item yang ditemukan */}
      {extractedItems.length > 0 && (
        <View style={styles.itemsContainer}>
          <Text style={styles.itemsTitle}>Item yang dibeli:</Text>
          <View style={styles.itemsList}>
            {extractedItems.map((item, index) => (
              <View key={index} style={styles.itemBadge}>
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Nominal Pengeluaran (Total Belanja) */}
      <Text style={styles.label}>Total Belanja (Dari Struk)</Text>
      <View style={styles.nominalWrapper}>
        <Text style={styles.currencySymbol}>{currencySymbol}</Text>
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

      {/* Uang yang Dibayarkan dengan tombol auto set */}
      <Text style={styles.label}>Uang yang Dibayarkan</Text>
      <View style={styles.cashWrapper}>
        <View style={styles.nominalWrapper}>
          <Text style={styles.currencySymbol}>{currencySymbol}</Text>
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
        <TouchableOpacity style={styles.autoSetButton} onPress={handleAutoSetCashPaid}>
          <Text style={styles.autoSetText}>Sama dengan total</Text>
        </TouchableOpacity>
      </View>

      {/* Kembalian */}
      {changeAmount > 0 && (
        <View style={styles.changeContainer}>
          <View style={styles.changeIconContainer}>
            <ArrowRight color="#44DA76" size={20} />
          </View>
          <View style={styles.changeContent}>
            <Text style={styles.changeLabel}>Kembalian</Text>
            <Text style={styles.changeValue}>
              {currencySymbol} {formatCurrency(changeAmount.toString(), currency)}
            </Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.recordChangeButton,
              recordChange && styles.recordChangeButtonActive
            ]}
            onPress={() => setRecordChange(!recordChange)}
          >
            <Text style={[
              styles.recordChangeText,
              recordChange && styles.recordChangeTextActive
            ]}>
              {recordChange ? "✓ Catat" : "✗ Jangan Catat"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {changeAmount === 0 && cashPaid && parseFloat(cashPaid) > 0 && (
        <View style={[styles.changeContainer, styles.noChangeContainer]}>
          <Text style={styles.noChangeText}>
            Uang yang dibayarkan kurang dari total belanja
          </Text>
        </View>
      )}

      {/* Catatan Pengeluaran (Auto Generated) */}
      <Text style={styles.label}>Catatan Pengeluaran</Text>
      <TextInput
        style={styles.inputNote}
        placeholder="Catatan pengeluaran..."
        placeholderTextColor="#777"
        value={note}
        onChangeText={setNote}
        multiline
        editable={true}
      />
      {fromScan && extractedItems.length > 0 && (
        <Text style={styles.noteHelper}>
          Catatan telah dibuat otomatis berdasarkan item yang terdeteksi
        </Text>
      )}

      {/* Kategori */}
      <Text style={styles.label}>Kategori Pengeluaran</Text>
      <View style={styles.categoryWrapper}>
        {PRESET_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.name}
            style={[
              styles.categoryButton,
              selectedCategory === cat.name && styles.categorySelected,
            ]}
            onPress={() => setSelectedCategory(cat.name)}
          >
            <View style={styles.categoryIcon}>{cat.icon}</View>
            <Text style={styles.categoryText}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Ringkasan */}
      {(parseFloat(rawAmount) > 0 || changeAmount > 0) && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Ringkasan Transaksi</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Belanja:</Text>
            <Text style={styles.summaryValue}>
              {currencySymbol} {displayAmount || "0"}
            </Text>
          </View>
          
          {cashPaid && parseFloat(cashPaid) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Dibayar:</Text>
              <Text style={styles.summaryValue}>
                {currencySymbol} {displayCashPaid}
              </Text>
            </View>
          )}
          
          {changeAmount > 0 && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Kembalian:</Text>
                <Text style={[styles.summaryValue, styles.summaryChangeValue]}>
                  {currencySymbol} {formatCurrency(changeAmount.toString(), currency)}
                </Text>
              </View>
              
              {recordChange && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Status Kembalian:</Text>
                  <Text style={[styles.summaryValue, styles.summaryIncomeText]}>
                    Akan dicatat sebagai pendapatan
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, loading && { opacity: 0.5 }]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveText}>
          {loading ? "Menyimpan..." : "Simpan Transaksi"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ResultScan;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#151716",
    paddingHorizontal: 20,
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
    backgroundColor: "#2A2A2A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#44DA76",
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
    color: "#AAA",
    fontSize: 13,
  },

  itemsContainer: {
    backgroundColor: "#1E201F",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },

  itemsTitle: {
    color: "#FF6B6B",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },

  itemsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  itemBadge: {
    backgroundColor: "#2A2A2A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  itemText: {
    color: "white",
    fontSize: 12,
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

  autoSetButton: {
    backgroundColor: "#2A2A2A",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },

  autoSetText: {
    color: "#FF6B6B",
    fontSize: 12,
    fontWeight: "600",
  },

  label: {
    color: "#FF6B6B",
    fontSize: 15,
    marginBottom: 10,
    marginTop: 20,
    fontWeight: "600",
  },

  inputNote: {
    backgroundColor: "#1E201F",
    borderRadius: 10,
    padding: 12,
    color: "white",
    height: 80,
    fontSize: 16,
    textAlignVertical: "top",
  },

  noteHelper: {
    color: "#666",
    fontSize: 11,
    marginTop: 6,
    marginLeft: 4,
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
    borderRadius: 12,
    backgroundColor: "#252525",
  },

  categorySelected: {
    borderColor: "#FF6B6B",
    borderWidth: 1,
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
    fontWeight: "600",
  },

  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E2A1E",
    borderRadius: 12,
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
    paddingVertical: 6,
    borderRadius: 8,
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
  },

  recordChangeTextActive: {
    color: "#44DA76",
    fontWeight: "600",
  },

  summaryContainer: {
    backgroundColor: "#1E201F",
    borderRadius: 12,
    padding: 16,
    marginTop: 25,
    marginBottom: 10,
  },

  summaryTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  summaryLabel: {
    color: "#AAA",
    fontSize: 14,
  },

  summaryValue: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },

  summaryChangeValue: {
    color: "#44DA76",
  },

  summaryIncomeText: {
    color: "#44DA76",
    fontSize: 12,
  },

  saveButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 30,
    marginBottom: 40,
    alignItems: "center",
  },

  saveText: {
    color: "#151716",
    fontSize: 16,
    fontWeight: "700",
  },
});