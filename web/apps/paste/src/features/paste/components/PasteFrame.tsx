import GitHubIcon from "@mui/icons-material/GitHub";
import { Box, IconButton } from "@mui/material";
import type { ReactNode } from "react";

interface PasteFrameProps {
    children: ReactNode;
    footer: ReactNode;
}

export const PasteFrame = ({ children, footer }: PasteFrameProps) => (
    <Box
        sx={{
            minHeight: "100dvh",
            width: "100%",
            maxWidth: "100%",
            bgcolor: "#2f6df7",
            fontFamily: '"Inter Variable", sans-serif',
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            p: { xs: 1.25, md: 2 },
            boxSizing: "border-box",
            overflowX: "hidden",
        }}
    >
        <Box
            sx={{
                position: "relative",
                minHeight: {
                    xs: "calc(100dvh - 20px)",
                    md: "calc(100dvh - 32px)",
                },
                flex: 1,
                width: "100%",
                maxWidth: "100%",
                bgcolor: "#0d1016",
                borderRadius: { xs: "24px", md: "34px" },
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
                alignItems: "stretch",
                boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
                overflowX: "hidden",
                "& ::selection": {
                    backgroundColor: "#2f6df7",
                    color: "#ffffff",
                },
                "& ::-moz-selection": {
                    backgroundColor: "#2f6df7",
                    color: "#ffffff",
                },
            }}
        >
            <Box
                sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: { xs: 3, md: 4.5 },
                    pt: { xs: 3, md: 3.5 },
                }}
            >
                <Box
                    component="img"
                    src="/images/pastelogo.png"
                    alt="Ente Paste"
                    sx={{
                        display: "block",
                        width: "auto",
                        height: { xs: 34, md: 40 },
                        maxWidth: { xs: 220, md: 260 },
                    }}
                />
                <IconButton
                    component="a"
                    href="https://github.com/ente-io/ente"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View source on GitHub"
                    sx={{
                        width: 42,
                        height: 42,
                        bgcolor: "transparent",
                        color: "#f4f7ff",
                        "&:hover": { bgcolor: "rgba(255, 255, 255, 0.12)" },
                    }}
                >
                    <GitHubIcon sx={{ fontSize: 30 }} />
                </IconButton>
            </Box>
            <Box
                sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    px: { xs: 3, md: 5 },
                    py: { xs: 2, md: 3 },
                }}
            >
                <Box sx={{ width: "100%", maxWidth: 700 }}>{children}</Box>
            </Box>
            <Box
                sx={{
                    width: "100%",
                    maxWidth: 700,
                    mx: "auto",
                    px: { xs: 3, md: 5 },
                    pt: { xs: 2, md: 2.5 },
                    pb: { xs: 3, md: 3.25 },
                }}
            >
                {footer}
            </Box>
        </Box>
    </Box>
);
