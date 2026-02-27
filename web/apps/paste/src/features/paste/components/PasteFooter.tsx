import { Box, Stack, Typography } from "@mui/material";
import { EnteLogo } from "ente-base/components/EnteLogo";

const footerLinkStyle = {
    color: "inherit",
    textDecoration: "none",
};

export const PasteFooter = () => (
    <Stack spacing={1.1} alignItems="center">
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
                    color: "#2f6df7",
                    "& svg": { color: "#2f6df7" },
                    "& svg path": { fill: "#2f6df7" },
                }}
            >
                <EnteLogo height={28} />
            </Box>
        </a>

        <Typography
            variant="mini"
            sx={{
                color: "rgba(230, 236, 255, 0.56)",
                fontWeight: 600,
            }}
        >
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
