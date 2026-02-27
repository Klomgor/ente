import { Box } from "@mui/material";
import type { ReactNode } from "react";

interface PasteFrameProps {
    children: ReactNode;
    footer: ReactNode;
}

export const PasteFrame = ({ children, footer }: PasteFrameProps) => (
    <Box
        sx={{
            minHeight: "100dvh",
            bgcolor: "accent.main",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            p: { xs: 1, md: 3 },
            boxSizing: "border-box",
        }}
    >
        <Box
            sx={{
                minHeight: {
                    xs: "calc(100dvh - 16px)",
                    md: "calc(100dvh - 48px)",
                },
                flex: 1,
                width: "100%",
                bgcolor: "background.default",
                borderRadius: { xs: "20px", md: "40px" },
                display: "grid",
                gridTemplateRows: "1fr auto",
                alignItems: "stretch",
                "& ::selection": {
                    backgroundColor: "accent.main",
                    color: "fixed.white",
                },
                "& ::-moz-selection": {
                    backgroundColor: "accent.main",
                    color: "fixed.white",
                },
            }}
        >
            <Box
                sx={{
                    width: "100%",
                    maxWidth: 760,
                    mx: "auto",
                    px: { xs: 3, md: 5 },
                    pb: { xs: 2, md: 2.5 },
                    mt: { xs: 4, md: 5 },
                }}
            >
                {children}
            </Box>
            <Box
                sx={{
                    width: "100%",
                    maxWidth: 760,
                    mx: "auto",
                    px: { xs: 3, md: 5 },
                    pt: { xs: 2, md: 2.5 },
                    pb: { xs: 3, md: 3.5 },
                }}
            >
                {footer}
            </Box>
        </Box>
    </Box>
);
