import { Stack } from "@mui/material";
import Head from "next/head";
import { PasteCreatePanel } from "features/paste/components/PasteCreatePanel";
import { PasteFooter } from "features/paste/components/PasteFooter";
import { PasteFrame } from "features/paste/components/PasteFrame";
import { PasteHero } from "features/paste/components/PasteHero";
import { PasteViewPanel } from "features/paste/components/PasteViewPanel";
import { useConsumePaste } from "features/paste/hooks/useConsumePaste";
import { useCreatePaste } from "features/paste/hooks/useCreatePaste";
import { usePasteRoute } from "features/paste/hooks/usePasteRoute";
import {
    copyTextToClipboard,
    shareUrlOrCopy,
} from "features/paste/utils/browser";

const Page = () => {
    const { mode, accessToken } = usePasteRoute();

    const {
        inputText,
        setInputText,
        creating,
        createError,
        createdLink,
        createSecureLink,
    } = useCreatePaste();

    const { consuming, consumeError, resolvedText } = useConsumePaste(
        mode,
        accessToken,
    );

    return (
        <>
            <Head>
                <meta
                    name="description"
                    content="Share sensitive text with one-time, end-to-end encrypted links that auto-expire after 24 hours."
                />
            </Head>

            <PasteFrame footer={<PasteFooter />}>
                <Stack spacing={2.5}>
                    <PasteHero />

                    {mode === "create" && (
                        <PasteCreatePanel
                            inputText={inputText}
                            creating={creating}
                            createError={createError}
                            createdLink={createdLink}
                            onInputChange={setInputText}
                            onCreate={createSecureLink}
                            onCopyLink={copyTextToClipboard}
                            onShareLink={shareUrlOrCopy}
                        />
                    )}

                    {mode === "view" && (
                        <PasteViewPanel
                            consuming={consuming}
                            consumeError={consumeError}
                            resolvedText={resolvedText}
                            onCopyText={copyTextToClipboard}
                        />
                    )}
                </Stack>
            </PasteFrame>
        </>
    );
};

export default Page;
