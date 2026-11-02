import { NextResponse } from "next/server";
import { getConfig, saveConfig, ValidationError } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  try {
    await saveConfig(body);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Kayıt başarısız" }, { status: 500 });
  }

  const config = await getConfig();
  return NextResponse.json(config);
}
