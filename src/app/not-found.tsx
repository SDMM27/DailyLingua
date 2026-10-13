import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">404</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold">Page introuvable</h1>
      <Link href="/" className="mt-6 inline-block rounded-2xl bg-ink px-6 py-3 font-semibold text-paper">
        Retour à l’accueil
      </Link>
    </div>
  );
}
