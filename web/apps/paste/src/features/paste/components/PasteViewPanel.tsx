import {
    Button,
    CircularProgress,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { pasteTextFieldSx } from "./textFieldSx";

interface PasteViewPanelProps {
    consuming: boolean;
    consumeError: string | null;
    resolvedText: string | null;
    onCopyText: (value: string) => Promise<void>;
}

export const PasteViewPanel = ({
    consuming,
    consumeError,
    resolvedText,
    onCopyText,
}: PasteViewPanelProps) => (
    <>
        {consuming && (
            <Stack direction="row" spacing={1.5} alignItems="center">
                <CircularProgress size={18} sx={{ color: "accent.main" }} />
                <Typography>Opening secure paste...</Typography>
            </Stack>
        )}

        {consumeError && (
            <Stack spacing={1.5} alignItems="flex-start">
                <Typography color="error">{consumeError}</Typography>
                <Button
                    variant="outlined"
                    component="a"
                    href="/"
                    sx={{
                        mt: 0.75,
                        textTransform: "none",
                        borderRadius: "12px",
                    }}
                >
                    Create new paste
                </Button>
            </Stack>
        )}

        {resolvedText && (
            <Stack spacing={2}>
                <Typography sx={{ fontWeight: 600 }}>Paste contents</Typography>
                <TextField
                    variant="filled"
                    hiddenLabel
                    multiline
                    minRows={10}
                    value={resolvedText}
                    slotProps={{
                        input: {
                            readOnly: true,
                            disableUnderline: true,
                        },
                    }}
                    sx={pasteTextFieldSx()}
                />
                <Typography variant="mini" color="text.muted">
                    This paste has now been removed from Ente servers.
                </Typography>
                <Button
                    variant="outlined"
                    onClick={() => {
                        void onCopyText(resolvedText);
                    }}
                    sx={{
                        alignSelf: "flex-start",
                        textTransform: "none",
                        borderRadius: "12px",
                    }}
                >
                    Copy text
                </Button>
            </Stack>
        )}
    </>
);
