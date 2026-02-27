import { Link01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Box, Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";

interface PasteLinkCardProps {
    link: string;
    onCopy: (value: string) => Promise<void>;
    onShare: (url: string) => Promise<void>;
}

type LottiePoint = [number, number];

type LottieShapePath = {
    c: boolean;
    i: LottiePoint[];
    o: LottiePoint[];
    v: LottiePoint[];
};

type ParsedArrowPath = {
    color: string;
    d: string;
    lineCap: "butt" | "round" | "square";
    lineJoin: "miter" | "round" | "bevel";
    name: string;
    strokeScale: number;
    width: number;
};

type ParsedArrow = {
    height: number;
    paths: ParsedArrowPath[];
    transform: string;
    width: number;
};

type MeasuredPath = {
    len: number;
    parsed: ParsedArrowPath;
    path: SVGPathElement;
};

const safePoint = (point?: LottiePoint): [number, number] => [
    point?.[0] ?? 0,
    point?.[1] ?? 0,
];

const toPathD = (shape: LottieShapePath) => {
    if (!shape?.v?.length) return "";

    const { c, i, o, v } = shape;
    const [startX, startY] = safePoint(v[0]);
    let d = `M ${startX} ${startY}`;

    for (let idx = 1; idx < v.length; idx++) {
        const [prevX, prevY] = safePoint(v[idx - 1]);
        const [currX, currY] = safePoint(v[idx]);
        const [prevOutX, prevOutY] = safePoint(o[idx - 1]);
        const [currInX, currInY] = safePoint(i[idx]);
        const hasCurve =
            prevOutX !== 0 || prevOutY !== 0 || currInX !== 0 || currInY !== 0;

        if (hasCurve) {
            d += ` C ${prevX + prevOutX} ${prevY + prevOutY} ${
                currX + currInX
            } ${currY + currInY} ${currX} ${currY}`;
        } else {
            d += ` L ${currX} ${currY}`;
        }
    }

    if (c) {
        const lastIdx = v.length - 1;
        const [prevX, prevY] = safePoint(v[lastIdx]);
        const [currX, currY] = safePoint(v[0]);
        const [prevOutX, prevOutY] = safePoint(o[lastIdx]);
        const [currInX, currInY] = safePoint(i[0]);
        const hasCurve =
            prevOutX !== 0 || prevOutY !== 0 || currInX !== 0 || currInY !== 0;

        if (hasCurve) {
            d += ` C ${prevX + prevOutX} ${prevY + prevOutY} ${
                currX + currInX
            } ${currY + currInY} ${currX} ${currY}`;
        } else {
            d += ` L ${currX} ${currY}`;
        }
        d += " Z";
    }

    return d;
};

const toLineCap = (value: number): ParsedArrowPath["lineCap"] =>
    value === 2 ? "round" : value === 3 ? "square" : "butt";

const toLineJoin = (value: number): ParsedArrowPath["lineJoin"] =>
    value === 2 ? "round" : value === 3 ? "bevel" : "miter";

const toRGB = (rgb: number[]) => {
    const r = Number(rgb?.[0] ?? 1);
    const g = Number(rgb?.[1] ?? 1);
    const b = Number(rgb?.[2] ?? 1);
    return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
};

const parseArrowLottie = (lottie: any): ParsedArrow | null => {
    const layer = lottie?.layers?.[0];
    if (!layer?.shapes?.length) return null;

    const sx = (Number(layer?.ks?.s?.k?.[0] ?? 100) || 100) / 100;
    const sy = (Number(layer?.ks?.s?.k?.[1] ?? layer?.ks?.s?.k?.[0] ?? 100) || 100) / 100;
    const px = Number(layer?.ks?.p?.k?.[0] ?? 0) || 0;
    const py = Number(layer?.ks?.p?.k?.[1] ?? 0) || 0;

    const paths: ParsedArrowPath[] = [];
    for (const group of layer.shapes) {
        if (group?.ty !== "gr" || !Array.isArray(group?.it)) continue;

        const shape = group.it.find((item: any) => item?.ty === "sh")?.ks
            ?.k as LottieShapePath | undefined;
        const stroke = group.it.find((item: any) => item?.ty === "st");
        if (!shape || !stroke) continue;

        const groupName = String(group?.nm ?? "");
        const d = toPathD(shape as LottieShapePath);
        if (!d) continue;

        paths.push({
            color: toRGB(stroke?.c?.k),
            d,
            lineCap: toLineCap(Number(stroke?.lc ?? 1)),
            lineJoin: toLineJoin(Number(stroke?.lj ?? 1)),
            name: groupName,
            strokeScale: 0.58,
            width: Number(stroke?.w?.k ?? 2),
        });
    }

    if (!paths.length) return null;

    return {
        height: Number(lottie?.h ?? 84) || 84,
        paths,
        transform: `translate(${px} ${py}) scale(${sx} ${sy})`,
        width: Number(lottie?.w ?? 150) || 150,
    };
};

export const PasteLinkCard = ({ link, onCopy, onShare }: PasteLinkCardProps) => {
    const linkCardRef = useRef<HTMLDivElement | null>(null);
    const arrowSvgRef = useRef<SVGSVGElement | null>(null);
    const [arrow, setArrow] = useState<ParsedArrow | null>(null);

    useEffect(() => {
        const linkCard = linkCardRef.current;
        if (!linkCard) return;

        const rect = linkCard.getBoundingClientRect();
        const viewportHeight =
            window.innerHeight || document.documentElement.clientHeight;
        const isOutOfViewport = rect.top < 0 || rect.bottom > viewportHeight;
        if (!isOutOfViewport) return;

        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        linkCard.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start",
        });
    }, [link]);

    useEffect(() => {
        let cancelled = false;

        const loadArrow = async () => {
            try {
                const response = await fetch("/arrow.json");
                if (!response.ok) return;

                const json = await response.json();
                if (cancelled) return;

                const parsed = parseArrowLottie(json);
                if (!cancelled) setArrow(parsed);
            } catch {
                // No-op: The link row works without the hint animation.
            }
        };

        void loadArrow();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const svg = arrowSvgRef.current;
        if (!arrow || !svg) return;

        const paths = Array.from(
            svg.querySelectorAll<SVGPathElement>('path[data-arrow-path="true"]'),
        );
        if (!paths.length) return;

        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        const measured = paths
            .map((path) => {
                const idx = Number(path.dataset.arrowIndex ?? -1);
                const parsed = arrow.paths[idx];
                return {
                    len: Math.max(path.getTotalLength(), 1),
                    parsed,
                    path,
                };
            })
            .filter(
                (item): item is MeasuredPath =>
                    item.parsed !== undefined && item.parsed !== null,
            );

        for (const { path, len, parsed } of measured) {
            const isSecondaryStroke = /shape\s*2/i.test(parsed.name);
            path.style.strokeDasharray = `${len} ${len}`;
            path.style.strokeDashoffset = prefersReducedMotion
                ? "0"
                : `${isSecondaryStroke ? -len : len}`;
        }

        if (prefersReducedMotion) return;

        const animations: Animation[] = [];
        measured.forEach(({ path, len, parsed }) => {
            const isSecondaryStroke = /shape\s*2/i.test(parsed.name);
            const startOffset = isSecondaryStroke ? -len : len;
            const keyframes: Keyframe[] = isSecondaryStroke
                ? [
                      { strokeDashoffset: startOffset, offset: 0 },
                      { strokeDashoffset: startOffset, offset: 0.72 },
                      { strokeDashoffset: 0, offset: 0.93 },
                      { strokeDashoffset: 0, offset: 1 },
                  ]
                : [
                      { strokeDashoffset: startOffset, offset: 0 },
                      { strokeDashoffset: startOffset, offset: 0.02 },
                      { strokeDashoffset: 0, offset: 0.78 },
                      { strokeDashoffset: 0, offset: 1 },
                  ];

            animations.push(
                path.animate(keyframes, {
                    duration: 1400,
                    iterations: 1,
                    fill: "forwards",
                    easing: "linear",
                }),
            );
        });

        return () => {
            animations.forEach((anim) => anim.cancel());
        };
    }, [arrow]);

    return (
        <Stack
            ref={linkCardRef}
            spacing={1}
            sx={{
                scrollMarginTop: {
                    xs: "16px",
                    md: "24px",
                },
            }}
        >
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", sm: "center" }}
                sx={{ minWidth: 0 }}
            >
                <Box
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        px: { xs: 1.9, sm: 2.2 },
                        py: { xs: 1.05, sm: 1.2 },
                        borderRadius: "14px",
                        border: "1px solid rgba(214, 226, 255, 0.16)",
                        bgcolor: "rgba(255, 255, 255, 0.05)",
                        backdropFilter: "blur(8px) saturate(108%)",
                        WebkitBackdropFilter: "blur(8px) saturate(108%)",
                        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                    }}
                >
                    <Typography
                        component="a"
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={link}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.9,
                            minWidth: 0,
                            color: "rgba(244, 247, 255, 0.9)",
                            textDecoration: "none",
                            fontSize: "0.93rem",
                            lineHeight: 1.4,
                            textAlign: "center",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            "&:hover": {
                                textDecoration: "underline",
                                color: "rgba(244, 247, 255, 1)",
                            },
                        }}
                    >
                        <HugeiconsIcon
                            icon={Link01Icon}
                            size={17}
                            strokeWidth={1.9}
                        />
                        <Box
                            component="span"
                            sx={{
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                display: "block",
                            }}
                        >
                            {link}
                        </Box>
                    </Typography>
                </Box>
            </Stack>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: { xs: 0.75, sm: 1.1 },
                    pl: { xs: 0, sm: 0.5 },
                    mt: { xs: 0.8, sm: 1.1 },
                    opacity: 0.9,
                }}
            >
                {arrow && (
                    <Box
                        sx={{
                            width: { xs: 132, sm: 178, md: 212 },
                            height: "auto",
                            transform: "rotate(28deg)",
                            transformOrigin: "50% 50%",
                            pointerEvents: "none",
                        }}
                    >
                        <svg
                            ref={arrowSvgRef}
                            viewBox={`0 0 ${arrow.width} ${arrow.height}`}
                            width="100%"
                            height="100%"
                            fill="none"
                            aria-hidden="true"
                            focusable="false"
                        >
                            <g transform={arrow.transform}>
                                {arrow.paths.map((path, idx) => (
                                    <path
                                        key={`${path.d}-${idx}`}
                                        data-arrow-path="true"
                                        data-arrow-index={idx}
                                        d={path.d}
                                        fill="none"
                                        stroke={path.color}
                                        strokeWidth={path.width * path.strokeScale}
                                        strokeLinecap={path.lineCap}
                                        strokeLinejoin={path.lineJoin}
                                    />
                                ))}
                            </g>
                        </svg>
                    </Box>
                )}
                <Stack
                    direction="row"
                    spacing={{ xs: 2.7, sm: 3.2 }}
                    alignItems="flex-end"
                >
                    <Typography
                        component="button"
                        onClick={() => {
                            void onShare(link);
                        }}
                        sx={{
                            fontFamily:
                                '"Gochi Hand", "Comic Sans MS", "Bradley Hand", cursive',
                            fontSize: { xs: "2.3rem", sm: "2.5rem" },
                            color: "rgba(219, 232, 255, 0.94)",
                            background: "none",
                            border: "none",
                            p: 0,
                            m: 0,
                            lineHeight: 1,
                            cursor: "pointer",
                            textDecoration: "none",
                            transform: { xs: "translateY(-3px) rotate(-3deg)", sm: "translateY(-4px) rotate(-4deg)" },
                            "&:hover": {
                                color: "#2f6df7",
                                textDecoration: "underline",
                                textUnderlineOffset: "3px",
                            },
                        }}
                    >
                        Share
                    </Typography>
                    <Typography
                        component="button"
                        onClick={() => {
                            void onCopy(link);
                        }}
                        sx={{
                            fontFamily:
                                '"Gochi Hand", "Comic Sans MS", "Bradley Hand", cursive',
                            fontSize: { xs: "2.3rem", sm: "2.5rem" },
                            color: "rgba(219, 232, 255, 0.94)",
                            background: "none",
                            border: "none",
                            p: 0,
                            m: 0,
                            lineHeight: 1,
                            cursor: "pointer",
                            textDecoration: "none",
                            transform: { xs: "translateY(5px) rotate(3deg)", sm: "translateY(6px) rotate(4deg)" },
                            "&:hover": {
                                color: "#2f6df7",
                                textDecoration: "underline",
                                textUnderlineOffset: "3px",
                            },
                        }}
                    >
                        Copy
                    </Typography>
                </Stack>
            </Box>
        </Stack>
    );
};
