# Air Flow 3 — Multimodal delivery

## Included in this branch

- Audio transcription and English translation through Cloudflare Workers AI Whisper Large V3 Turbo.
- Spanish text-to-speech through Cloudflare Workers AI Deepgram Aura-2, returned as MP3.
- Short-clip video understanding through the existing Gemini API key, with an 8 MB direct-upload cap.
- CSV descriptive statistics and optional LLM interpretation of aggregates (raw rows are not sent to the LLM).
- Per-account persistent Agent task records that save the proposed plan, require explicit confirmation before execution and allow cancellation while still planned.
- Private file deletion that removes both the stored object and its per-account index entry.
- Live microphone teardown when the Air Flow drawer is closed.

## Configuration

Both Wrangler configurations declare the Workers AI binding for local and production use, and the production config also declares `previews.ai`. Cloudflare Previews do not inherit production bindings, so this explicitly enables the AI API binding for branch previews:

```json
{
  "ai": {
    "binding": "AI"
  }
}
```

No additional external API key is needed for Whisper or Aura-2. Workers AI model usage is billed by Cloudflare and local Wrangler development also invokes the account's Workers AI service. The video analyzer uses the existing `GEMINI_API_KEY`; no new Gemini key is required.

The Worker returns a clear 503 response if the `AI` binding is unavailable, so the existing chat and other tools remain usable while the binding is being activated. This branch does not update Cloudflare production settings or deploy a Worker.

## Limits in this first slice

- Audio: 8 MB, transcription or English translation.
- Text-to-speech: Spanish voice, up to 1,800 characters per request.
- Video: 8 MB inline upload; longer videos require a separate asynchronous File API workflow.
- CSV: 2 MB and 10,000 data rows; statistical trends are descriptive and not guaranteed forecasts.
- Agent tasks: persisted in KV; execution is currently request-scoped, not a durable background workflow. Pending tasks can be cancelled; a task already running cannot be interrupted by this endpoint.
- Agent external actions: still blocked pending a separate permissioned integration and operation-specific confirmation.

## Next slices

- Add resumable uploads and asynchronous video processing for larger files.
- Add semantic file retrieval with a dedicated embedding model and Vectorize index after provisioning and isolation design.
- Add durable multi-step Agent execution using Cloudflare Workflows or Agents SDK, with actual cancellation and progress streaming.
- Add optional video generation and music generation only after selecting a provider, reviewing pricing/licensing, and obtaining a user-approved API credential where required.
- Expand integration tests to exercise live provider calls in an isolated Cloudflare Preview, not production data.


## Preview isolation note

Cloudflare Workers Previews use their own bindings and do not inherit production configuration. This branch explicitly includes the `AI` API binding under `previews`. The repository does not currently provision a separate staging KV namespace for `STATS`; therefore authenticated multimodal end-to-end tests must wait until an isolated Preview KV resource is configured. Do not point Preview `STATS` at the production namespace for testing.
