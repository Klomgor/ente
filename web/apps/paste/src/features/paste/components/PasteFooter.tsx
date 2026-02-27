import { Box, Stack, Typography } from "@mui/material";
import { EnteLogo } from "ente-base/components/EnteLogo";

const footerLinkStyle = {
    color: "inherit",
    textDecoration: "none",
};

export const PasteFooter = () => (
    <Stack spacing={1.25} alignItems="center">
        <a
            href="https://ente.io"
            target="_blank"
            rel="noopener"
            style={{
                display: "block",
                lineHeight: 0,
                color: "inherit",
                textDecoration: "none",
            }}
        >
            <Box
                sx={{
                    color: "accent.main",
                    "& svg": { color: "accent.main" },
                    "& svg path": { fill: "accent.main" },
                }}
            >
                <EnteLogo height={20} />
            </Box>
        </a>

        <Typography variant="mini" color="text.muted">
            <a
                href="https://ente.io/photos"
                target="_blank"
                rel="noopener"
                style={footerLinkStyle}
            >
                Photos
            </a>{" "}
            {"\u2022"}{" "}
            <a
                href="https://ente.io/locker"
                target="_blank"
                rel="noopener"
                style={footerLinkStyle}
            >
                Documents
            </a>{" "}
            {"\u2022"}{" "}
            <a
                href="https://ente.io/auth"
                target="_blank"
                rel="noopener"
                style={footerLinkStyle}
            >
                Auth Codes
            </a>
        </Typography>
    </Stack>
);
