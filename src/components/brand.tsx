import { Link } from "@tanstack/react-router";

const LOGO_URL =
  "https://static.wixstatic.com/media/448ee5_2e2ee02cf7b44cd3afcc0fcf7b818322~mv2.jpg/v1/fill/w_600,h_290,q_90/Screenshot%202025-03-25%20at%204_edited.jpg";

export function ShagLogo({ onDark = false }: { onDark?: boolean }) {
  const img = (
    <img
      src={LOGO_URL}
      alt="Shag Salon Austin"
      className="block max-h-11 md:max-h-[60px] w-auto"
    />
  );
  return (
    <Link
      to="/"
      className={
        onDark
          ? "inline-flex items-center rounded-md bg-cream px-2 py-1 shadow-sm"
          : "inline-flex items-center"
      }
    >
      {img}
    </Link>
  );
}

export function EventTitle({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const line1 =
    size === "lg"
      ? "text-2xl md:text-3xl"
      : size === "sm"
      ? "text-base"
      : "text-xl md:text-2xl";
  const line2 =
    size === "lg"
      ? "text-5xl md:text-6xl"
      : size === "sm"
      ? "text-2xl"
      : "text-3xl md:text-4xl";
  return (
    <div className={className}>
      <div
        className={`font-mono uppercase ${line1} tracking-[0.35em] leading-[1.1]`}
      >
        Shag <span className="text-gold">×</span> Seaholm
      </div>
      <div
        className={`font-serif italic ${line2} leading-[0.95] mt-1.5`}
      >
        Scavenger Hunt
      </div>
    </div>
  );
}

export function BrandFooter() {
  return (
    <footer className="border-t border-ink/10 bg-cream px-5 py-6 mt-4">
      <div className="max-w-6xl mx-auto text-center space-y-1 font-mono uppercase tracking-widest text-[10px] text-ink/40 leading-relaxed">
        <div>Shag × Seaholm Scavenger Hunt · Where Hair Matters</div>
        <div>
          830 W 3rd St · Austin, TX ·{" "}
          <a
            href="https://instagram.com/shagaustin"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink"
          >
            @shagaustin
          </a>{" "}
          ·{" "}
          <a
            href="https://www.shagaustin.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink"
          >
            shagaustin.com
          </a>
        </div>
      </div>
    </footer>
  );
}
