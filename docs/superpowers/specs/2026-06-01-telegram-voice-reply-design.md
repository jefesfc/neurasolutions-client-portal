# Telegram Voice Reply — Design Spec
**Date:** 2026-06-01  
**Status:** Approved

## Goal

When a user sends a **voice message** to the Telegram bot, the bot responds with a **voice message** (audio). When the user sends **text**, the bot responds with **text**. Symmetric input/output behavior.

---

## Scope

Single file change: `backend/src/routes/telegram.ts`

No new files, no DB changes, no frontend changes.

---

## Flow

```
voice input → Whisper-1 (transcribe) → GPT-4o (reply text) → TTS tts-1 (alloy) → sendVoice (mp3)
text input  →                        → GPT-4o (reply text) →                    → sendMessage (text)
```

`isVoiceInput = !!message.voice` is set once at the start of the webhook handler and used at the end to choose the response method.

---

## New Function: `sendVoiceTelegram`

`callTelegram` sends JSON. Telegram's `sendVoice` requires multipart/form-data with a binary audio file. A dedicated helper handles this:

```typescript
async function sendVoiceTelegram(
  botToken: string,
  chatId: number,
  buf: Buffer
): Promise<void> {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('voice', new Blob([buf], { type: 'audio/mpeg' }), 'reply.mp3');
  await fetch(`https://api.telegram.org/bot${botToken}/sendVoice`, {
    method: 'POST',
    body: form,
  });
}
```

---

## TTS Call

```typescript
const tts = await openai.audio.speech.create({
  model: 'tts-1',
  voice: 'alloy',
  input: assistantReply,
});
const audioBuffer = Buffer.from(await tts.arrayBuffer());
await sendVoiceTelegram(botToken, chatId, audioBuffer);
```

Model: `tts-1` (standard quality, $0.015/1K chars, low latency)  
Voice: `alloy` (neutral, professional)  
Format: default (mp3)

---

## Response Dispatch (replaces final `sendMessage`)

```typescript
if (isVoiceInput) {
  try {
    const tts = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: assistantReply,
    });
    await sendVoiceTelegram(botToken, chatId, Buffer.from(await tts.arrayBuffer()));
  } catch (err) {
    console.error('[telegram/tts]', err);
    // Fallback: send text so the bot never goes silent
    await callTelegram(botToken, 'sendMessage', { chat_id: chatId, text: assistantReply });
  }
} else {
  await callTelegram(botToken, 'sendMessage', { chat_id: chatId, text: assistantReply });
}
```

**Fallback rule:** If TTS throws (API error, timeout, etc.), the bot sends the text reply instead. User always gets an answer.

---

## Cost Tracking

TTS is character-based. Logged to `aios.token_usage` for consistency:

| Column | Value |
|--------|-------|
| `agent_name` | `'aios-telegram-tts'` |
| `tokens_in` | `assistantReply.length` (char count) |
| `tokens_out` | `0` |
| `model` | `'tts-1'` |
| `cost` | `(assistantReply.length / 1000) * 0.015` |

Tracked only when TTS succeeds (inside the try block, before `sendVoiceTelegram`).

---

## What Does NOT Change

- Whisper transcription flow — unchanged
- GPT-4o agentic loop — unchanged
- Conversation persistence (`aios.interactions`) — unchanged
- GPT-4o cost tracking — unchanged
- `/start` linking flow — unchanged
- Text-input path — unchanged

---

## File Map

| File | Change |
|------|--------|
| `backend/src/routes/telegram.ts` | Add `isVoiceInput` bool, add `sendVoiceTelegram` helper, replace final `sendMessage` with voice/text dispatch + TTS cost tracking |
