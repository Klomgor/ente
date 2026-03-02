import { Link01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import {
    Box,
    Button,
    Dialog,
    IconButton,
    Stack,
    Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    parseArrowLottie,
    type ParsedArrow,
    type ParsedArrowPath,
} from "../utils/lottie";
import { createQrSvgData } from "../utils/qrCode";

interface PasteLinkCardProps {
    link: string;
    onCopy: (value: string) => Promise<void>;
    onShare: (url: string) => Promise<void>;
}

interface MeasuredPath {
    len: number;
    parsed: ParsedArrowPath;
    path: SVGPathElement;
}

export const PasteLinkCard = ({
    link,
    onCopy,
    onShare,
}: PasteLinkCardProps) => {
    const inputGlassBg = "rgba(39, 42, 52, 0.76)";
    const inputGlassBorder = "rgba(213, 225, 255, 0.14)";
    const inputGlassSurface =
        "linear-gradient(160deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 58%, rgba(255, 255, 255, 0.015) 100%)";
    const inputGlassShadow =
        "0 12px 28px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.1)";
    const linkCardRef = useRef<HTMLDivElement | null>(null);
    const arrowSvgRef = useRef<SVGSVGElement | null>(null);
    const [arrow, setArrow] = useState<ParsedArrow | null>(null);
    const [showCopied, setShowCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [showViewConfirm, setShowViewConfirm] = useState(false);
    const qrSvgData = useMemo(() => createQrSvgData(link), [link]);
    const isCompactQrModal = useMediaQuery("(max-width:767px)", {
        noSsr: true,
    });

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
        setShowQr(false);
    }, [link]);

    useEffect(() => {
        let cancelled = false;

        const loadArrow = async () => {
            try {
                const response = await fetch("/arrow.json");
                if (!response.ok) return;

                const json: unknown = await response.json();
                if (cancelled) return;

                const parsed = parseArrowLottie(json);
                setArrow(parsed);
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
            svg.querySelectorAll<SVGPathElement>(
                'path[data-arrow-path="true"]',
            ),
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
            .filter((item): item is MeasuredPath => item.parsed !== undefined);

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

    useEffect(() => {
        if (!showCopied) return;
        const timeoutId = window.setTimeout(() => {
            setShowCopied(false);
        }, 1400);
        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [showCopied]);

    const handleCopyClick = () => {
        setShowCopied(false);
        void onCopy(link)
            .then(() => {
                setShowCopied(true);
            })
            .catch(() => {
                setShowCopied(false);
            });
    };

    const handleCloseViewConfirm = () => {
        setShowViewConfirm(false);
    };

    const handleCopyFromConfirm = () => {
        handleCloseViewConfirm();
        handleCopyClick();
    };

    const handleConfirmOpenLink = () => {
        handleCloseViewConfirm();
        window.open(link, "_blank", "noopener,noreferrer");
    };

    return (
        <Stack
            ref={linkCardRef}
            spacing={1}
            sx={{
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                scrollMarginTop: { xs: "16px", md: "24px" },
            }}
        >
            <Typography
                sx={{
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    letterSpacing: "0.01em",
                    color: "rgba(220, 229, 255, 0.76)",
                    maxWidth: "100%",
                }}
            >
                One-Time Link
            </Typography>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", sm: "center" }}
                sx={{
                    width: { xs: "calc(100vw - 4rem)", sm: "100%" },
                    maxWidth: { xs: "100%" },
                    minWidth: 0,
                    mx: "auto",
                    position: "relative",
                    zIndex: 1,
                }}
            >
                <Box
                    sx={{
                        width: "100%",
                        maxWidth: "100%",
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        alignItems: "center",
                        boxSizing: "border-box",
                        px: { xs: 1.9, sm: 2.2 },
                        py: { xs: 1.05, sm: 1.2 },
                        borderRadius: "14px",
                        border: "1px solid rgba(214, 226, 255, 0.16)",
                        bgcolor: "rgba(255, 255, 255, 0.05)",
                        backdropFilter: "blur(8px) saturate(108%)",
                        WebkitBackdropFilter: "blur(8px) saturate(108%)",
                        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                        overflow: "hidden",
                    }}
                >
                    <Typography
                        component="a"
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={link}
                        onClick={(event) => {
                            event.preventDefault();
                            setShowViewConfirm(true);
                        }}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: { xs: "flex-start", md: "center" },
                            height: "100%",
                            width: "100%",
                            maxWidth: "100%",
                            gap: 0.9,
                            minWidth: 0,
                            color: "rgba(244, 247, 255, 0.9)",
                            textDecoration: "none",
                            fontSize: { xs: "0.9rem", sm: "0.93rem" },
                            lineHeight: 1.4,
                            textAlign: "left",
                            overflow: "hidden",
                            "&:hover": {
                                textDecoration: "underline",
                                color: "rgba(244, 247, 255, 1)",
                            },
                        }}
                    >
                        <Box
                            sx={{
                                width: 20,
                                height: 20,
                                display: "grid",
                                placeItems: "center",
                                flexShrink: 0,
                                alignSelf: "center",
                            }}
                        >
                            <HugeiconsIcon
                                icon={Link01Icon}
                                size={17}
                                strokeWidth={1.9}
                            />
                        </Box>
                        <Box
                            component="span"
                            sx={{
                                flex: { xs: 1, md: "0 1 auto" },
                                minWidth: 0,
                                maxWidth: { md: "calc(100% - 28px)" },
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
                {arrow && (
                    <Box
                        sx={{
                            display: { xs: "block", sm: "none" },
                            position: "absolute",
                            left: { xs: 18 },
                            "@media (max-width:449.95px)": { left: 6 },
                            top: "100%",
                            mt: "-22px",
                            width: 132,
                            height: "auto",
                            zIndex: 3,
                            pointerEvents: "none",
                            transform: "rotate(24deg)",
                            transformOrigin: "50% 50%",
                        }}
                    >
                        <svg
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
                                        key={`${path.d}-mobile-${idx}`}
                                        d={path.d}
                                        fill="none"
                                        stroke={path.color}
                                        strokeWidth={
                                            path.width * path.strokeScale
                                        }
                                        strokeLinecap={path.lineCap}
                                        strokeLinejoin={path.lineJoin}
                                    />
                                ))}
                            </g>
                        </svg>
                    </Box>
                )}
            </Stack>
            <Box
                sx={{
                    display: "flex",
                    alignItems: { xs: "center", sm: "center" },
                    justifyContent: {
                        xs: "flex-start",
                        sm: "flex-start",
                        md: "center",
                    },
                    flexDirection: { xs: "column", sm: "row" },
                    gap: { xs: 0.45, sm: 1.1 },
                    pl: { xs: 0, sm: 0.5, md: 0 },
                    mt: { xs: 2.5, sm: 1.1 },
                    opacity: 0.9,
                    width: "100%",
                    maxWidth: "100%",
                    minWidth: 0,
                    overflow: "visible",
                }}
            >
                {arrow && (
                    <Box
                        sx={{
                            display: { xs: "none", sm: "block" },
                            width: { sm: 178, md: 212 },
                            height: "auto",
                            alignSelf: "auto",
                            ml: 0,
                            mt: { sm: 0.35, md: 0.25 },
                            mb: { sm: 0, md: 0 },
                            position: "relative",
                            zIndex: 4,
                            transform: "translateY(8px) rotate(28deg)",
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
                                        strokeWidth={
                                            path.width * path.strokeScale
                                        }
                                        strokeLinecap={path.lineCap}
                                        strokeLinejoin={path.lineJoin}
                                    />
                                ))}
                            </g>
                        </svg>
                    </Box>
                )}
                <Stack
                    spacing={{ xs: 0.18, sm: 0.32 }}
                    sx={{
                        width: { xs: "100%", sm: "auto" },
                        maxWidth: { xs: 280, sm: "none" },
                        pl: { xs: 0, sm: 0 },
                        mx: { xs: "auto", sm: 0 },
                        transform: { xs: "translate(86px, 50px)", sm: "none" },
                        "@media (max-width:449.95px)": {
                            transform: "translate(96px, 50px)",
                        },
                    }}
                >
                    <Stack
                        direction="row"
                        spacing={{ xs: 1.2, sm: 2.8 }}
                        alignItems="flex-end"
                        justifyContent={{ xs: "flex-start", sm: "flex-start" }}
                    >
                        <IconButton
                            aria-label={
                                showQr ? "Hide QR code" : "Show QR code"
                            }
                            aria-pressed={showQr}
                            onClick={() => {
                                setShowQr((value) => !value);
                            }}
                            sx={{
                                width: { xs: 36, sm: 40 },
                                height: { xs: 36, sm: 40 },
                                borderRadius: "11px",
                                border: "1px solid rgba(244, 247, 255, 0.35)",
                                bgcolor: showQr
                                    ? "rgba(244, 247, 255, 0.22)"
                                    : "rgba(244, 247, 255, 0.12)",
                                color: "#f4f7ff",
                                transform: {
                                    xs: "translateY(4px) rotate(-4deg)",
                                    sm: "translateY(74px) rotate(-4deg)",
                                },
                                "&:hover": {
                                    bgcolor: showQr
                                        ? "rgba(244, 247, 255, 0.28)"
                                        : "rgba(244, 247, 255, 0.18)",
                                },
                            }}
                        >
                            <QrCode2RoundedIcon
                                sx={{ fontSize: { xs: 21, sm: 23 } }}
                            />
                        </IconButton>
                        <Typography
                            component="button"
                            onClick={() => {
                                void onShare(link);
                            }}
                            sx={{
                                fontFamily:
                                    '"Gochi Hand", "Comic Sans MS", "Bradley Hand", cursive',
                                fontSize: { xs: "2rem", sm: "2.5rem" },
                                color: "#2f6df7",
                                background: "none",
                                border: "none",
                                p: 0,
                                m: 0,
                                lineHeight: 1,
                                cursor: "pointer",
                                textDecoration: "underline",
                                textUnderlineOffset: "3px",
                                transform: {
                                    xs: "rotate(-3deg)",
                                    sm: "translateY(68px) rotate(-4deg)",
                                },
                                "&:hover": {
                                    color: "#5d92ff",
                                    textDecoration: "underline",
                                    textUnderlineOffset: "3px",
                                },
                            }}
                        >
                            Share
                        </Typography>
                        <Box
                            sx={{
                                transform: {
                                    xs: "rotate(3deg)",
                                    sm: "translateY(94px) rotate(4deg)",
                                },
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                minWidth: 0,
                                position: "relative",
                            }}
                        >
                            <Typography
                                component="button"
                                onClick={handleCopyClick}
                                sx={{
                                    fontFamily:
                                        '"Gochi Hand", "Comic Sans MS", "Bradley Hand", cursive',
                                    fontSize: { xs: "2rem", sm: "2.5rem" },
                                    color: "#2f6df7",
                                    background: "none",
                                    border: "none",
                                    p: 0,
                                    m: 0,
                                    lineHeight: 1,
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                    textUnderlineOffset: "3px",
                                    "&:hover": {
                                        color: "#5d92ff",
                                        textDecoration: "underline",
                                        textUnderlineOffset: "3px",
                                    },
                                }}
                            >
                                Copy
                            </Typography>
                            <Typography
                                variant="mini"
                                sx={{
                                    fontFamily:
                                        '"Gochi Hand", "Comic Sans MS", "Bradley Hand", cursive',
                                    position: "absolute",
                                    top: "100%",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    mt: 0.5,
                                    whiteSpace: "nowrap",
                                    color: "rgba(182, 190, 208, 0.9)",
                                    fontSize: "0.94rem",
                                    fontWeight: 600,
                                    lineHeight: 1,
                                    letterSpacing: "0.06em",
                                    opacity: showCopied ? 1 : 0,
                                    transition: "opacity 150ms ease",
                                    pointerEvents: "none",
                                }}
                            >
                                Copied to clipboard.
                            </Typography>
                        </Box>
                    </Stack>
                    {showQr && qrSvgData && !isCompactQrModal && (
                        <Box
                            sx={{
                                position: "fixed",
                                right: { xs: 22, sm: 32, md: 42 },
                                bottom: { xs: 28, sm: 38, md: 50 },
                                zIndex: 1300,
                                p: 0.95,
                                borderRadius: "14px",
                                border: "1px solid rgba(47, 109, 247, 0.4)",
                                bgcolor: "rgba(47, 109, 247, 0.14)",
                                boxShadow: "0 10px 24px rgba(0, 0, 0, 0.22)",
                                backdropFilter: "blur(8px) saturate(106%)",
                                WebkitBackdropFilter:
                                    "blur(8px) saturate(106%)",
                            }}
                        >
                            <Box
                                component="svg"
                                viewBox={`0 0 ${qrSvgData.viewBoxSize} ${qrSvgData.viewBoxSize}`}
                                role="img"
                                aria-label="QR code for paste link"
                                sx={{
                                    display: "block",
                                    width: { xs: 144, sm: 168, md: 184 },
                                    height: { xs: 144, sm: 168, md: 184 },
                                    borderRadius: "10px",
                                    bgcolor: "#fff",
                                    p: 1,
                                }}
                            >
                                {qrSvgData.modules.map((module) => (
                                    <rect
                                        key={`${module.x}-${module.y}`}
                                        x={module.x}
                                        y={module.y}
                                        width={1}
                                        height={1}
                                        rx={module.finder ? 0.08 : 0.34}
                                        fill={
                                            module.finder
                                                ? "#1d3d9f"
                                                : "#2f6df7"
                                        }
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}
                </Stack>
                <Dialog
                    open={showViewConfirm}
                    onClose={handleCloseViewConfirm}
                    maxWidth="xs"
                    fullWidth
                    slotProps={{
                        backdrop: {
                            sx: {
                                bgcolor: "rgba(5, 10, 24, 0.74)",
                                backdropFilter: "blur(2px)",
                            },
                        },
                        paper: {
                            sx: {
                                mx: 2,
                                borderRadius: "20px",
                                border: "1px solid",
                                borderColor: inputGlassBorder,
                                bgcolor: inputGlassBg,
                                background: inputGlassSurface,
                                boxShadow: inputGlassShadow,
                                backdropFilter: "blur(9px) saturate(112%)",
                                WebkitBackdropFilter:
                                    "blur(9px) saturate(112%)",
                            },
                        },
                    }}
                >
                    <Box
                        sx={{ p: { xs: 2.1, sm: 2.35 }, position: "relative" }}
                    >
                        <IconButton
                            aria-label="Close confirmation dialog"
                            onClick={handleCloseViewConfirm}
                            size="small"
                            sx={{
                                position: "absolute",
                                top: 10,
                                right: 10,
                                color: "rgba(225, 233, 255, 0.86)",
                            }}
                        >
                            <CloseRoundedIcon fontSize="small" />
                        </IconButton>
                        <Typography
                            aria-hidden="true"
                            sx={{
                                fontSize: "1.85rem",
                                lineHeight: 1,
                                textAlign: "center",
                                mb: 0.6,
                            }}
                        >
                            👀
                        </Typography>
                        <Typography
                            sx={{
                                color: "rgba(244, 247, 255, 0.95)",
                                fontWeight: 700,
                                fontSize: { xs: "1rem", sm: "1.06rem" },
                                lineHeight: 1.3,
                                textAlign: "center",
                            }}
                        >
                            Open one-time link?
                        </Typography>
                        <Typography
                            sx={{
                                mt: 1,
                                color: "rgba(220, 229, 255, 0.82)",
                                fontSize: { xs: "0.88rem", sm: "0.91rem" },
                                lineHeight: 1.5,
                                textAlign: "center",
                            }}
                        >
                            This link can be opened only once. Not ready yet?
                            Copy the link instead.
                        </Typography>
                        <Stack
                            direction="row"
                            spacing={1.1}
                            justifyContent="center"
                            sx={{ mt: 2.2, width: "100%" }}
                        >
                            <Button
                                onClick={handleCopyFromConfirm}
                                sx={{
                                    textTransform: "none",
                                    fontSize: { xs: "0.88rem", sm: "0.9rem" },
                                    fontWeight: 600,
                                    letterSpacing: "0.01em",
                                    minWidth: { xs: 122, sm: 132 },
                                    py: 0.58,
                                    px: 1.5,
                                    borderRadius: "10px",
                                    borderColor: "rgba(214, 226, 255, 0.28)",
                                    color: "rgba(236, 242, 255, 0.95)",
                                    "&:hover": {
                                        borderColor:
                                            "rgba(214, 226, 255, 0.44)",
                                        bgcolor: "rgba(255, 255, 255, 0.06)",
                                    },
                                }}
                                variant="outlined"
                            >
                                Copy link
                            </Button>
                            <Button
                                onClick={handleConfirmOpenLink}
                                sx={{
                                    textTransform: "none",
                                    fontSize: { xs: "0.88rem", sm: "0.9rem" },
                                    fontWeight: 600,
                                    letterSpacing: "0.01em",
                                    minWidth: { xs: 122, sm: 132 },
                                    py: 0.58,
                                    px: 1.5,
                                    borderRadius: "10px",
                                    bgcolor: "#2f6df7",
                                    color: "#f4f7ff",
                                    boxShadow:
                                        "0 2px 8px rgba(47, 109, 247, 0.2)",
                                    "&:hover": {
                                        bgcolor: "#4c86ff",
                                        boxShadow:
                                            "0 3px 10px rgba(47, 109, 247, 0.24)",
                                    },
                                }}
                                variant="contained"
                            >
                                Open Link
                            </Button>
                        </Stack>
                    </Box>
                </Dialog>
                {showQr && qrSvgData && isCompactQrModal && (
                    <Dialog
                        open
                        onClose={() => {
                            setShowQr(false);
                        }}
                        maxWidth={false}
                        slotProps={{
                            backdrop: {
                                sx: {
                                    bgcolor: "rgba(5, 10, 24, 0.72)",
                                    backdropFilter: "blur(2px)",
                                },
                            },
                            paper: {
                                sx: {
                                    m: 2,
                                    borderRadius: "18px",
                                    border: "1px solid rgba(47, 109, 247, 0.44)",
                                    bgcolor: "rgba(9, 18, 48, 0.9)",
                                    boxShadow:
                                        "0 16px 40px rgba(0, 0, 0, 0.42)",
                                },
                            },
                        }}
                    >
                        <Box sx={{ p: 1.15 }}>
                            <Box
                                component="svg"
                                viewBox={`0 0 ${qrSvgData.viewBoxSize} ${qrSvgData.viewBoxSize}`}
                                role="img"
                                aria-label="QR code for paste link"
                                sx={{
                                    display: "block",
                                    width: 226,
                                    height: 226,
                                    borderRadius: "12px",
                                    bgcolor: "#fff",
                                    p: 1.1,
                                }}
                            >
                                {qrSvgData.modules.map((module) => (
                                    <rect
                                        key={`${module.x}-${module.y}`}
                                        x={module.x}
                                        y={module.y}
                                        width={1}
                                        height={1}
                                        rx={module.finder ? 0.08 : 0.34}
                                        fill={
                                            module.finder
                                                ? "#1d3d9f"
                                                : "#2f6df7"
                                        }
                                    />
                                ))}
                            </Box>
                        </Box>
                    </Dialog>
                )}
            </Box>
        </Stack>
    );
};
