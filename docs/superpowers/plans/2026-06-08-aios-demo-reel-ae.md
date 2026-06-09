# AIOS Demo Reel — After Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 60-second AIOS demo reel composition in After Effects using the MCP bridge, combining intro/outro motion graphics with 16 product module clips.

**Architecture:** All work runs as ExtendScript via `mcp__after-effects__run-script`. Tasks build incrementally: create comp → import assets → build intro → add all 16 clip segments with title cards → build outro. Each task is a self-contained script that finds the existing comp by name. Cross-dissolves are implemented as 0.1s opacity fade-in/fade-out on each layer, giving a 0.2s visual transition at every cut.

**Tech Stack:** After Effects 2025 via MCP bridge (after-effects-mcp), ExtendScript (JSX), MCP tools: `mcp__after-effects__run-script`, `mcp__after-effects__get-results`

**Assets path:** `C:\Users\ldmru\OneDrive\Desktop\Neura\AIOS\reel v1\`

**Expected final layer count:** 90 (5 intro + 64 title-card + 16 clips + 5 outro)

---

### Task 1: Verify connection and create composition

**Files:**
- AE Project: creates `AIOS_Demo_Reel_v1` composition

- [ ] **Step 1: Confirm After Effects is running with MCP bridge**

  In After Effects: **Window → mcp-bridge-auto.jsx** → verify "Auto-run" is checked and status shows "Listening".

- [ ] **Step 2: Test MCP connection**

  Call `mcp__after-effects__run-script` with:
  ```javascript
  "AE version: " + app.version + " | Items: " + app.project.numItems;
  ```
  Call `mcp__after-effects__get-results`. Expected: string starting with `"AE version:"`. If blank or error, re-open the bridge panel.

- [ ] **Step 3: Create main composition**

  Call `mcp__after-effects__run-script` with:
  ```javascript
  var comp = app.project.items.addComp(
    "AIOS_Demo_Reel_v1",
    1920, 1080,
    1.0,
    60.0,
    30
  );
  comp.bgColor = [13/255, 20/255, 36/255];
  "OK: " + comp.name + " " + comp.width + "x" + comp.height + " " + comp.frameRate + "fps " + comp.duration + "s";
  ```
  Call `mcp__after-effects__get-results`. Expected: `OK: AIOS_Demo_Reel_v1 1920x1080 30fps 60s`

---

### Task 2: Import all assets

**Files:**
- AE Project: imports 16 footage items from `reel v1\`

- [ ] **Step 1: Import all 16 files**

  Call `mcp__after-effects__run-script` with:
  ```javascript
  var basePath = "C:\\Users\\ldmru\\OneDrive\\Desktop\\Neura\\AIOS\\reel v1\\";
  var files = [
    "dash.mp4", "aichat.mp4", "telegram.mp4",
    "leads.png", "clients.mp4", "calendar.png",
    "emails.mp4", "analitics.mp4", "report.mp4",
    "billing.mp4", "aisystem.mp4", "usage.mp4",
    "team.mp4", "security.png", "support.mp4", "settings.mp4"
  ];
  var results = [];
  for (var i = 0; i < files.length; i++) {
    var f = new File(basePath + files[i]);
    if (f.exists) {
      app.project.importFile(new ImportOptions(f));
      results.push("OK: " + files[i]);
    } else {
      results.push("MISSING: " + files[i]);
    }
  }
  results.join(" | ");
  ```

- [ ] **Step 2: Verify all 16 imported**

  Call `mcp__after-effects__get-results`. All 16 entries must say `OK:`. If any say `MISSING:`, check the exact filename in Explorer at `AIOS\reel v1\` and correct the name in the script, then re-run only the failed files.

---

### Task 3: Build Intro segment (0–4s)

**Files:**
- AE Composition: `AIOS_Demo_Reel_v1` — adds 5 layers at 0-4s

- [ ] **Step 1: Add intro background, text layers, and gold rule**

  Call `mcp__after-effects__run-script` with:
  ```javascript
  function getComp(name) {
    for (var i = 1; i <= app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof CompItem && item.name === name) return item;
    }
    return null;
  }

  var comp = getComp("AIOS_Demo_Reel_v1");

  // 1. Background solid (added first — pushed to bottom as others are added)
  var introBG = comp.layers.addSolid([13/255, 20/255, 36/255], "Intro_BG", 1920, 1080, 1.0);
  introBG.inPoint = 0;
  introBG.outPoint = 4.0;

  // 2. Gold horizontal rule — 80px wide, appears at t=2.4s
  var rule = comp.layers.addShape();
  rule.name = "Intro_GoldRule";
  rule.inPoint = 0;
  rule.outPoint = 4.0;
  var rGrp = rule.property("Contents").addProperty("ADBE Vector Group");
  var rRect = rGrp.property("Contents").addProperty("ADBE Vector Shape - Rect");
  rRect.property("Size").setValue([80, 1]);
  var rFill = rGrp.property("Contents").addProperty("ADBE Vector Graphic - Fill");
  rFill.property("Color").setValue([252/255, 211/255, 77/255]);
  rFill.property("Opacity").setValue(60);
  rule.property("Transform").property("Position").setValue([960, 580]);
  var rOp = rule.property("Transform").property("Opacity");
  rOp.setValueAtTime(2.3, 0);
  rOp.setValueAtTime(2.5, 100);

  // 3. "AI Operating System" — white 40% opacity, 18px, fade-in at t=1.6s
  var sub = comp.layers.addText("AI Operating System");
  var subDoc = sub.property("Source Text").value;
  subDoc.text = "AI Operating System";
  subDoc.fontSize = 18;
  subDoc.fillColor = [1, 1, 1];
  subDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
  sub.property("Source Text").setValue(subDoc);
  sub.property("Transform").property("Position").setValue([960, 565]);
  sub.inPoint = 0;
  sub.outPoint = 4.0;
  var subOp = sub.property("Transform").property("Opacity");
  subOp.setValueAtTime(1.5, 0);
  subOp.setValueAtTime(2.2, 40);

  // 4. "AIOS" — white, 72px, bold, fade-in at t=0.8s
  var aios = comp.layers.addText("AIOS");
  var aiosDoc = aios.property("Source Text").value;
  aiosDoc.text = "AIOS";
  aiosDoc.fontSize = 72;
  aiosDoc.fillColor = [1, 1, 1];
  aiosDoc.font = "Arial-BoldMT";
  aiosDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
  aios.property("Source Text").setValue(aiosDoc);
  aios.property("Transform").property("Position").setValue([960, 530]);
  aios.inPoint = 0;
  aios.outPoint = 4.0;
  var aiosOp = aios.property("Transform").property("Opacity");
  aiosOp.setValueAtTime(0.7, 0);
  aiosOp.setValueAtTime(1.6, 100);

  // 5. "NEURA SOLUTIONS" — gold, 14px, tracking 400, fade-in at t=0.3s
  var ns = comp.layers.addText("NEURA SOLUTIONS");
  var nsDoc = ns.property("Source Text").value;
  nsDoc.text = "NEURA SOLUTIONS";
  nsDoc.fontSize = 14;
  nsDoc.fillColor = [252/255, 211/255, 77/255];
  nsDoc.tracking = 400;
  nsDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
  ns.property("Source Text").setValue(nsDoc);
  ns.property("Transform").property("Position").setValue([960, 490]);
  ns.inPoint = 0;
  ns.outPoint = 4.0;
  var nsOp = ns.property("Transform").property("Opacity");
  nsOp.setValueAtTime(0.2, 0);
  nsOp.setValueAtTime(0.8, 100);

  "OK: Intro built — " + comp.numLayers + " layers";
  ```

- [ ] **Step 2: Verify**

  Call `mcp__after-effects__get-results`. Expected: `OK: Intro built — 5 layers`

  In After Effects press `Home` then `Space` to preview. Should show: NEURA SOLUTIONS (gold) → AIOS (large white) → AI Operating System (gray) → gold rule.

---

### Task 4: Add all 16 modules — title cards + clips (4s–56.9s)

**Files:**
- AE Composition: `AIOS_Demo_Reel_v1` — adds 80 layers (64 TC + 16 clips)

- [ ] **Step 1: Add all title cards and content clips**

  Call `mcp__after-effects__run-script` with:
  ```javascript
  function getComp(name) {
    for (var i = 1; i <= app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof CompItem && item.name === name) return item;
    }
    return null;
  }

  function getFootage(stem) {
    for (var i = 1; i <= app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof FootageItem &&
          item.name.toLowerCase().indexOf(stem.toLowerCase()) !== -1) {
        return item;
      }
    }
    return null;
  }

  // Title card: black BG + 2 gold lines + white label text
  function addTitleCard(comp, label, startTime) {
    var endTime = startTime + 0.5;

    var bg = comp.layers.addSolid([0, 0, 0], "TC_BG_" + label, 1920, 1080, 1.0);
    bg.inPoint = startTime; bg.outPoint = endTime;
    var bgOp = bg.property("Transform").property("Opacity");
    bgOp.setValueAtTime(startTime, 0);
    bgOp.setValueAtTime(startTime + 0.15, 100);
    bgOp.setValueAtTime(endTime - 0.1, 100);
    bgOp.setValueAtTime(endTime, 0);

    var topLine = comp.layers.addShape();
    topLine.name = "TC_Top_" + label;
    topLine.inPoint = startTime; topLine.outPoint = endTime;
    var tGrp = topLine.property("Contents").addProperty("ADBE Vector Group");
    var tRect = tGrp.property("Contents").addProperty("ADBE Vector Shape - Rect");
    tRect.property("Size").setValue([80, 2]);
    var tFill = tGrp.property("Contents").addProperty("ADBE Vector Graphic - Fill");
    tFill.property("Color").setValue([252/255, 211/255, 77/255]);
    topLine.property("Transform").property("Position").setValue([960, 520]);
    var tOp = topLine.property("Transform").property("Opacity");
    tOp.setValueAtTime(startTime, 0);
    tOp.setValueAtTime(startTime + 0.15, 100);
    tOp.setValueAtTime(endTime - 0.1, 100);
    tOp.setValueAtTime(endTime, 0);

    var botLine = comp.layers.addShape();
    botLine.name = "TC_Bot_" + label;
    botLine.inPoint = startTime; botLine.outPoint = endTime;
    var bGrp = botLine.property("Contents").addProperty("ADBE Vector Group");
    var bRect = bGrp.property("Contents").addProperty("ADBE Vector Shape - Rect");
    bRect.property("Size").setValue([80, 2]);
    var bFill = bGrp.property("Contents").addProperty("ADBE Vector Graphic - Fill");
    bFill.property("Color").setValue([252/255, 211/255, 77/255]);
    botLine.property("Transform").property("Position").setValue([960, 560]);
    var bOp = botLine.property("Transform").property("Opacity");
    bOp.setValueAtTime(startTime, 0);
    bOp.setValueAtTime(startTime + 0.15, 100);
    bOp.setValueAtTime(endTime - 0.1, 100);
    bOp.setValueAtTime(endTime, 0);

    var txt = comp.layers.addText(label);
    var doc = txt.property("Source Text").value;
    doc.text = label;
    doc.fontSize = 24;
    doc.fillColor = [1, 1, 1];
    doc.font = "Arial-BoldMT";
    doc.tracking = 600;
    doc.justification = ParagraphJustification.CENTER_JUSTIFY;
    txt.property("Source Text").setValue(doc);
    txt.property("Transform").property("Position").setValue([960, 540]);
    txt.inPoint = startTime; txt.outPoint = endTime;
    var txtOp = txt.property("Transform").property("Opacity");
    txtOp.setValueAtTime(startTime, 0);
    txtOp.setValueAtTime(startTime + 0.15, 100);
    txtOp.setValueAtTime(endTime - 0.1, 100);
    txtOp.setValueAtTime(endTime, 0);
  }

  // Video clip with 0.1s fade in/out for dissolve effect
  function addVideoClip(comp, stem, startTime, duration) {
    var footage = getFootage(stem);
    if (!footage) return "MISSING: " + stem;
    var layer = comp.layers.add(footage);
    layer.inPoint = startTime;
    layer.outPoint = startTime + duration;
    var op = layer.property("Transform").property("Opacity");
    op.setValueAtTime(startTime, 0);
    op.setValueAtTime(startTime + 0.1, 100);
    op.setValueAtTime(startTime + duration - 0.1, 100);
    op.setValueAtTime(startTime + duration, 0);
    return "OK: " + stem;
  }

  // PNG clip with Ken Burns (105%→100%) + 0.1s fade in/out
  function addPNGClip(comp, stem, startTime, duration) {
    var footage = getFootage(stem);
    if (!footage) return "MISSING: " + stem;
    var layer = comp.layers.add(footage);
    layer.inPoint = startTime;
    layer.outPoint = startTime + duration;
    var scale = layer.property("Transform").property("Scale");
    scale.setValueAtTime(startTime, [105, 105]);
    scale.setValueAtTime(startTime + duration, [100, 100]);
    var op = layer.property("Transform").property("Opacity");
    op.setValueAtTime(startTime, 0);
    op.setValueAtTime(startTime + 0.1, 100);
    op.setValueAtTime(startTime + duration - 0.1, 100);
    op.setValueAtTime(startTime + duration, 0);
    return "OK: " + stem;
  }

  var comp = getComp("AIOS_Demo_Reel_v1");
  var log = [];

  // Hero clips
  addTitleCard(comp, "DASHBOARD", 4.0);
  log.push(addVideoClip(comp, "dash", 4.5, 6.0));

  addTitleCard(comp, "AI CHAT", 10.5);
  log.push(addVideoClip(comp, "aichat", 11.0, 5.0));

  addTitleCard(comp, "TELEGRAM", 16.0);
  log.push(addVideoClip(comp, "telegram", 16.5, 4.0));

  // Standard clips
  addTitleCard(comp, "LEADS", 20.5);
  log.push(addPNGClip(comp, "leads", 21.0, 2.3));

  addTitleCard(comp, "CLIENTS", 23.3);
  log.push(addVideoClip(comp, "clients", 23.8, 2.3));

  addTitleCard(comp, "CALENDAR", 26.1);
  log.push(addPNGClip(comp, "calendar", 26.6, 2.3));

  addTitleCard(comp, "EMAILS", 28.9);
  log.push(addVideoClip(comp, "emails", 29.4, 2.3));

  addTitleCard(comp, "ANALYTICS", 31.7);
  log.push(addVideoClip(comp, "analitics", 32.2, 2.3));

  addTitleCard(comp, "REPORTS", 34.5);
  log.push(addVideoClip(comp, "report", 35.0, 2.3));

  addTitleCard(comp, "BILLING", 37.3);
  log.push(addVideoClip(comp, "billing", 37.8, 2.3));

  addTitleCard(comp, "AI SYSTEMS", 40.1);
  log.push(addVideoClip(comp, "aisystem", 40.6, 2.3));

  addTitleCard(comp, "USAGE", 42.9);
  log.push(addVideoClip(comp, "usage", 43.4, 2.3));

  addTitleCard(comp, "TEAM", 45.7);
  log.push(addVideoClip(comp, "team", 46.2, 2.3));

  addTitleCard(comp, "SECURITY", 48.5);
  log.push(addPNGClip(comp, "security", 49.0, 2.3));

  addTitleCard(comp, "SUPPORT", 51.3);
  log.push(addVideoClip(comp, "support", 51.8, 2.3));

  addTitleCard(comp, "SETTINGS", 54.1);
  log.push(addVideoClip(comp, "settings", 54.6, 2.3));

  "Layers: " + comp.numLayers + " | " + log.join(" | ");
  ```

- [ ] **Step 2: Verify no missing files**

  Call `mcp__after-effects__get-results`. All 16 clip entries must say `OK:`. Layer count should be 85 (5 intro + 64 TC + 16 clips). If any say `MISSING:`, check the exact filename in Explorer and fix the stem string in the script, then re-run only that call.

---

### Task 5: Build Outro segment (56.9–60s)

**Files:**
- AE Composition: `AIOS_Demo_Reel_v1` — adds 5 layers at 56.9-60s

- [ ] **Step 1: Add outro background, gold rule, and text layers**

  Call `mcp__after-effects__run-script` with:
  ```javascript
  function getComp(name) {
    for (var i = 1; i <= app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof CompItem && item.name === name) return item;
    }
    return null;
  }

  var comp = getComp("AIOS_Demo_Reel_v1");
  var oS = 56.9;
  var oE = 60.0;

  // 1. Background solid
  var bg = comp.layers.addSolid([13/255, 20/255, 36/255], "Outro_BG", 1920, 1080, 1.0);
  bg.inPoint = oS; bg.outPoint = oE;
  // Fade to black in last 0.8s
  var bgOp = bg.property("Transform").property("Opacity");
  bgOp.setValueAtTime(oE - 0.81, 100);
  bgOp.setValueAtTime(oE, 0);

  // 2. Gold rule — 120px, appears at t+0.3s
  var rule = comp.layers.addShape();
  rule.name = "Outro_Rule";
  rule.inPoint = oS; rule.outPoint = oE;
  var rGrp = rule.property("Contents").addProperty("ADBE Vector Group");
  var rRect = rGrp.property("Contents").addProperty("ADBE Vector Shape - Rect");
  rRect.property("Size").setValue([120, 1]);
  var rFill = rGrp.property("Contents").addProperty("ADBE Vector Graphic - Fill");
  rFill.property("Color").setValue([252/255, 211/255, 77/255]);
  rule.property("Transform").property("Position").setValue([960, 510]);
  var rOp = rule.property("Transform").property("Opacity");
  rOp.setValueAtTime(oS + 0.2, 0);
  rOp.setValueAtTime(oS + 0.3, 100);
  rOp.setValueAtTime(oE - 0.81, 100);
  rOp.setValueAtTime(oE, 0);

  // 3. "AI Operating System" — white 40% opacity, 13px, appears at t+1.4s
  var sub = comp.layers.addText("AI Operating System");
  var subDoc = sub.property("Source Text").value;
  subDoc.text = "AI Operating System";
  subDoc.fontSize = 13;
  subDoc.fillColor = [1, 1, 1];
  subDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
  sub.property("Source Text").setValue(subDoc);
  sub.property("Transform").property("Position").setValue([960, 560]);
  sub.inPoint = oS; sub.outPoint = oE;
  var subOp = sub.property("Transform").property("Opacity");
  subOp.setValueAtTime(oS + 1.3, 0);
  subOp.setValueAtTime(oS + 1.7, 40);
  subOp.setValueAtTime(oE - 0.81, 40);
  subOp.setValueAtTime(oE, 0);

  // 4. "NeuraSolutions" — gold, 16px, tracking 300, appears at t+1s
  var ns = comp.layers.addText("NeuraSolutions");
  var nsDoc = ns.property("Source Text").value;
  nsDoc.text = "NeuraSolutions";
  nsDoc.fontSize = 16;
  nsDoc.fillColor = [252/255, 211/255, 77/255];
  nsDoc.tracking = 300;
  nsDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
  ns.property("Source Text").setValue(nsDoc);
  ns.property("Transform").property("Position").setValue([960, 543]);
  ns.inPoint = oS; ns.outPoint = oE;
  var nsOp = ns.property("Transform").property("Opacity");
  nsOp.setValueAtTime(oS + 0.9, 0);
  nsOp.setValueAtTime(oS + 1.3, 100);
  nsOp.setValueAtTime(oE - 0.81, 100);
  nsOp.setValueAtTime(oE, 0);

  // 5. "AIOS" — white, 56px, bold, appears at t+0.5s
  var aios = comp.layers.addText("AIOS");
  var aiosDoc = aios.property("Source Text").value;
  aiosDoc.text = "AIOS";
  aiosDoc.fontSize = 56;
  aiosDoc.fillColor = [1, 1, 1];
  aiosDoc.font = "Arial-BoldMT";
  aiosDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
  aios.property("Source Text").setValue(aiosDoc);
  aios.property("Transform").property("Position").setValue([960, 525]);
  aios.inPoint = oS; aios.outPoint = oE;
  var aiosOp = aios.property("Transform").property("Opacity");
  aiosOp.setValueAtTime(oS + 0.4, 0);
  aiosOp.setValueAtTime(oS + 0.8, 100);
  aiosOp.setValueAtTime(oE - 0.81, 100);
  aiosOp.setValueAtTime(oE, 0);

  "OK: Outro built — " + comp.numLayers + " layers total";
  ```

- [ ] **Step 2: Verify**

  Call `mcp__after-effects__get-results`. Expected: `OK: Outro built — 90 layers total`

  Navigate AE timeline to 56.9s and press `Space`. Should see: gold rule → "AIOS" → "NeuraSolutions" gold → "AI Operating System" gray → all fade to black.

---

### Task 6: Final verification, scale-to-fit, save and render

- [ ] **Step 1: Verify comp structure**

  Call `mcp__after-effects__run-script` with:
  ```javascript
  function getComp(name) {
    for (var i = 1; i <= app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof CompItem && item.name === name) return item;
    }
    return null;
  }
  var comp = getComp("AIOS_Demo_Reel_v1");
  [
    "Layers: " + comp.numLayers,
    "Duration: " + comp.duration + "s",
    "Size: " + comp.width + "x" + comp.height,
    "FPS: " + comp.frameRate
  ].join(" | ");
  ```
  Expected: `Layers: 90 | Duration: 60s | Size: 1920x1080 | FPS: 30`

- [ ] **Step 2: Scale video clips to fill frame (if needed)**

  In AE, select all video clip layers (not title cards, not intro/outro layers). If any clip doesn't fill 1920×1080:
  - Select the layer → press `S` to reveal Scale
  - Press `Ctrl+Alt+F` (Fit to Comp Width) or manually set Scale to 100% if source is already 1920×1080

- [ ] **Step 3: Full RAM preview**

  Press `0` on the numpad (or Composition → Preview → RAM Preview). Watch the full 60s. Verify:
  - Intro text fades in correctly (gold NEURA SOLUTIONS → white AIOS → subtitle → gold rule)
  - Each title card shows module name with gold lines, on black background
  - All 16 clips play at their correct positions
  - Outro fades to black smoothly

- [ ] **Step 4: Save project**

  `Ctrl+S` → save as `C:\Users\ldmru\OneDrive\Desktop\Neura\AIOS\reel v1\AIOS_Demo_Reel_v1.aep`

- [ ] **Step 5: Export**

  - Select `AIOS_Demo_Reel_v1` in the Project panel
  - `Ctrl+M` → Add to Render Queue
  - Output Module → click on format → set to **H.264** (or use **File → Export → Add to Adobe Media Encoder Queue** for better H.264 control)
  - Output To → `C:\Users\ldmru\OneDrive\Desktop\Neura\AIOS\reel v1\AIOS_Demo_Reel_v1.mp4`
  - Click **Render**

---

## Spec Coverage Checklist

| Spec Requirement | Covered in |
|-----------------|-----------|
| 1920×1080, 30fps, 60s | Task 1 |
| Background #0d1424 | Task 1 (bgColor) + Tasks 3 & 5 (solids) |
| All 16 assets imported | Task 2 |
| Intro: NEURA SOLUTIONS gold 14px, tracking 400 | Task 3 |
| Intro: AIOS white 72px bold | Task 3 |
| Intro: AI Operating System 40% opacity 18px | Task 3 |
| Intro: gold rule 80px at t=2.4s | Task 3 |
| Title cards: black BG, gold lines, 24px bold, tracking 600 | Task 4 `addTitleCard` |
| Title cards: opacity 0→1 in 0.15s, 1→0 in 0.1s | Task 4 `addTitleCard` |
| All 16 modules at correct timecodes | Task 4 |
| Hero clips: Dashboard 6s, AI Chat 5s, Telegram 4s | Task 4 |
| Standard clips: 13 modules × 2.3s | Task 4 |
| PNG Ken Burns 105%→100% (leads, calendar, security) | Task 4 `addPNGClip` |
| Cross-dissolve 0.2s (as 0.1s fade in + 0.1s fade out) | Tasks 4 & 5 |
| Outro: AIOS 56px, NeuraSolutions gold, AI Op. System | Task 5 |
| Outro: fade to black over last 0.8s | Task 5 |
| Total 60.0s | Tasks 1–5 timing |
