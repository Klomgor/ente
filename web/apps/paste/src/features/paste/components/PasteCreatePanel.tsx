import { Navigation06Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Box, IconButton, TextField, Typography } from "@mui/material";
import { MAX_PASTE_CHARS } from "../constants";
import { PasteLinkCard } from "./PasteLinkCard";
import { pasteTextFieldSx } from "./textFieldSx";

interface PasteCreatePanelProps {
    inputText: string;
    creating: boolean;
    createError: string | null;
    createdLink: string | null;
    onInputChange: (value: string) => void;
    onCreate: () => Promise<void>;
    onCopyLink: (value: string) => Promise<void>;
    onShareLink: (url: string) => Promise<void>;
}

export const PasteCreatePanel = ({
    inputText,
    creating,
    createError,
    createdLink,
    onInputChange,
    onCreate,
    onCopyLink,
    onShareLink,
}: PasteCreatePanelProps) => {
    const isInputEmpty = inputText.trim().length === 0;
    const frameBlue = "#2f6df7";
    const inputGlassBg = "rgba(39, 42, 52, 0.76)";
    const inputGlassBorder = "rgba(213, 225, 255, 0.14)";
    const nearLimitThreshold = Math.floor(MAX_PASTE_CHARS * 0.9);
    const isNearCharLimit = inputText.length >= nearLimitThreshold;
    const mutedCounterColor = "rgba(234, 238, 255, 0.6)";
    const softBlueCounterColor = "rgba(204, 224, 255, 0.96)";

    return (
        <>
        <Box
            sx={{
                position: "relative",
                width: "100%",
            }}
        >
            <TextField
                variant="filled"
                hiddenLabel
                fullWidth
                slotProps={{
                    input: { disableUnderline: true },
                    htmlInput: { maxLength: MAX_PASTE_CHARS },
                }}
                multiline
                minRows={5}
                maxRows={12}
                placeholder="Paste text (keys, snippets, notes, instructions...)"
                value={inputText}
                onChange={(event) => {
                    onInputChange(event.target.value);
                }}
                sx={[
                    pasteTextFieldSx(
                        "20px",
                        inputGlassBg,
                        inputGlassBorder,
                    ),
                    {
                        "& .MuiFilledInput-root": {
                            paddingBottom: "84px",
                            backdropFilter: "blur(9px) saturate(112%)",
                            WebkitBackdropFilter: "blur(9px) saturate(112%)",
                            background:
                                "linear-gradient(160deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 58%, rgba(255, 255, 255, 0.015) 100%)",
                            boxShadow:
                                "0 12px 28px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                            "&:hover": {
                                bgcolor: inputGlassBg,
                                borderColor: inputGlassBorder,
                                background:
                                    "linear-gradient(160deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 58%, rgba(255, 255, 255, 0.015) 100%)",
                                boxShadow:
                                    "0 12px 28px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                            },
                            "&.Mui-focused": {
                                bgcolor: inputGlassBg,
                                borderColor: inputGlassBorder,
                                background:
                                    "linear-gradient(160deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 58%, rgba(255, 255, 255, 0.015) 100%)",
                                boxShadow:
                                    "0 12px 28px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                            },
                        },
                        "& .MuiInputBase-input": {
                            fontSize: "1.05rem",
                            lineHeight: 1.6,
                        },
                    },
                ]}
            />
            <Box
                sx={{
                    position: "absolute",
                    left: 18,
                    right: 18,
                    bottom: 18,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    pointerEvents: "none",
                }}
            >
                <Typography
                    variant="mini"
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        height: 44,
                        color: mutedCounterColor,
                        fontWeight: 600,
                        lineHeight: 1,
                        letterSpacing: "0.01em",
                    }}
                >
                    <Box
                        component="span"
                        sx={{
                            color: isNearCharLimit
                                ? softBlueCounterColor
                                : mutedCounterColor,
                        }}
                    >
                        {inputText.length}
                    </Box>
                    <Box component="span" sx={{ color: mutedCounterColor }}>
                        /{MAX_PASTE_CHARS}
                    </Box>
                </Typography>
                <IconButton
                    aria-label="Create secure link"
                    onClick={() => {
                        void onCreate();
                    }}
                    disabled={creating || isInputEmpty}
                    sx={{
                        pointerEvents: "auto",
                        width: 44,
                        height: 44,
                        borderRadius: "14px",
                        bgcolor: frameBlue,
                        color: "#f4f7ff",
                        boxShadow: "none",
                        "&:hover": {
                            bgcolor: frameBlue,
                            boxShadow: "none",
                        },
                        "&.Mui-disabled": {
                            bgcolor: isInputEmpty
                                ? "rgba(255, 255, 255, 0.18)"
                                : "rgba(47, 109, 247, 0.45)",
                            color: isInputEmpty
                                ? "rgba(230, 236, 255, 0.44)"
                                : "rgba(244, 247, 255, 0.72)",
                        },
                    }}
                >
                    <Box
                        sx={{
                            transform: "rotate(90deg)",
                            display: "flex",
                        }}
                    >
                        <HugeiconsIcon
                            icon={Navigation06Icon}
                            size={20}
                            strokeWidth={2}
                        />
                    </Box>
                </IconButton>
            </Box>
        </Box>
        <Box
            sx={{
                mt: { xs: "84px", md: "116px" },
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
            }}
        >
            <Typography
                sx={{
                    color: "rgba(220, 229, 255, 0.62)",
                    fontSize: "0.86rem",
                    fontWeight: 500,
                    lineHeight: 1.4,
                    maxWidth: 520,
                    mb: "3rem",
                }}
            >
                Your paste is{" "}
                <Box
                    component="span"
                    sx={{ fontWeight: 700, color: "rgba(232, 240, 255, 0.9)" }}
                >
                    private
                </Box>
                .{" "}
                <Box
                    component="span"
                    sx={{ fontWeight: 700, color: "rgba(232, 240, 255, 0.9)" }}
                >
                    End-to-end encrypted
                </Box>
                ,{" "}
                <Box component="span" sx={{ color: frameBlue, fontWeight: 600 }}>
                    one-time view
                </Box>
                ,{" "}
                <Box component="span" sx={{ color: frameBlue, fontWeight: 600 }}>
                    purged after view
                </Box>{" "}
                and{" "}
                <Box component="span" sx={{ color: frameBlue, fontWeight: 600 }}>
                    auto-deleted in 24 hours
                </Box>
                .
            </Typography>
        </Box>

        {createError && <Typography color="error">{createError}</Typography>}

        {createdLink && (
            <Box sx={{ mt: { xs: 4.4, sm: 5.2 } }}>
                <PasteLinkCard
                    link={createdLink}
                    onCopy={onCopyLink}
                    onShare={onShareLink}
                />
            </Box>
        )}
        </>
    );
};
