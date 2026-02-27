import { Box, Button, TextField, Typography } from "@mui/material";
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
}: PasteCreatePanelProps) => (
    <>
        <TextField
            variant="filled"
            hiddenLabel
            slotProps={{
                input: { disableUnderline: true },
                htmlInput: { maxLength: MAX_PASTE_CHARS },
            }}
            multiline
            minRows={10}
            placeholder="Paste text (keys, snippets, notes, instructions...)"
            value={inputText}
            onChange={(event) => {
                onInputChange(event.target.value);
            }}
            sx={pasteTextFieldSx()}
        />
        <Box
            sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}
        >
            <Typography variant="mini" color="text.muted">
                {inputText.length}/{MAX_PASTE_CHARS}
            </Typography>
            <Button
                variant="contained"
                onClick={() => {
                    void onCreate();
                }}
                disabled={creating}
                sx={{
                    textTransform: "none",
                    borderRadius: "14px",
                    bgcolor: "accent.main",
                    color: "accent.contrastText",
                    "&:hover": {
                        bgcolor: "accent.dark",
                    },
                }}
            >
                {creating ? "Creating..." : "Create secure link"}
            </Button>
        </Box>

        {createError && <Typography color="error">{createError}</Typography>}

        {createdLink && (
            <PasteLinkCard
                link={createdLink}
                onCopy={onCopyLink}
                onShare={onShareLink}
            />
        )}
    </>
);
