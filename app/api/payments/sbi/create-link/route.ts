import { NextResponse } from "next/server";
export async function POST() { return NextResponse.json({error:"SBI subscription purchases are retired. Use the Razorpay checkout on /dashboard/subscription."},{status:410}); }
