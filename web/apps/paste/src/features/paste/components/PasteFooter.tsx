import { Box, Stack, Typography } from "@mui/material";

export const PasteFooter = () => (
    <Stack spacing={1.3} alignItems="center">
        <a
            href="https://ente.io?utm_source=paste"
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
                component="img"
                src="/images/big3.png"
                alt="Other Ente apps"
                sx={{
                    display: "block",
                    width: { xs: 132, sm: 148 },
                    maxWidth: "38vw",
                    height: "auto",
                }}
            />
        </a>

        <Typography
            variant="mini"
            sx={{
                color: "rgba(230, 236, 255, 0.56)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontSize: { xs: "0.58rem", sm: "0.62rem" },
                textAlign: "center",
            }}
        >
            THE ENTE E2EE ECOSYSTEM
        </Typography>
    </Stack>
);
