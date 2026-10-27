"use client";
import Link from "next/link";
import { useCart } from "./CartProvider";
export default function CartLink() {
  const { count } = useCart();
  return (
    <Link href="/koszyk" className="rounded-md bg-lime-400 px-3 py-1.5 text-sm font-semibold text-black">
      Koszyk{count > 0 ? ` (${count})` : ""}
    </Link>
  );
}
