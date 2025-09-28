import Image from 'next/image';

export default function Logo() {
  return (
    <div className="flex items-center">
      <Image src="/logo.png" alt="Vexa AI Logo" width={140} height={40} className="h-10 w-auto" />
    </div>
  );
}
