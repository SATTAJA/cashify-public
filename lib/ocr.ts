import * as FileSystem from "expo-file-system/legacy";

const OCR_SPACE_API_KEY =
  "K86109421188957";

export async function scanReceiptOCR(
  imageUri: string
) {
  try {
    // convert image -> base64
    const base64Image =
      await FileSystem.readAsStringAsync(
        imageUri,
        {
          encoding:
            FileSystem.EncodingType.Base64,
        }
      );

    const formData = new FormData();

    formData.append(
      "base64Image",
      `data:image/jpeg;base64,${base64Image}`
    );

    formData.append(
      "apikey",
      OCR_SPACE_API_KEY
    );

    formData.append(
      "language",
      "eng"
    );

    formData.append(
      "OCREngine",
      "2"
    );

    const response = await fetch(
      "https://api.ocr.space/parse/image",
      {
        method: "POST",
        body: formData,
      }
    );

    const result =
      await response.json();

    console.log(
      "OCR SPACE:",
      JSON.stringify(
        result,
        null,
        2
      )
    );

    if (
      result.IsErroredOnProcessing
    ) {
      throw new Error(
        result.ErrorMessage?.[0] ||
          "OCR gagal"
      );
    }

    return (
      result
        ?.ParsedResults?.[0]
        ?.ParsedText || ""
    );
  } catch (error) {
    console.log(
      "OCR ERROR:",
      error
    );

    return "";
  }
}