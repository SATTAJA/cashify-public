import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());

app.use(
  express.json({
    limit: "2mb",
  })
);

const PORT = process.env.PORT || 3001;
const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.0-flash";

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY belum diisi di file .env");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const receiptSchema = {
  type: "object",
  properties: {
    merchant: {
      type: "string",
    },
    date: {
      type: "string",
    },
    time: {
      type: "string",
    },
    paymentMethod: {
      type: "string",
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          qty: {
            type: "number",
          },
          price: {
            type: "number",
          },
          total: {
            type: "number",
          },
          discount: {
            type: "number",
          },
          finalTotal: {
            type: "number",
          },
        },
        required: [
          "name",
          "qty",
          "price",
          "total",
          "discount",
          "finalTotal",
        ],
      },
    },
    subtotal: {
      type: "number",
    },
    totalDiscount: {
      type: "number",
    },
    total: {
      type: "number",
    },
    cash: {
      type: "number",
    },
    change: {
      type: "number",
    },
    saved: {
      type: "number",
    },
    tax: {
      type: "number",
    },
    serviceCharge: {
      type: "number",
    },
    note: {
      type: "string",
    },
    confidence: {
      type: "number",
    },
  },
  required: [
    "merchant",
    "date",
    "time",
    "paymentMethod",
    "items",
    "subtotal",
    "totalDiscount",
    "total",
    "cash",
    "change",
    "saved",
    "tax",
    "serviceCharge",
    "note",
    "confidence",
  ],
};

const safeString = (value, fallback = "") => {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value).trim();
};

const safeNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.round(number));
};

const normalizeReceipt = (data, rawText) => {
  const items = Array.isArray(data?.items)
    ? data.items
        .filter((item) => item && item.name)
        .map((item) => {
          const qty =
            Number(item.qty) > 0 ? Number(item.qty) : 1;

          const price = safeNumber(item.price);
          const total =
            safeNumber(item.total) || Math.round(qty * price);

          const discount = safeNumber(item.discount);

          const finalTotal =
            safeNumber(item.finalTotal) ||
            Math.max(total - discount, 0);

          return {
            name: safeString(item.name, "Barang"),
            qty,
            price,
            total,
            discount,
            finalTotal,
          };
        })
    : [];

  const itemSubtotal = items.reduce(
    (sum, item) => sum + item.total,
    0
  );

  const itemDiscount = items.reduce(
    (sum, item) => sum + item.discount,
    0
  );

  const subtotal =
    safeNumber(data?.subtotal) || itemSubtotal;

  const totalDiscount =
    safeNumber(data?.totalDiscount) || itemDiscount;

  const tax = safeNumber(data?.tax);

  const serviceCharge = safeNumber(data?.serviceCharge);

  const total =
    safeNumber(data?.total) ||
    Math.max(
      subtotal - totalDiscount + tax + serviceCharge,
      0
    );

  const cash = safeNumber(data?.cash);

  const change =
    safeNumber(data?.change) ||
    (cash >= total ? cash - total : 0);

  return {
    merchant: safeString(data?.merchant, "Struk Belanja"),
    date: safeString(data?.date),
    time: safeString(data?.time),
    paymentMethod: safeString(
      data?.paymentMethod,
      "Tidak diketahui"
    ),
    items,
    subtotal,
    totalDiscount,
    total,
    cash,
    change,
    saved: safeNumber(data?.saved),
    tax,
    serviceCharge,
    note: safeString(data?.note),
    confidence: Number(data?.confidence) || 0,
    rawText,
  };
};

const buildPrompt = (ocrText) => {
  return `
Kamu adalah AI ekstraksi struk belanja Indonesia untuk aplikasi pencatatan keuangan bernama Cashify.

Tugas kamu:
Ubah teks OCR struk menjadi JSON valid sesuai schema yang diminta.

Aturan penting:
1. Jangan mengarang barang yang tidak ada di teks OCR.
2. Semua nominal rupiah harus berupa number tanpa Rp, IDR, titik, atau koma.
3. Contoh benar: "Rp 12.500" menjadi 12500.
4. Jika qty tidak jelas, gunakan qty = 1.
5. Jika harga satuan tidak jelas tapi total ada, gunakan price = total / qty.
6. Jika diskon per barang ada, isi discount dan finalTotal.
7. Jika data tidak ada, isi string kosong atau number 0.
8. Deteksi merchant/toko, tanggal, jam, barang, qty, harga, subtotal, diskon, total, bayar/tunai, kembalian, pajak, biaya layanan, dan metode pembayaran.
9. paymentMethod boleh berisi: Tunai, QRIS, Debit, Kredit, E-Wallet, Transfer, atau Tidak diketahui.
10. confidence isi angka 0 sampai 1.
11. Jangan tulis markdown.
12. Jangan beri penjelasan di luar JSON.

TEKS OCR:
${ocrText}
`;
};

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Cashify AI backend aktif",
  });
});

app.post("/api/receipt-ai/extract", async (req, res) => {
  try {
    const ocrText = safeString(req.body?.ocrText);

    if (!ocrText || ocrText.length < 5) {
      return res.status(400).json({
        success: false,
        message: "ocrText kosong atau terlalu pendek",
      });
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: buildPrompt(ocrText),
      config: {
        responseMimeType: "application/json",
        responseSchema: receiptSchema,
        temperature: 0.1,
      },
    });

    const text = response.text;

    if (!text) {
      return res.status(500).json({
        success: false,
        message: "Gemini tidak mengembalikan data",
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (error) {
      console.log("JSON PARSE ERROR:", error);
      console.log("RAW GEMINI RESPONSE:", text);

      return res.status(500).json({
        success: false,
        message: "Hasil AI bukan JSON valid",
        raw: text,
      });
    }

    const normalized = normalizeReceipt(parsed, ocrText);

    return res.json({
      success: true,
      data: normalized,
    });
  } catch (error) {
    console.log("AI EXTRACT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal ekstrak struk dengan AI",
      error: String(error?.message || error),
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Cashify AI backend jalan di http://localhost:${PORT}`);
});