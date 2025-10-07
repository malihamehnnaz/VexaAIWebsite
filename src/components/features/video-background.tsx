
export default function VideoBackground({ src }: { src: string }) {
    return (
        <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute z-[-1] w-full h-full object-cover"
        >
            <source src={src} type="video/mp4" />
            Your browser does not support the video tag.
        </video>
    )
}
