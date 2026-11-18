import Link from "next/link";
import { buttonClass, Eyebrow } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="border-t border-ink py-12 md:py-20">
      <Eyebrow>404</Eyebrow>
      <h1 className="sd-display mt-3 text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] text-balance">Page introuvable</h1>
      <Link href="/" className={`${buttonClass.primary} mt-8`}>
        Retour à l’accueil
      </Link>
    </div>
  );
}
