import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { processTool } from "@/lib/tools";
import { getTool } from "@/lib/tool-config";
import { TOOLS_DIR } from "@/lib/paths";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let inputPath: string | null = null;

  try {
    const form = await request.formData();
    const slug = String(form.get("tool") || "");
    const tool = getTool(slug);
    if (!tool) {
      return NextResponse.json({ error: "Unknown tool." }, { status: 400 });
    }

    const rawOptions = String(form.get("options") || "{}");
    let options: Record<string, string> = {};
    try {
      options = JSON.parse(rawOptions);
    } catch {
      options = {};
    }

    if (tool.kind === "file") {
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "A file is required." }, { status: 400 });
      }
      const id = uuidv4();
      const ext = path.extname(file.name) || "";
      const toolsDir = TOOLS_DIR;
      if (!fs.existsSync(toolsDir)) fs.mkdirSync(toolsDir, { recursive: true });
      inputPath = path.join(toolsDir, `${id}_in${ext}`);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(inputPath, buffer);
      options.inputName = file.name;
    }

    const result = await processTool(slug, inputPath, options);

    const buffer = fs.readFileSync(result.outputPath);
    try {
      fs.unlinkSync(result.outputPath);
    } catch {
      // ignore
    }
    if (inputPath) {
      try {
        fs.unlinkSync(inputPath);
      } catch {
        // ignore
      }
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.outputName}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error: unknown) {
    if (inputPath) {
      try {
        fs.unlinkSync(inputPath);
      } catch {
        // ignore
      }
    }
    const message =
      error instanceof Error ? error.message : "Processing failed. Please try again.";
    console.error("Tool processing error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
