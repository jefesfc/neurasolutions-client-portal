# Telegram Voice Reply — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user sends a voice message to the Telegram bot, the bot responds with a voice message (OpenAI TTS `tts-1`, voice `alloy`). When the user sends text, the bot responds with text. Exact same behavior as today for all other flows.

**Architecture:** Single file change in `backend/src/routes/telegram.ts`. Add a `sendVoiceTelegram` multipart helper, capture `isVoiceInput` once at the top of the webhook handler, and replace the final `sendMessage` call with a voice/text dispatch block that includes TTS cost tracking. If TTS throws, fall back to text so the bot never goes silent.

**Tech Stack:** Node.js + TypeScript, OpenAI SDK (`openai.audio.speech.create`), Telegram Bot API (`sendVoice` method, multipart/form-data).

---

## File Map

| File | Change |
|------|--------|
| `backend/src/routes/telegram.ts` | Add `sendVoiceTelegram`, `isVoiceInput` bool, replace final `sendMessage` with TTS dispatch + cost tracking |

---

## Task 1: Add `sendVoiceTelegram` helper and `isVoiceInput` variable

**File:** `backend/src/routes/telegram.ts`

### Background

`callTelegram` (line 37) sends JSON. Telegram's `sendVoice` method requires `multipart/form-data` with the binary audio file — a separate helper is needed.

`isVoiceInput` must be captured right after the early return on line 171 (after `if (!message?.text && !message?.voice) return;`), before any branching logic, so it's available at the response step.

- [ ] **Step 1: Add `sendVoiceTelegram` after `callTelegram` (after line 48)**

Insert this function immediately after the closing `}` of `callTelegram`:

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

- [ ] **Step 2: Add `isVoiceInput` variable in the webhook handler**

In the `POST /telegram/webhook/:tenantId` handler, the early return is:
```typescript
if (!message?.text && !message?.voice) return;
```

Add `isVoiceInput` on the very next line after it:
```typescript
const isVoiceInput = !!message.voice;
```

- [ ] **Step 3: Build check**

```bash
cd c:\Users\ldmru\OneDrive\Desktop\Neura\AIOS\backend
npx tsc --noEmit
```

Expected: no errors. Fix any TypeScript issues before continuing.

---

## Task 2: Replace final `sendMessage` with TTS dispatch + cost tracking

**File:** `backend/src/routes/telegram.ts`

### Background

The current last line of the webhook handler (line 332) is:
```typescript
await callTelegram(botToken, 'sendMessage', { chat_id: chatId, text: assistantReply });
```

Replace it with the voice/text dispatch block. TTS cost tracking is inserted inside the `try` block after the audio is generated and before `sendVoiceTelegram` is called (so we only track cost when TTS actually succeeds).

The GPT-4o cost tracking block (lines 325–330) must remain above this new block — do not touch it.

- [ ] **Step 1: Replace the final `sendMessage` call**

Find and replace this exact line (line 332):
```typescript
await callTelegram(botToken, 'sendMessage', { chat_id: chatId, text: assistantReply });
```

Replace with:
```typescript
if (isVoiceInput) {
  try {
    const tts = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: assistantReply,
    });
    const audioBuffer = Buffer.from(await tts.arrayBuffer());

    // Track TTS cost (character-based: $0.015 / 1K chars)
    const ttsCost = (assistantReply.length / 1000) * 0.015;
    await db.query(
      `INSERT INTO aios.token_usage (id, tenant_id, agent_name, tokens_in, tokens_out, model, cost)
       VALUES ($1,$2,'aios-telegram-tts',$3,0,'tts-1',$4)`,
      [uuidv4(), tenantId, assistantReply.length, ttsCost]
    );

    await sendVoiceTelegram(botToken, chatId, audioBuffer);
  } catch (err) {
    console.error('[telegram/tts]', err);
    // Fallback: send text so the bot never goes silent
    await callTelegram(botToken, 'sendMessage', { chat_id: chatId, text: assistantReply });
  }
} else {
  await callTelegram(botToken, 'sendMessage', { chat_id: chatId, text: assistantReply });
}
```

- [ ] **Step 2: Build and verify**

```bash
cd c:\Users\ldmru\OneDrive\Desktop\Neura\AIOS\backend
npx tsc --noEmit
```

Expected: no errors.

Also run frontend build to confirm no cross-contamination:
```bash
cd c:\Users\ldmru\OneDrive\Desktop\Neura\AIOS
npm run build
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
cd c:\Users\ldmru\OneDrive\Desktop\Neura\AIOS
git add backend/src/routes/telegram.ts
git commit -m "feat: Telegram bot replies with voice when user sends voice (TTS tts-1 alloy)"
```

---

## Post-implementation: Deploy

- [ ] **Redeploy backend in EasyPanel** — the `tts-1` TTS call and `sendVoiceTelegram` are backend-only. Frontend does not need a redeploy.

---

## Self-Review

**Spec coverage:**
- ✅ Voice input → voice response (TTS `tts-1`, voice `alloy`)
- ✅ Text input → text response (unchanged path)
- ✅ Fallback to text if TTS fails
- ✅ TTS cost tracked in `aios.token_usage` with `model: 'tts-1'`
- ✅ Single file change only

**Type consistency:**
- `sendVoiceTelegram(botToken: string, chatId: number, buf: Buffer)` — used consistently in Task 2
- `isVoiceInput: boolean` — set in Task 1 Step 2, consumed in Task 2 Step 1
- `uuidv4()` — already imported at top of file
- `tenantId`, `db`, `openai`, `chatId`, `assistantReply` — all already in scope in the webhook handler

**Placeholder scan:** None found.
