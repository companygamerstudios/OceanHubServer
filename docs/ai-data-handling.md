# Air Flow: AI data handling

This document describes data flows implemented in the Worker. Provider behavior and retention may change; check the providers' current terms before production launch.

- **Chat, modes, research and planning:** user prompts and selected conversation history/context are passed to the active text provider through the Air Flow routing code. Depending on credentials and provider availability, this can be Google Gemini or OpenRouter.
- **Vision and file analysis:** the submitted prompt and file/image content are sent to Google Gemini. Text/CSV/JSON files may be extracted into text, used for a response, and retained in the user's Air Flow file index in Cloudflare KV for up to the configured retention period.
- **Image creation:** the prompt is sent to the configured image provider. When `AF_IMAGE_PROVIDER=stablehorde`, the prompt is sent to Stable Horde. When the OpenRouter image path is configured, it is sent to OpenRouter.
- **Storage:** chat history, user-approved memory, uploaded text/file metadata and image job metadata may be stored in the Cloudflare KV binding according to per-feature TTLs. Cloudflare also processes requests as the Worker host.
- **Credentials:** API keys are intended to be read only from Worker environment Secrets. They must never be included in prompts or logs.

Users should not enter passwords, redeemable license keys, payment details, TOTP seeds, API keys or confidential personal information into AI prompts or uploads. AI providers may apply their own processing and retention policies. This document is technical documentation, not a substitute for the user-facing privacy notice or legal review.


## Air Flow 3 multimodal additions

- **Audio transcription:** uploaded audio is sent to Cloudflare Workers AI Whisper for transcription or translation. The audio payload is processed for the request and is not added to the Air Flow file library by this handler.
- **Speech generation:** text is sent to Cloudflare Workers AI Deepgram Aura-2 (Spanish) and the generated MP3 is returned to the browser. The text is not stored by this handler.
- **Video understanding:** the uploaded video clip and question are sent to Google Gemini using the existing `GEMINI_API_KEY`. Direct uploads are limited to 8 MB in this first implementation; videos are not stored by this handler.
- **CSV analysis:** the Worker calculates descriptive statistics locally and sends only the resulting aggregate summary to the configured text provider for interpretation. Raw CSV rows are not forwarded to the language model by this handler.
- **Agent tasks:** task goals and compact results are stored under a per-account key in the existing KV namespace. A task must be explicitly confirmed before execution; sensitive external actions remain blocked by the existing Agent implementation.
- **Private-file deletion:** the delete route removes both the per-account file object and its index entry.

Workers AI requires the `AI` binding and incurs model usage charges according to Cloudflare's current pricing. The code does not create or reveal API keys. The existing Gemini key is used for video understanding. Verify current provider retention and pricing before enabling these features for all users.
