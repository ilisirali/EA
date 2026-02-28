export const Logo = ({ className = "h-10" }: { className?: string }) => (
    <svg
        viewBox="0 0 200 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        {/* Geometric stylized 'E' (slanted mark) */}
        <path
            d="M10 40L30 10H80L60 40H10Z"
            fill="currentColor"
            className="text-primary"
        />
        <path
            d="M35 50L55 20H105L85 50H35Z"
            fill="currentColor"
            className="text-primary opacity-80"
        />

        {/* EA Text */}
        <text
            x="120"
            y="45"
            fill="currentColor"
            className="text-foreground"
            style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: "800",
                fontSize: "48px",
                letterSpacing: "-2px"
            }}
        >
            EA
        </text>
        <text
            x="120"
            y="58"
            fill="currentColor"
            className="text-muted-foreground"
            style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: "600",
                fontSize: "12px",
                letterSpacing: "4px",
                textTransform: "uppercase"
            }}
        >
            APP
        </text>
    </svg>
);
