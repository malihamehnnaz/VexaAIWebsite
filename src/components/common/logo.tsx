import Image from 'next/image';

export default function Logo() {
  return (
    <div className="flex items-center gap-2">
        <Image
          src="/logo.png"
          alt="Vexa AI Logo"
          width={150}
          height={35}
          className="object-contain"
        />
    </div>
  );
}
