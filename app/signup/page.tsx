import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SignupRedirectPage() {
  redirect("/login?next=/auth/register-role");
}
