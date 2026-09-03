import { notFound } from "next/navigation";
import { CheckInScanner } from "@/components/app/check-in-scanner";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const res = await fetch(
    `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/check-in/${token}`,
    { cache: "no-store" }
  );

  if (!res.ok) notFound();

  const stats = await res.json();

  return <CheckInScanner token={token} initialStats={stats} />;
}
