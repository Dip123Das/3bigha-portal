export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { savePushToken } from "@/lib/mobile/savePushToken";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid session",
        },
        {
          status: 401,
        }
      );
    }

    const body = await req.json();

    const token = String(body?.token || "").trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing token",
        },
        {
          status: 400,
        }
      );
    }

    await savePushToken({
      userId: user.id,
      token,

      role:
        typeof body?.role === "string"
          ? body.role
          : null,

      platform:
        typeof body?.platform === "string"
          ? body.platform
          : "android",

      deviceId:
        typeof body?.deviceId === "string"
          ? body.deviceId
          : null,

      deviceName:
        typeof body?.deviceName === "string"
          ? body.deviceName
          : null,

      appVersion:
        typeof body?.appVersion === "string"
          ? body.appVersion
          : null,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error("Push registration failed", err);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}