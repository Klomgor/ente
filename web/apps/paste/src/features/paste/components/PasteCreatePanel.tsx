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
    const privacyPills = [
        "Private",
        "End To End Encrypted",
        "One-Time View",
        "Deletes In 24 Hrs",
    ];

    return (
        <>
            <Box
                sx={{
                    position: "relative",
                    width: "100%",
                    maxWidth: "100%",
                    minWidth: 0,
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
                                paddingBottom: { xs: "76px", sm: "84px" },
                                padding: { xs: "12px", sm: "14px" },
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
                                fontSize: { xs: "0.98rem", sm: "1.05rem" },
                                lineHeight: 1.6,
                            },
                        },
                    ]}
                />
                <Box
                    sx={{
                        position: "absolute",
                        left: { xs: 12, sm: 18 },
                        right: { xs: 12, sm: 18 },
                        bottom: { xs: 12, sm: 18 },
                        height: { xs: 44, sm: 48 },
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                        gap: { xs: 1, sm: 2 },
                        pointerEvents: "none",
                    }}
                >
                    <Typography
                        variant="mini"
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            height: { xs: 40, sm: 44 },
                            transform: {
                                xs: "translateY(8px)",
                                md: "translateY(12px)",
                            },
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
                            width: { xs: 40, sm: 44 },
                            height: { xs: 40, sm: 44 },
                            borderRadius: { xs: "12px", sm: "14px" },
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
                                size={18}
                                strokeWidth={2}
                            />
                        </Box>
                    </IconButton>
                </Box>
            </Box>
            <Box
                sx={{
                    mt: { xs: "72px", sm: "84px", md: "116px" },
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    width: "100%",
                    maxWidth: "100%",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        gap: { xs: 0.7, sm: 1 },
                        width: "100%",
                        maxWidth: { xs: "100%", sm: 520, md: "none" },
                        mb: { xs: "2rem", sm: "3rem" },
                        pointerEvents: "none",
                        userSelect: "none",
                    }}
                >
                    {privacyPills.map((label) => (
                        <Box
                            key={label}
                            component="span"
                            aria-disabled="true"
                            sx={{
                                px: { xs: 1.2, sm: 1.4 },
                                py: { xs: 0.45, sm: 0.6 },
                                borderRadius: "999px",
                                border: "1px solid rgba(147, 155, 177, 0.24)",
                                bgcolor: "rgba(255, 255, 255, 0.045)",
                                color: "rgba(220, 229, 255, 0.55)",
                                fontSize: { xs: "0.74rem", sm: "0.79rem" },
                                fontWeight: 600,
                                letterSpacing: "0.01em",
                                lineHeight: 1.2,
                                whiteSpace: "nowrap",
                                boxShadow:
                                    "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                                opacity: 0.78,
                            }}
                        >
                            {label}
                        </Box>
                    ))}
                </Box>
            </Box>

            {createError && <Typography color="error">{createError}</Typography>}

            {createdLink && (
                <Box sx={{ mt: { xs: 4.4, sm: 5.2 }, width: "100%", minWidth: 0 }}>
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
