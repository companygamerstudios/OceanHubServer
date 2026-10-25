# Air Flow: AI data handling

This document describes data flows implemented in the Worker. Provider behavior and retention may change; check the providers' current terms before production launch.

- **Chat, modes, research and planning:** user prompts and selected conversation history/context are passed to the active text provider through the Air Flow routing code. Depending on credentials and provider availability, this can be Google Gemini or OpenRouter.
- **Vision and file analysis:** the submitted prompt and file/image content are sent to Google Gemini. Text/CSV/JSON files may be extracted into text, used for a response, and retained in the user's Air Flow file index in Cloudflare KV for up to the configured retention period.
- **Image creation:** the prompt is sent to the configured image provider. When `AF_IMAGE_PROVIDER=stablehorde`, the prompt is sent to Stable Horde. When the OpenRouter image path is configured, it is sent to OpenRouter.
- **Storage:** chat history, user-approved memory, uploaded text/file metadata and image job metadata may be stored in the Cloudflare KV binding according to per-feature TTLs. Cloudflare also processes requests as the Worker host.
- **Credentials:** API keys are intended to be read only from Worker environment Secrets. They must never be included in prompts or logs.

Users should not enter passwords, redeemable license keys, payment details, TOTP seeds, API keys or confidential personal information into AI prompts or uploads. AI providers may apply their own processing and retention policies. This document is technical documentation, not a substitute for the user-facing privacy notice or legal review.
