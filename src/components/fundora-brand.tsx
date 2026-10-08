import Image from "next/image";

export function BrandGlyph() {
  return (
    <Image
      src="/fundora-logo.png"
      alt="Fundora"
      width={949}
      height={776}
      className="brand-glyph"
      unoptimized
    />
  );
}
