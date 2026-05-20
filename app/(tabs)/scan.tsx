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

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { scanReceiptOCR } from "../../lib/ocr";

const { width } = Dimensions.get("window");

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
  items: ReceiptItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  cash: number;
  change: number;
  saved: number;
  tax: number;
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

  // ======================
  // ANIMATION
  // ======================

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
  }, []);

  // ======================
  // OCR NORMALIZER
  // ======================

  const normalizeOCRText = (text: string) => {
    return text
      .replace(/\r/g, "\n")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[|]/g, "I")
      .replace(/\bTUTAL\b/gi, "TOTAL")
      .replace(/\bT0TAL\b/gi, "TOTAL")
      .replace(/\bTOTAI\b/gi, "TOTAL")
      .replace(/\bTUNAT\b/gi, "TUNAI")
      .replace(/\bTUNA1\b/gi, "TUNAI")
      .replace(/\bKEMGALT\b/gi, "KEMBALI")
      .replace(/\bKEMBALT\b/gi, "KEMBALI")
      .replace(/\bKEMBAL1\b/gi, "KEMBALI")
      .replace(/\bHARGA JUAL\b/gi, "HARGA JUAL")
      .replace(/\bHARCA JUAL\b/gi, "HARGA JUAL")
      .replace(/\bDISK0N\b/gi, "DISKON")
      .replace(/\bDISC\b/gi, "DISKON")
      .replace(/\bPPM\b/gi, "PPN")
      .replace(/\bRPM\b/gi, "RP");
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
      value.includes("(") || value.includes("-");

    const cleaned = value
      .replace(/Rp/gi, "")
      .replace(/[^\d.,]/g, "")
      .replace(/[.,]/g, "");

    const number = Number(cleaned);

    if (!Number.isFinite(number)) return 0;

    return isNegative ? -number : number;
  };

  const getMoneyValuesFromLine = (line: string) => {
    const matches =
      line.match(/\(?-?\d{1,3}(?:[.,]\d{3})+\)?|\(?-?\d{4,}\)?/g) || [];

    return matches
      .map(parseMoney)
      .filter((value) => value !== 0);
  };

  const isAmount = (amount: number) => {
    const absolute = Math.abs(amount);

    return absolute >= 1 && absolute <= 10000000;
  };

  const findAmountByLabel = (
    lines: string[],
    labels: string[]
  ) => {
    for (let i = 0; i < lines.length; i++) {
      const upperLine = lines[i].toUpperCase();

      const hasLabel = labels.some((label) =>
        upperLine.includes(label)
      );

      if (!hasLabel) continue;

      const sameLineAmounts =
        getMoneyValuesFromLine(lines[i]).filter(isAmount);

      if (sameLineAmounts.length > 0) {
        return Math.abs(
          sameLineAmounts[sameLineAmounts.length - 1]
        );
      }

      for (let next = i + 1; next <= i + 2; next++) {
        if (!lines[next]) continue;

        const nextAmounts =
          getMoneyValuesFromLine(lines[next]).filter(isAmount);

        if (nextAmounts.length > 0) {
          return Math.abs(
            nextAmounts[nextAmounts.length - 1]
          );
        }
      }
    }

    return 0;
  };

  const findDiscountByLabel = (
    lines: string[],
    labels: string[]
  ) => {
    for (const line of lines) {
      const upperLine = line.toUpperCase();

      const hasLabel = labels.some((label) =>
        upperLine.includes(label)
      );

      if (!hasLabel) continue;

      const amounts =
        getMoneyValuesFromLine(line).filter(isAmount);

      if (amounts.length > 0) {
        return Math.abs(amounts[amounts.length - 1]);
      }
    }

    return 0;
  };

  // ======================
  // ITEM PARSER
  // ======================

  const isSeparatorLine = (line: string) => {
    return /^[-=_]{4,}$/.test(
      line.replace(/\s/g, "")
    );
  };

  const isSummaryLine = (line: string) => {
    const upperLine = line.toUpperCase();

    return /HARGA JUAL|SUBTOTAL|TOTAL|TUNAI|KEMBALI|ANDA HEMAT|PPN|DPP|TERIMA KASIH|LAYANAN|CALL|EMAIL|PROMO|WWW/.test(
      upperLine
    );
  };

  const isHeaderLine = (line: string) => {
    const upperLine = line.toUpperCase();

    return /NO\.|ORDER|POINT|COFFEE|INDOMARET|ALFAMART|JL\.|JALAN|KM\.|SUMEDANG|SURABAYA|PRICI|TIKL|^\d{2}[./-]\d{2}[./-]\d{2}/.test(
      upperLine
    );
  };

  const parseItemLine = (
    line: string
  ): ReceiptItem | null => {
    if (
      !line ||
      isSeparatorLine(line) ||
      isSummaryLine(line) ||
      isHeaderLine(line)
    ) {
      return null;
    }

    const normalized = normalizeLine(line);

    const itemMatch = normalized.match(
      /^(.+?)\s+(\d{1,3})\s+(\d{1,3}(?:[.,]\d{3})*|\d+)\s+(\d{1,3}(?:[.,]\d{3})*|\d+)$/
    );

    if (!itemMatch) return null;

    const name = itemMatch[1]
      .replace(/\s+/g, " ")
      .trim();

    const qty = Number(itemMatch[2]);
    const price = Math.abs(parseMoney(itemMatch[3]));
    const total = Math.abs(parseMoney(itemMatch[4]));

    if (!name || !qty || !price) return null;

    const calculatedTotal = qty * price;

    const safeTotal =
      total > 0 ? total : calculatedTotal;

    return {
      name,
      qty,
      price,
      total: safeTotal,
      discount: 0,
      finalTotal: safeTotal,
    };
  };

  const parseReceiptItems = (lines: string[]) => {
    const items: ReceiptItem[] = [];
    let reachedSummary = false;

    for (const line of lines) {
      const upperLine = line.toUpperCase();

      if (
        /HARGA JUAL|SUBTOTAL|TOTAL/.test(
          upperLine
        )
      ) {
        reachedSummary = true;
      }

      const isDiscountLine =
        /DISKON|POTONGAN/.test(upperLine);

      if (
        isDiscountLine &&
        !reachedSummary &&
        items.length > 0
      ) {
        const amounts =
          getMoneyValuesFromLine(line).filter(isAmount);

        if (amounts.length > 0) {
          const discount = Math.abs(
            amounts[amounts.length - 1]
          );

          const lastIndex = items.length - 1;
          const lastItem = items[lastIndex];

          items[lastIndex] = {
            ...lastItem,
            discount:
              lastItem.discount + discount,
            finalTotal: Math.max(
              lastItem.finalTotal - discount,
              0
            ),
          };
        }

        continue;
      }

      if (reachedSummary) continue;

      const item = parseItemLine(line);

      if (item) {
        items.push(item);
      }
    }

    return items;
  };

  // ======================
  // MERCHANT PARSER
  // ======================

  const parseMerchant = (lines: string[]) => {
    const knownMerchantLine = lines.find((line) =>
      /INDOMARET|ALFAMART|POINT COFFEE|LAWSON|ALFAMIDI|SUPERINDO|HYPERMART/i.test(
        line
      )
    );

    if (knownMerchantLine) {
      return knownMerchantLine;
    }

    const firstReadableLine = lines.find((line) => {
      if (isSeparatorLine(line)) return false;
      if (/^\d/.test(line)) return false;
      if (isSummaryLine(line)) return false;

      return line.length >= 3;
    });

    return firstReadableLine || "Struk Belanja";
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

    const subtotalByLabel = findAmountByLabel(
      lines,
      [
        "HARGA JUAL",
        "SUBTOTAL",
        "JUMLAH",
        "TOTAL HARGA",
      ]
    );

    const totalByLabel = findAmountByLabel(lines, [
      "TOTAL",
      "GRAND TOTAL",
      "TAGIHAN",
    ]);

    const cash = findAmountByLabel(lines, [
      "TUNAI",
      "CASH",
      "BAYAR",
      "DIBAYAR",
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
    ]);

    const globalDiscount =
      findDiscountByLabel(lines, [
        "DISKON FRISIAN",
        "DISKON FLAG",
        "DISKON TOTAL",
        "POTONGAN",
      ]);

    const itemGrossTotal = items.reduce(
      (sum, item) => sum + item.total,
      0
    );

    const itemDiscountTotal = items.reduce(
      (sum, item) => sum + item.discount,
      0
    );

    const subtotal =
      subtotalByLabel || itemGrossTotal;

    const totalDiscount =
      globalDiscount || itemDiscountTotal || saved;

    const calculatedTotal = Math.max(
      subtotal - totalDiscount,
      0
    );

    const total =
      totalByLabel ||
      calculatedTotal ||
      items.reduce(
        (sum, item) => sum + item.finalTotal,
        0
      );

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
      items,
      subtotal,
      totalDiscount,
      total,
      cash,
      change,
      saved,
      tax,
      rawText: cleanedText,
    };
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const buildReceiptNote = (
    receipt: ReceiptData
  ) => {
    const itemLines =
      receipt.items.length > 0
        ? receipt.items.map((item, index) => {
            const discountText =
              item.discount > 0
                ? `, Diskon: ${formatRupiah(
                    item.discount
                  )}`
                : "";

            return `${index + 1}. ${item.name} | Qty: ${
              item.qty
            } | Harga: ${formatRupiah(
              item.price
            )} | Total: ${formatRupiah(
              item.finalTotal
            )}${discountText}`;
          })
        : ["Barang tidak terdeteksi jelas"];

    return [
      `Merchant: ${receipt.merchant}`,
      "",
      "BARANG/JASA:",
      ...itemLines,
      "",
      "RINGKASAN:",
      `Harga Jual: ${formatRupiah(
        receipt.subtotal
      )}`,
      `Diskon: ${formatRupiah(
        receipt.totalDiscount
      )}`,
      `Total: ${formatRupiah(receipt.total)}`,
      `Tunai: ${formatRupiah(receipt.cash)}`,
      `Kembalian: ${formatRupiah(
        receipt.change
      )}`,
      `Anda Hemat: ${formatRupiah(
        receipt.saved
      )}`,
      `PPN/Pajak: ${formatRupiah(
        receipt.tax
      )}`,
      "",
      "OCR ASLI:",
      receipt.rawText,
    ].join("\n");
  };

  // ======================
  // OCR PROCESS
  // ======================

  const processOCR = async (
    imageUri: string
  ) => {
    try {
      setLoading(true);

      console.log(
        "IMAGE URI:",
        imageUri
      );

      const text =
        await scanReceiptOCR(
          imageUri
        );

      console.log(
        "OCR RESULT:",
        text
      );

      setLoading(false);

      if (!text || text.trim() === "") {
        Alert.alert(
          "Gagal",
          "Teks tidak ditemukan"
        );

        return;
      }

      const receipt = parseReceipt(text);

      console.log(
        "PARSED RECEIPT:",
        receipt
      );

      setOcrText(receipt.rawText);

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
          merchant: receipt.merchant,
          items: JSON.stringify(receipt.items),
          note: buildReceiptNote(receipt),
          rawText: receipt.rawText,
          type: "expense",
          fromScan: "true",
        },
      });
    } catch (error) {
      setLoading(false);

      console.log(
        "OCR ERROR:",
        error
      );

      Alert.alert(
        "Error",
        "Gagal scan struk"
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
          "Izin galeri diperlukan"
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

      const image =
        result.assets[0];

      const manipulated =
        await ImageManipulator.manipulateAsync(
          image.uri,
          [
            {
              resize: {
                width: 1800,
              },
            },
          ],
          {
            compress: 0.9,
            format:
              ImageManipulator.SaveFormat.JPEG,
          }
        );

      await processOCR(
        manipulated.uri
      );
    } catch (error) {
      console.log(error);
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

      console.log(
        "PHOTO:",
        photo
      );

      const manipulated =
        await ImageManipulator.manipulateAsync(
          photo.uri,
          [
            {
              resize: {
                width: 1800,
              },
            },
          ],
          {
            compress: 0.9,
            format:
              ImageManipulator.SaveFormat.JPEG,
          }
        );

      console.log(
        "COMPRESSED:",
        manipulated
      );

      await processOCR(
        manipulated.uri
      );
    } catch (error) {
      setLoading(false);

      console.log(error);

      Alert.alert(
        "Error",
        "Gagal mengambil gambar"
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
          Gunakan kamera untuk scan
          struk otomatis
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

  // ======================
  // SCAN LINE
  // ======================

  const translateY =
    scanAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 210],
    });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* CAMERA */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={
          flashMode === "torch"
        }
      />

      {/* OVERLAY */}
      <View style={styles.overlay}>
        {/* HEADER */}
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

        {/* SCAN AREA */}
        <View style={styles.scanWrapper}>
          <Text style={styles.scanTitle}>
            Arahkan Kamera ke Struk
          </Text>

          <Text style={styles.scanSubtitle}>
            Pastikan seluruh struk terlihat
            jelas
          </Text>

          <View style={styles.scanFrame}>
            {/* CORNERS */}
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

            {/* SCAN LINE */}
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

          {/* OCR RESULT */}
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

        {/* LOADING */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator
              size="large"
              color="#44DA76"
            />

            <Text style={styles.loadingText}>
              Memindai Struk...
            </Text>
          </View>
        )}

        {/* BOTTOM */}
        <View style={styles.bottomContainer}>
          {/* GALLERY */}
          <TouchableOpacity
            style={styles.sideButton}
            onPress={pickImage}
          >
            <Ionicons
              name="images-outline"
              size={24}
              color="white"
            />
          </TouchableOpacity>

          {/* SCAN BUTTON */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.captureOuter}
            onPress={takePhoto}
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

          {/* FLASH */}
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

    marginTop: 8,
    marginBottom: 28,
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
      "rgba(0,0,0,0.6)",

    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "white",
    marginTop: 14,
    fontSize: 16,
    fontWeight: "600",
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