
interface LogoProps {
    size?: number;
    className?: string;
}

export function Logo({ size = 40, className = "" }: LogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Palace Structure */}
            <path
                d="M3 9.5L12 3l9 6.5V21H3V9.5z"
                fill="url(#logo-grad)"
                opacity="0.9"
                filter="url(#logo-glow)"
            />

            {/* Door / Portal */}
            <rect
                x="9"
                y="14"
                width="6"
                height="7"
                rx="1"
                fill="rgba(255,255,255,0.25)"
            />

            {/* Subtle architectural line */}
            <path
                d="M12 3v18"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="0.5"
            />

            {/* Abstract memory "artifact" shape in the roof */}
            <circle cx="12" cy="8.5" r="1.5" fill="rgba(255,255,255,0.4)" />
        </svg>
    );
}
