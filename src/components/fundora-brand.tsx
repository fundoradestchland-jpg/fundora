import Image from "next/image";

export function BrandGlyph() {
  return (
    <Image
      src="/logo2.jpeg"
      alt="Fundación Amira Aldahab"
      width={949}
      height={776}
      className="brand-glyph"
      unoptimized
    />
  );
}
