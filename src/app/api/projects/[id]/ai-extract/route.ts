import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { extractFromFile, extractFromText } from "@/lib/gemini";
import * as XLSX from "xlsx";

export const maxDuration = 60;

/**
 * POST /api/projects/:id/ai-extract
 * multipart/form-data:
 *   - files: File[] (PDF/画像/Excel/Word)
 *   - context?: string （ユーザーの補足情報）
 *   - text?: string （音声書き起こし等のテキスト入力）
 *
 * 結果: ExtractedFormData
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const context = (form.get("context") as string | null) || undefined;
  const textInput = (form.get("text") as string | null) || undefined;
  const files = form.getAll("files") as File[];

  try {
    let merged: any = {};
    // テキスト抽出ファイルはExcel/CSV。それ以外はGeminiに直接送る。
    for (const f of files) {
      const buf = Buffer.from(await f.arrayBuffer());
      const isExcel =
        f.name.endsWith(".xlsx") ||
        f.name.endsWith(".xls") ||
        f.name.endsWith(".csv") ||
        f.type.includes("spreadsheet") ||
        f.type.includes("excel");
      let extracted;
      if (isExcel) {
        const wb = XLSX.read(buf, { type: "buffer" });
        const chunks: string[] = [];
        for (const name of wb.SheetNames) {
          const sheet = wb.Sheets[name];
          chunks.push(`【シート: ${name}】\n${XLSX.utils.sheet_to_csv(sheet)}`);
        }
        const text = chunks.join("\n\n");
        extracted = await extractFromText(
          `以下はユーザーがアップロードしたExcel/CSVの内容です。${context ? "補足: " + context : ""}\n\n${text}`
        );
      } else {
        // PDF/画像/Word等は直接Geminiへ
        const mime = f.type || guessMime(f.name);
        extracted = await extractFromFile(buf, mime, context);
      }
      merged = deepMerge(merged, extracted);
    }
    if (textInput) {
      const extracted = await extractFromText(textInput);
      merged = deepMerge(merged, extracted);
    }
    return NextResponse.json({ data: merged });
  } catch (e: any) {
    console.error("AI extract error", e);
    return NextResponse.json(
      { error: e.message || "AI抽出に失敗しました" },
      { status: 500 }
    );
  }
}

function guessMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    heic: "image/heic",
    txt: "text/plain",
  };
  return (ext && map[ext]) || "application/octet-stream";
}

function deepMerge(a: any, b: any): any {
  if (!a) return b;
  if (!b) return a;
  const out: any = { ...a };
  for (const k of Object.keys(b)) {
    if (Array.isArray(b[k])) {
      out[k] = [...(a[k] || []), ...b[k]];
    } else if (typeof b[k] === "object" && b[k] !== null) {
      out[k] = deepMerge(a[k], b[k]);
    } else if (b[k] !== undefined && b[k] !== null && b[k] !== "") {
      out[k] = b[k];
    }
  }
  return out;
}
