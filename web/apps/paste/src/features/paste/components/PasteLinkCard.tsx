import { Button, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { pasteTextFieldSx } from "./textFieldSx";

interface PasteLinkCardProps {
    link: string;
    onCopy: (value: string) => Promise<void>;
    onShare: (url: string) => Promise<void>;
}

export const PasteLinkCard = ({ link, onCopy, onShare }: PasteLinkCardProps) => {
    const linkCardRef = useRef<HTMLDivElement | null>(null);

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

    return (
        <Stack
            ref={linkCardRef}
            spacing={2}
            sx={{
                p: 2.5,
                borderRadius: "20px",
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "stroke.muted",
                scrollMarginTop: {
                    xs: "16px",
                    md: "24px",
                },
            }}
        >
            <Typography sx={{ fontWeight: 600 }}>Your one-time link</Typography>
            <TextField
                variant="filled"
                hiddenLabel
                value={link}
                multiline
                minRows={2}
                slotProps={{
                    input: {
                        readOnly: true,
                        disableUnderline: true,
                    },
                }}
                sx={pasteTextFieldSx("12px", "background.default", "stroke.muted")}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                    variant="outlined"
                    onClick={() => {
                        void onCopy(link);
                    }}
                    sx={{
                        textTransform: "none",
                        borderRadius: "12px",
                    }}
                >
                    Copy
                </Button>
                <Button
                    variant="outlined"
                    onClick={() => {
                        void onShare(link);
                    }}
                    sx={{
                        textTransform: "none",
                        borderRadius: "12px",
                    }}
                >
                    Share
                </Button>
            </Stack>
        </Stack>
    );
};
