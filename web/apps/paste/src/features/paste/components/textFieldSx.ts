export const pasteTextFieldSx = (
    radius = "16px",
    bgColor = "background.paper2",
    borderColor = "stroke.faint",
) => ({
    margin: 0,
    "& .MuiFilledInput-root": {
        borderRadius: radius,
        bgcolor: bgColor,
        border: "1px solid",
        borderColor,
        alignItems: "flex-start",
        boxSizing: "border-box",
        padding: "10px 12px",
        "&:before": { display: "none" },
        "&:after": { display: "none" },
        "&:hover:not(.Mui-disabled, .Mui-error):before": { display: "none" },
        "&:hover": { bgcolor: bgColor },
        "&.Mui-focused": { bgcolor: bgColor, borderColor: "accent.main" },
    },
    "& .MuiInputBase-input": { padding: "0 !important" },
    "& .MuiInputBase-inputMultiline": {
        padding: "0 !important",
        margin: "0 !important",
    },
    "& .MuiFilledInput-inputMultiline": {
        padding: "0 !important",
        margin: "0 !important",
    },
    "& textarea": { padding: "0 !important", margin: "0 !important" },
});
