export const pasteTextFieldSx = (
    radius = "16px",
    bgColor = "#24262c",
    borderColor = "rgba(255, 255, 255, 0.12)",
) => ({
    margin: 0,
    "& .MuiFilledInput-root": {
        borderRadius: radius,
        bgcolor: bgColor,
        border: "1px solid",
        borderColor,
        alignItems: "flex-start",
        boxSizing: "border-box",
        color: "#f4f7ff",
        padding: "14px",
        transition: "border-color 180ms ease, box-shadow 180ms ease",
        "&:before": { display: "none" },
        "&:after": { display: "none" },
        "&:hover:not(.Mui-disabled, .Mui-error):before": { display: "none" },
        "&:hover": { bgcolor: bgColor },
        "&.Mui-focused": {
            bgcolor: bgColor,
            borderColor: "#2f6df7",
            boxShadow: "0 0 0 2px rgba(47, 109, 247, 0.24)",
        },
    },
    "& .MuiInputBase-input": {
        padding: "0 !important",
        color: "#f4f7ff",
        fontSize: "1.02rem",
        lineHeight: 1.55,
    },
    "& .MuiInputBase-inputMultiline": {
        padding: "0 !important",
        margin: "0 !important",
    },
    "& .MuiFilledInput-inputMultiline": {
        padding: "0 !important",
        margin: "0 !important",
    },
    "& textarea": {
        padding: "0 !important",
        margin: "0 !important",
        overflowY: "auto",
    },
    "& textarea::placeholder": {
        color: "rgba(230, 236, 255, 0.42)",
        opacity: 1,
    },
});
