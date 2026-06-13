// AIOS Demo Reel Builder — 50s, 1920x1080, 30fps
(function buildAIOSReel() {
    app.beginUndoGroup("Build AIOS Demo Reel");

    var proj = app.project;
    var W = 1920, H = 1080, FPS = 30, DUR = 50.0;

    var COL_BG    = [13/255,  20/255,  36/255];
    var COL_GOLD  = [252/255, 211/255, 77/255];
    var COL_WHITE = [1, 1, 1];
    var COL_BLACK = [0, 0, 0];
    var COL_GREY  = [0.55, 0.55, 0.55];

    // Remove existing reel comp if present
    for (var x = 1; x <= proj.numItems; x++) {
        if (proj.item(x).name === "AIOS_Demo_Reel_50s") { proj.item(x).remove(); break; }
    }

    var comp = proj.items.addComp("AIOS_Demo_Reel_50s", W, H, 1.0, DUR, FPS);
    comp.bgColor = COL_BG;

    // ---- Import videos ----
    var reelDir = "C:/Users/ldmru/OneDrive/Desktop/Neura/AIOS/reel v1/";
    function importFtg(fn) {
        var f = new File(reelDir + fn);
        if (!f.exists) throw new Error("Not found: " + reelDir + fn);
        return proj.importFile(new ImportOptions(f));
    }
    var dashFtg     = importFtg("dash.mp4");
    var aichatFtg   = importFtg("aichat.mp4");
    var telegramFtg = importFtg("telegram.mp4");

    // ---- Helpers ----
    function bg(name, color, t0, t1) {
        var lyr = comp.layers.addSolid(color, name, W, H, 1.0);
        lyr.startTime = t0; lyr.outPoint = t1;
        return lyr;
    }

    function bar(name, t0, t1, barH, yPos, opacity) {
        var lyr = comp.layers.addSolid(COL_BLACK, name, W, barH, 1.0);
        lyr.startTime = t0; lyr.outPoint = t1;
        lyr.property("Opacity").setValue(opacity || 75);
        lyr.property("Position").setValue([W/2, yPos]);
        return lyr;
    }

    function txt(text, t0, t1, size, color, x, y, bold) {
        var lyr = comp.layers.addText(text);
        lyr.startTime = t0; lyr.outPoint = t1;
        var tp = lyr.property("ADBE Text Properties").property("ADBE Text Document");
        var td = tp.value;
        td.fontSize = size;
        td.fillColor = color;
        td.font = bold ? "Arial-BoldMT" : "ArialMT";
        td.justification = ParagraphJustification.CENTER_JUSTIFY;
        tp.setValue(td);
        lyr.property("Position").setValue([x, y]);
        return lyr;
    }

    function fadeIn(lyr, t, dur) {
        var op = lyr.property("Opacity");
        op.setValueAtTime(t, 0);
        op.setValueAtTime(t + dur, 100);
    }
    function fadeOut(lyr, t, dur) {
        var op = lyr.property("Opacity");
        op.setValueAtTime(t - dur, 100);
        op.setValueAtTime(t, 0);
    }
    function slideUp(lyr, t, dur, finalY) {
        var pos = lyr.property("Position");
        var cx = pos.value[0];
        pos.setValueAtTime(t, [cx, H + 250]);
        pos.setValueAtTime(t + dur, [cx, finalY]);
    }
    function slideLeft(lyr, t, dur, finalX, y) {
        var pos = lyr.property("Position");
        pos.setValueAtTime(t, [-250, y]);
        pos.setValueAtTime(t + dur, [finalX, y]);
    }
    function scaleIn(lyr, t, dur) {
        var sc = lyr.property("Scale");
        sc.setValueAtTime(t, [0, 0]);
        sc.setValueAtTime(t + dur, [100, 100]);
        fadeIn(lyr, t, dur);
    }
    function scaleFrom(lyr, t, dur, fromPct) {
        var sc = lyr.property("Scale");
        sc.setValueAtTime(t, [fromPct, fromPct]);
        sc.setValueAtTime(t + dur, [100, 100]);
        fadeIn(lyr, t, dur * 0.6);
    }
    function goldLine(name, t0, t1, y, w) {
        var lyr = comp.layers.addShape();
        lyr.name = name; lyr.startTime = t0; lyr.outPoint = t1;
        var grp = lyr.property("Contents").addProperty("ADBE Vector Group");
        var gc  = grp.property("Contents");
        var rect = gc.addProperty("ADBE Vector Shape - Rect");
        rect.property("Size").setValue([w, 2]);
        gc.addProperty("ADBE Vector Graphic - Fill").property("Color").setValue(COL_GOLD);
        lyr.property("Position").setValue([W/2, y]);
        fadeIn(lyr, t0, 0.4);
        return lyr;
    }
    function video(ftg, t0, t1, scale, y) {
        var lyr = comp.layers.add(ftg);
        lyr.startTime = t0; lyr.outPoint = t1;
        lyr.property("Scale").setValue([scale, scale]);
        lyr.property("Position").setValue([W/2, y]);
        return lyr;
    }

    // ===================================================
    // SCENE 1 — PROBLEM (0–3s)
    // ===================================================
    bg("BG_Problem", COL_BLACK, 0, 3.0);

    var t1a = txt("Your business is growing.", 0, 3.0, 62, COL_GOLD, W/2, 490, true);
    slideLeft(t1a, 0, 0.5, W/2, 490);

    var t1b = txt("Your systems aren't.", 0.8, 3.0, 50, COL_WHITE, W/2, 575, false);
    fadeIn(t1b, 0.8, 0.4);

    // Flash transition
    var flash = bg("Flash", COL_WHITE, 2.93, 3.07);
    var fOp = flash.property("Opacity");
    fOp.setValueAtTime(2.93, 0); fOp.setValueAtTime(3.0, 100); fOp.setValueAtTime(3.07, 0);

    // ===================================================
    // SCENE 2 — REVEAL (3–9s)
    // ===================================================
    bg("BG_Reveal", COL_BG, 3.0, 9.0);

    var tIntro = txt("I N T R O D U C I N G", 3.2, 9.0, 16, COL_WHITE, W/2, 418, false);
    fadeIn(tIntro, 3.2, 0.6);

    goldLine("GL_Rev_Top", 4.2, 9.0, 398, 260);
    goldLine("GL_Rev_Bot", 4.2, 9.0, 638, 260);

    var tAIOS = txt("AIOS", 3.5, 9.0, 118, COL_GOLD, W/2, 535, true);
    scaleFrom(tAIOS, 3.5, 0.6, 60);

    var tAOS = txt("AI Operating System", 4.2, 9.0, 26, COL_WHITE, W/2, 615, false);
    fadeIn(tAOS, 4.2, 0.5);

    var tNeura = txt("by NeuraSolutions", 4.7, 9.0, 17, COL_GREY, W/2, 652, false);
    fadeIn(tNeura, 4.7, 0.5);

    fadeOut(tAIOS, 9.0, 0.3);
    fadeOut(tAOS,  9.0, 0.3);

    // ===================================================
    // SCENE 3 — DEMO: DASHBOARD (9–16s)
    // ===================================================
    bg("BG_Demo1", COL_BG, 9.0, 16.0);

    var dashLyr = video(dashFtg, 9.0, 16.0, 64, 465);
    slideUp(dashLyr, 9.0, 0.6, 465);

    // Gold border strip (top of video area)
    var vBorder1 = comp.layers.addShape();
    vBorder1.name = "VideoBorder_1"; vBorder1.startTime = 9.0; vBorder1.outPoint = 16.0;
    var vb1g = vBorder1.property("Contents").addProperty("ADBE Vector Group");
    var vb1gc = vb1g.property("Contents");
    var vb1r = vb1gc.addProperty("ADBE Vector Shape - Rect");
    vb1r.property("Size").setValue([1234, 3]);
    var vb1s = vb1gc.addProperty("ADBE Vector Graphic - Stroke");
    vb1s.property("Color").setValue(COL_GOLD);
    vb1s.property("Stroke Width").setValue(2);
    var vb1f = vb1gc.addProperty("ADBE Vector Graphic - Fill");
    vb1f.property("Opacity").setValue(0);
    vBorder1.property("Position").setValue([W/2, 155]);
    fadeIn(vBorder1, 9.3, 0.4);

    var tNum1 = txt("01", 9.0, 16.0, 18, COL_GOLD, 1830, 100, true);
    fadeIn(tNum1, 9.0, 0.3);

    bar("Bar_Demo1", 9.0, 16.0, 100, H - 50, 78);
    var tCap1 = txt("Live KPIs. Every department. One screen.", 9.4, 16.0, 30, COL_WHITE, W/2, H - 50, true);
    fadeIn(tCap1, 9.4, 0.4);

    // ===================================================
    // SCENE 4 — DEMO: AI CHAT (16–23s)
    // ===================================================
    bg("BG_Demo2", COL_BG, 16.0, 23.0);

    var acLyr = video(aichatFtg, 16.0, 23.0, 64, 465);
    slideUp(acLyr, 16.0, 0.6, 465);

    var tNum2 = txt("02", 16.0, 23.0, 18, COL_GOLD, 1830, 100, true);
    fadeIn(tNum2, 16.0, 0.3);

    bar("Bar_Demo2", 16.0, 23.0, 120, H - 60, 78);
    var tCap2a = txt("Ask anything about your business.", 16.4, 23.0, 28, COL_WHITE, W/2, H - 75, false);
    fadeIn(tCap2a, 16.4, 0.4);
    var tCap2b = txt("Get the answer in seconds.", 17.1, 23.0, 28, COL_GOLD, W/2, H - 38, true);
    fadeIn(tCap2b, 17.1, 0.35);

    // ===================================================
    // SCENE 5 — DEMO: TELEGRAM (23–30s)
    // ===================================================
    bg("BG_Demo3", COL_BG, 23.0, 30.0);

    var tgLyr = video(telegramFtg, 23.0, 30.0, 64, 465);
    slideUp(tgLyr, 23.0, 0.6, 465);

    var tNum3 = txt("03", 23.0, 30.0, 18, COL_GOLD, 1830, 100, true);
    fadeIn(tNum3, 23.0, 0.3);

    bar("Bar_Demo3", 23.0, 30.0, 120, H - 60, 78);
    var tCap3a = txt("The CEO never needs to open the app.", 23.4, 30.0, 27, COL_WHITE, W/2, H - 75, false);
    fadeIn(tCap3a, 23.4, 0.4);
    var tCap3b = txt("Ask Telegram — get live company data, by voice.", 24.1, 30.0, 27, COL_GOLD, W/2, H - 40, true);
    fadeIn(tCap3b, 24.1, 0.35);

    // ===================================================
    // SCENE 6 — STAT 1: 15+ (30–34s)
    // ===================================================
    var ph1 = bg("PLACEHOLDER_leads_png", [20/255, 35/255, 60/255], 30.0, 34.0);
    // Ken Burns
    var ph1sc = ph1.property("Scale");
    ph1sc.setValueAtTime(30.0, [108, 108]); ph1sc.setValueAtTime(34.0, [100, 100]);
    bg("Overlay_S1", COL_BLACK, 30.0, 34.0).property("Opacity").setValue(62);

    var tS1n = txt("15+", 30.3, 34.0, 110, COL_GOLD, W/2, 490, true);
    scaleIn(tS1n, 30.3, 0.55);

    var tS1l = txt("AI-powered modules", 30.88, 34.0, 28, COL_WHITE, W/2, 600, false);
    fadeIn(tS1l, 30.88, 0.3);

    goldLine("GL_S1", 31.1, 34.0, 628, 210);

    // ===================================================
    // SCENE 7 — STAT 2: Real-time (34–38s)
    // ===================================================
    var ph2 = bg("PLACEHOLDER_security_png", [15/255, 25/255, 45/255], 34.0, 38.0);
    var ph2sc = ph2.property("Scale");
    ph2sc.setValueAtTime(34.0, [108, 108]); ph2sc.setValueAtTime(38.0, [100, 100]);
    bg("Overlay_S2", COL_BLACK, 34.0, 38.0).property("Opacity").setValue(62);

    var tS2a = txt("Real-time", 34.3, 38.0, 86, COL_GOLD, W/2, 462, true);
    scaleFrom(tS2a, 34.3, 0.45, 80);

    var tS2b = txt("Full business visibility — 24/7", 34.75, 38.0, 28, COL_WHITE, W/2, 565, false);
    fadeIn(tS2b, 34.75, 0.3);

    goldLine("GL_S2", 35.0, 38.0, 590, 270);

    // ===================================================
    // SCENE 8 — STAT 3: £850/month (38–43s)
    // ===================================================
    var ph3 = bg("PLACEHOLDER_calendar_png", [18/255, 30/255, 50/255], 38.0, 43.0);
    var ph3sc = ph3.property("Scale");
    ph3sc.setValueAtTime(38.0, [108, 108]); ph3sc.setValueAtTime(43.0, [100, 100]);
    bg("Overlay_S3", COL_BLACK, 38.0, 43.0).property("Opacity").setValue(62);

    var tS3a = txt("From £850/month", 38.3, 43.0, 78, COL_GOLD, W/2, 462, true);
    scaleFrom(tS3a, 38.3, 0.5, 80);

    var tS3b = txt("Setup in days, not months", 38.82, 43.0, 28, COL_WHITE, W/2, 565, false);
    fadeIn(tS3b, 38.82, 0.3);

    // Animated underline under price
    var uLine = comp.layers.addShape();
    uLine.name = "Underline_Price"; uLine.startTime = 39.2; uLine.outPoint = 43.0;
    var uGrp = uLine.property("Contents").addProperty("ADBE Vector Group");
    var uGc  = uGrp.property("Contents");
    var uRect = uGc.addProperty("ADBE Vector Shape - Rect");
    // Access Size BEFORE adding Fill (adding siblings invalidates prior references)
    var uSz = uRect.property("Size");
    uSz.setValueAtTime(39.2, [0, 3]); uSz.setValueAtTime(39.75, [450, 3]);
    uGc.addProperty("ADBE Vector Graphic - Fill").property("Color").setValue(COL_GOLD);
    uLine.property("Position").setValue([W/2, 506]);

    goldLine("GL_S3", 39.0, 43.0, 592, 245);

    // ===================================================
    // SCENE 9 — OUTRO (43–50s)
    // ===================================================
    var bgOut = bg("BG_Outro", COL_BLACK, 43.0, 50.0);
    fadeIn(bgOut, 43.0, 0.8);

    goldLine("GL_Out_Top", 44.2, 50.0, 430, 270);
    goldLine("GL_Out_Bot", 44.2, 50.0, 642, 270);

    var tOA = txt("AIOS", 43.5, 50.0, 112, COL_GOLD, W/2, 535, true);
    fadeIn(tOA, 43.5, 0.7);
    fadeOut(tOA, 50.0, 1.2);

    var tOS = txt("AI Operating System", 44.2, 50.0, 22, COL_WHITE, W/2, 615, false);
    fadeIn(tOS, 44.2, 0.5);
    fadeOut(tOS, 50.0, 1.2);

    var tON = txt("NeuraSolutions", 44.7, 50.0, 16, COL_GREY, W/2, 652, false);
    fadeIn(tON, 44.7, 0.5);
    fadeOut(tON, 50.0, 1.2);

    comp.openInViewer();
    app.endUndoGroup();

    return "SUCCESS: AIOS_Demo_Reel_50s — " + comp.numLayers + " layers";
})();
