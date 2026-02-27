import { Chip, Stack, Typography } from "@mui/material";

export const PasteHero = () => (
    <>
        <Typography variant="h3" sx={{ fontWeight: 700, color: "text.base" }}>
            Ente Paste
        </Typography>
        <Typography color="text.muted">
            End-to-end encrypted paste sharing for quick, sensitive text. We
            cannot read your content.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip variant="outlined" label="24 hour retention max" />
            <Chip variant="outlined" label="One-time view" />
            <Chip variant="outlined" label="Purged after open" />
            <Chip
                variant="filled"
                label="Open source"
                component="a"
                href="https://github.com/ente-io/ente"
                target="_blank"
                rel="noopener"
                clickable
                sx={{
                    textDecoration: "none",
                    bgcolor: "accent.main",
                    color: "fixed.white",
                    border: "1px solid",
                    borderColor: "accent.main",
                    "&:hover": {
                        bgcolor: "accent.dark",
                        borderColor: "accent.dark",
                    },
                }}
            />
        </Stack>
    </>
);
