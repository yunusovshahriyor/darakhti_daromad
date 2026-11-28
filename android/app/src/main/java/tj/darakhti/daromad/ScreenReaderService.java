package tj.darakhti.daromad;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Rect;
import android.os.Build;
import android.view.Display;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Маблағи имрӯзаи «Яндекс Про» аз саҳифаи «Деньги»: танҳо экрани ҳамин барнома мехонда мешавад
 * (`packageNames` маҳдуд шудааст ва номи баста худкор аз барномаи кушодашуда муайян мешавад); маблағ танҳо дар ин телефон нигоҳ дошта мешавад.
 */
public class ScreenReaderService extends AccessibilityService {
    /** Номи баста (пешфарз): «Яндекс Про» (Таксометр). Агар дигар бошад, OverlayService номи дурустро дар `yp_pkg` менависад. */
    public static final String TARGET_PKG = "ru.yandex.taximeter";
    private static final Pattern MONEY = Pattern.compile("(?:-?\\d[\\d\\s\\u00a0\\u202f]*,\\d{1,2}\\s*[₽Р]?)|(?:-?\\d[\\d\\s\\u00a0\\u202f]*\\.\\d{1,2}\\s*[₽Р])");

    private final Handler handler = new Handler(Looper.getMainLooper());
    private SharedPreferences prefs;
    private long last = 0;
    private boolean scheduled = false;

    private final SharedPreferences.OnSharedPreferenceChangeListener listener = (p, key) -> {
        if ("yp_pkg".equals(key)) retarget();
    };

    /** Маблағи ҷамъшуда бо ₽ (ҳатто бе аъшор): «452 ₽», «7 058,49 ₽». */
    private static final Pattern RUB = Pattern.compile("-?\\d[\\d\\s\\u00a0\\u202f]*(?:[.,]\\d{1,2})?\\s*[₽Р]");
    /** Саҳифаи «Заказ завершён» дар ҳамон вақт як маротиба ҳисоб карда мешавад. */
    private boolean completedShown = false;
    private long lastOrderAt = 0;
    private double lastOrderGross = -1;

    // ---------- Вақти кор: дастӣ («Кор» / «Истироҳат») ----------
    private static boolean has(Item it, String w) {
        return it.text.toLowerCase(java.util.Locale.ROOT).contains(w);
    }

    /** Ҳолати «дар линия» (on) ё не (off): ҳисобкунакҳои вақт. Танҳо ҳангоми тағйир ҳисоб мешавад. */
    private void setOnline(boolean online) {
        long now = System.currentTimeMillis();
        String st = prefs.getString("wk_state", "");
        String want = online ? "on" : "off";
        if (st.equals(want)) return;
        SharedPreferences.Editor e = prefs.edit();
        long worked = prefs.getLong("wk_worked", 0);
        long since = prefs.getLong("wk_since", now);
        long restMs = (long) (num(prefs.getString("wk_rest_h", "6")) * 3600_000L);
        if (online) {
            // Баъд аз истироҳати пурра ҳисоб аз сифр оғоз мешавад
            if (st.equals("off") && restMs > 0 && now - since >= restMs) worked = 0;
        } else if (st.equals("on")) {
            worked += now - since; // ҳисоб кардани фосилаи кор
        }
        e.putString("wk_state", want).putLong("wk_worked", worked).putLong("wk_since", now).apply();
    }

    private static class Item {
        final String text;
        final Rect r;
        final boolean vis;
        final boolean sel;
        Item(String text, Rect r, boolean vis, boolean sel) { this.text = text; this.r = r; this.vis = vis; this.sel = sel; }
    }

    private String target() {
        String p = prefs.getString("yp_pkg", "");
        return p.isEmpty() ? TARGET_PKG : p;
    }

    /** Android рӯйдодҳоро танҳо аз барномаи интихобшуда мефиристад. */
    private void retarget() {
        AccessibilityServiceInfo info = getServiceInfo();
        if (info == null) return;
        info.packageNames = new String[] { target() };
        setServiceInfo(info);
    }

    @Override
    protected void onServiceConnected() {
        prefs = getSharedPreferences("overlay", MODE_PRIVATE);
        prefs.registerOnSharedPreferenceChangeListener(listener);
        retarget();
    }

    private final Runnable task = new Runnable() {
        @Override
        public void run() {
            scheduled = false;
            last = SystemClock.uptimeMillis();
            read();
        }
    };

    @Override
    public void onAccessibilityEvent(AccessibilityEvent e) {
        if (prefs == null || e == null || e.getPackageName() == null || !target().contentEquals(e.getPackageName())) return;
        if (!prefs.getBoolean("yp_on", false)) return;
        prefs.edit().putInt("dbg_events", prefs.getInt("dbg_events", 0) + 1).apply();
        // Кам-кам хондан: бештар аз як маротиба дар 0,7 сония не, аммо ҳолати охирин ҳатман хонда мешавад
        long wait = Math.max(0, 700 - (SystemClock.uptimeMillis() - last));
        if (!scheduled) { scheduled = true; handler.postDelayed(task, wait); }
    }

    @Override
    public void onInterrupt() { }

    private void collect(AccessibilityNodeInfo n, List<Item> out, int depth) {
        if (n == null || depth > 50) return;
        CharSequence t = n.getText();
        if (t == null || t.length() == 0) t = n.getContentDescription();
        if (t != null && t.length() > 0) {
            Rect r = new Rect();
            n.getBoundsInScreen(r);
            out.add(new Item(t.toString().replace('\n', ' ').trim(), r, n.isVisibleToUser(), n.isSelected() || n.isChecked()));
        }
        for (int i = 0; i < n.getChildCount(); i++) collect(n.getChild(i), out, depth + 1);
    }

    private void read() {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) { prefs.edit().putString("dbg_texts", "(root=null)").apply(); return; }
        if (root.getPackageName() == null || !target().contentEquals(root.getPackageName())) { hidePrice(); hideCard(); return; }
        List<Item> items = new ArrayList<>();
        collect(root, items, 0);

        // Ташхис: чанд матни аввал (танҳо дар ин телефон, барои санҷиш дар танзимот)
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < items.size() && sb.length() < 400; i++) sb.append(items.get(i).text).append(" | ");
        prefs.edit().putInt("dbg_items", items.size()).putString("dbg_texts", sb.toString()).apply();

        detectPage(items);
        // Блоки идораи вақт дар «Профиль» (ба ҷои баннери «Режимы дохода…»)
        try { updateCard(items); } catch (Exception ex) { prefs.edit().putString("dbg_price", "card err: " + ex).apply(); hideCard(); }

        // «Заказ завершён»: маблағи фармоиш (минус комиссия) худкор ба маблағи имрӯза илова мешавад, бе гузаштан ба «Деньги»
        int doneIdx = -1;
        for (int i = 0; i < items.size(); i++) if (has(items.get(i), "заказ заверш")) { doneIdx = i; break; }
        if (doneIdx >= 0) hidePrice();
        else {
            try { updatePrice(items); } catch (Exception ex) { prefs.edit().putString("dbg_price", "err: " + ex).apply(); hidePrice(); }
        }
        if (doneIdx >= 0) {
            if (!completedShown) {
                double gross = orderAmount(items, doneIdx);
                if (gross > 0) { addOrder(gross); completedShown = true; }
            }
            return;
        }
        completedShown = false;

        int todayIdx = -1;
        boolean page = false;
        for (int i = 0; i < items.size(); i++) {
            Item it = items.get(i);
            if (todayIdx < 0 && has(it, "сегодня")) todayIdx = i;
            if (has(it, "история заказов") || has(it, "баланс") || has(it, "средний доход")) page = true;
        }
        // Танҳо саҳифаи «Деньги»
        if (todayIdx < 0 || !page) return;
        Item today = items.get(todayIdx);

        String amt = null;
        // 1) Маблағ дар худи «Сегодня» (агар як матн бошад)
        Matcher own = MONEY.matcher(today.text);
        if (own.find() && today.text.length() > 8) amt = own.group();
        // 2) Маблағи ба «Сегодня» наздик дар боло (аз рӯи ҷойгиршавӣ)
        if (amt == null) {
            int bestDist = Integer.MAX_VALUE;
            for (Item it : items) {
                Matcher m = MONEY.matcher(it.text);
                if (!m.find() || it.text.length() > 24) continue;
                int dist = today.r.top - it.r.bottom;
                if (dist < -40 || dist > 600 || it.r.left > today.r.right) continue;
                if (Math.abs(dist) < bestDist) { amt = m.group(); bestDist = Math.abs(dist); }
            }
        }
        // 3) Аз рӯи тартиб: охирин маблағ пеш аз «Сегодня»
        if (amt == null) {
            for (int i = todayIdx - 1; i >= 0 && i >= todayIdx - 6; i--) {
                Matcher m = MONEY.matcher(items.get(i).text);
                if (m.find() && items.get(i).text.length() <= 24) { amt = m.group(); break; }
            }
        }
        if (amt == null) return;
        amt = amt.replaceAll("[\\s\\u00a0\\u202f]+", " ").trim();
        if (!amt.endsWith("₽") && !amt.endsWith("Р")) amt += " ₽";
        prefs.edit().putString("yp_amount", amt).putString("yp_date", OverlayService.todayKey()).apply();
    }



    /**
     * Саҳифаи асосӣ (харита / фармоиш) ё саҳифаи дигар (Деньги, Профиль, Чаты, Предзаказы): блоки маблағ танҳо дар асосӣ намоён аст.
     * Аввал тугмаи интихобшудаи навбари поён (Заказы/Предзаказы/Деньги/Чаты/Профиль), вагарна аз мундариҷаи саҳифа.
     */
    private void detectPage(List<Item> items) {
        String[] tabs = { "заказы", "предзаказы", "деньги", "чаты", "профиль" };
        String selected = null;
        for (Item it : items) {
            String t = it.text.toLowerCase(java.util.Locale.ROOT);
            for (String tab : tabs) if (t.equals(tab) && it.sel) selected = tab;
        }
        boolean main;
        if (selected != null) main = selected.equals("заказы");
        else {
            boolean other = false;
            for (Item it : items) {
                if (has(it, "история заказов") || has(it, "средний доход") || has(it, "мой транспорт") || has(it, "тарифы и опции") || it.text.equalsIgnoreCase("Водитель такси")) { other = true; break; }
            }
            main = !other;
        }
        if (prefs.getBoolean("yp_main", true) != main) prefs.edit().putBoolean("yp_main", main).apply();
    }

    // ---------- Сомонӣ болои нархи фармоиш (тафсилоти фармоиш) ----------
    private android.view.WindowManager wm;
    private android.widget.TextView priceView;
    private android.view.WindowManager.LayoutParams priceLp;
    private final Runnable watchdog = new Runnable() {
        @Override
        public void run() {
            if (priceView == null) return;
            // Агар аз Яндекс Про баромада бошем — нишон намедиҳем
            String cur = prefs.getString("cur_pkg", target());
            if (!cur.equals(target())) { hidePrice(); return; }
            handler.postDelayed(this, 1500);
        }
    };

    private void hidePrice() {
        handler.removeCallbacks(watchdog);
        if (priceView != null && wm != null) {
            try { wm.removeView(priceView); } catch (Exception ignored) { /* already removed */ }
        }
        priceView = null;
    }

    /** «Оплата картой / Стоимость поездки … 427 ₽»: болои нарх «≈ 47,50 смн» бо ҳамон андоза ва ранг. Танҳо ҳангоми кушода будани тафсилот. */
    private void updatePrice(List<Item> items) {
        if (!prefs.getBoolean("yp_on", false)) { hidePrice(); return; }
        double rate = num(prefs.getString("fx_rate", "0"));
        android.util.DisplayMetrics dm = getResources().getDisplayMetrics();
        Item price = null;
        Item ref = null;
        for (Item it : items) {
            if (has(it, "стоимость поездки") || has(it, "оплата картой") || has(it, "оплата наличными") || has(it, "безналичн")) { ref = it; break; }
        }
        Item pass = null;
        for (Item it : items) if (it.text.equalsIgnoreCase("Пассажир")) { pass = it; break; }
        int cands = 0;
        int bestD = Integer.MAX_VALUE;
        for (Item it : items) {
            if (it.text.length() > 14 || !RUB.matcher(it.text).matches()) continue;
            if (it.r.left < dm.widthPixels / 2 || it.r.top < 0 || it.r.bottom > dm.heightPixels) continue;
            cands++;
            int d = ref != null ? Math.abs(it.r.centerY() - ref.r.centerY())
                : pass != null && it.r.bottom <= pass.r.top + 10 ? pass.r.top - it.r.bottom : Integer.MAX_VALUE;
            if (d < 140 && d < bestD) { bestD = d; price = it; }
        }
        // Агар Яндекс сатрро як гурӯҳ кунад («Оплата картой, Стоимость поездки…, 1 266 ₽»), нарх аз худи ҳамон матн гирифта мешавад
        String mergedTxt = null;
        Rect mergedR = null;
        if (price == null) {
            for (Item it : items) {
                if (it.text.length() > 120 || it.r.top < 0 || it.r.bottom > dm.heightPixels || it.r.width() < dm.widthPixels / 2) continue;
                if (!(has(it, "стоимость поездки") || has(it, "оплата"))) continue;
                Matcher m = RUB.matcher(it.text);
                String last = null;
                while (m.find()) last = m.group();
                if (last != null) {
                    mergedTxt = last;
                    int h = Math.max(24, (int) (it.r.height() * 0.45));
                    int cy = it.r.centerY();
                    mergedR = new Rect(it.r.right - (int) (0.03 * dm.widthPixels) - h * 4, cy - h / 2, it.r.right - (int) (0.03 * dm.widthPixels), cy + h / 2);
                    break;
                }
            }
        }
        prefs.edit().putString("dbg_price", "rate=" + rate + " ref=" + (ref != null) + " pass=" + (pass != null) + " cands=" + cands
            + " price=" + (price != null ? price.text : mergedTxt != null ? "merged:" + mergedTxt : "-")).apply();
        if (rate <= 0) price = null;
        if (rate <= 0 || (price == null && mergedTxt == null)) { hidePrice(); return; }
        // Нархи умумӣ ва соф (пас аз комиссияи Яндекс ва парк) бо сомонӣ: «88,37с = 70,43с»
        double gross = num(price != null ? price.text : mergedTxt) * rate;
        double fee = num(prefs.getString("yp_fee_ya", "18.3")) + num(prefs.getString("yp_fee_park", "2"));
        if (fee < 0 || fee > 100) fee = 20.3;
        String txt = fmtTjs(gross) + "с = " + fmtTjs(gross * (1 - fee / 100.0)) + "с";
        if (wm == null) wm = (android.view.WindowManager) getSystemService(WINDOW_SERVICE);
        if (priceView == null) {
            android.widget.TextView t = new android.widget.TextView(this);
            t.setTextColor(android.graphics.Color.WHITE);
            t.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
            t.setIncludeFontPadding(false);
            t.setGravity(android.view.Gravity.END | android.view.Gravity.BOTTOM);
            t.setSingleLine(true);
            priceView = t;
            priceLp = new android.view.WindowManager.LayoutParams(android.view.WindowManager.LayoutParams.WRAP_CONTENT, android.view.WindowManager.LayoutParams.WRAP_CONTENT,
                android.view.WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                    | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                android.graphics.PixelFormat.TRANSLUCENT);
            priceLp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
            try { wm.addView(t, priceLp); } catch (Exception ex) {
                priceView = null;
                prefs.edit().putString("dbg_price", "addView: " + ex).apply();
                return;
            }
            handler.removeCallbacks(watchdog);
            handler.postDelayed(watchdog, 1500);
        }
        final android.widget.TextView tv = priceView;
        final Rect r = price != null ? price.r : mergedR;
        // Андозаи ҳарфи собит ва хурд (аз баландии қуттии нарх не: он баъзан баланд аст) ва ҷойгиршавӣ аз маркази қуттӣ
        float size = 0.034f * dm.widthPixels;
        tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, size);
        tv.setText(txt);
        tv.measure(android.view.View.MeasureSpec.UNSPECIFIED, android.view.View.MeasureSpec.UNSPECIFIED);
        int w = tv.getMeasuredWidth(), h = tv.getMeasuredHeight();
        priceLp.x = Math.max(0, r.right - w);
        priceLp.y = Math.max(0, r.centerY() - (int) (size * 0.62f) - h - 2);
        try { wm.updateViewLayout(tv, priceLp); } catch (Exception ignored) { /* removed */ }
    }

    private static double num(String t) {
        try { return Double.parseDouble(t.replaceAll("[^0-9,.-]", "").replace(',', '.')); } catch (Exception e) { return -1; }
    }

    /** Маблағи фармоиш аз саҳифаи «Заказ завершён»: сатри «Доход» ё маблағи калони наздик. */
    private double orderAmount(List<Item> items, int doneIdx) {
        Item income = null;
        for (Item it : items) if (it.text.equalsIgnoreCase("Доход")) { income = it; break; }
        if (income != null) {
            int cy = income.r.centerY();
            for (Item it : items) {
                if (it.text.length() > 24 || !RUB.matcher(it.text).matches()) continue;
                if (Math.abs(it.r.centerY() - cy) < 80 && it.r.left >= income.r.right - 10) return num(it.text);
            }
        }
        for (int i = Math.max(0, doneIdx - 4); i <= Math.min(items.size() - 1, doneIdx + 4); i++) {
            Item it = items.get(i);
            if (it.text.length() <= 24 && RUB.matcher(it.text).matches()) return num(it.text);
        }
        return -1;
    }

    private static String fmtTjs(double v) {
        String[] p = String.format(java.util.Locale.US, "%.2f", v).split("\\.");
        return p[0].replaceAll("\\B(?=(\\d{3})+(?!\\d))", "\u00a0") + "," + p[1];
    }

    private static String fmtRub(double v) {
        String[] p = String.format(java.util.Locale.US, "%.2f", v).split("\\.");
        return p[0].replaceAll("\\B(?=(\\d{3})+(?!\\d))", "\u00a0") + "," + p[1] + " ₽";
    }

    /** Маблағи фармоиш − комиссияи Яндекс ва парк = воқеан ба даромад меояд. */
    private void addOrder(double gross) {
        long now = SystemClock.uptimeMillis();
        if (gross == lastOrderGross && now - lastOrderAt < 15000) return; // як фармоиш ду маротиба не
        lastOrderGross = gross;
        lastOrderAt = now;
        double fee = num(prefs.getString("yp_fee_ya", "18.3")) + num(prefs.getString("yp_fee_park", "2"));
        if (fee < 0 || fee > 100) fee = 20.3;
        double net = gross * (1 - fee / 100.0);
        String today = OverlayService.todayKey();
        // Шумораи заказҳои имрӯза (+1 пас аз ҳар «Заказ завершён»)
        int orders = today.equals(prefs.getString("yp_orders_date", "")) ? prefs.getInt("yp_orders", 0) : 0;
        prefs.edit().putInt("yp_orders", orders + 1).putString("yp_orders_date", today).apply();
        double base = today.equals(prefs.getString("yp_date", "")) ? Math.max(0, num(prefs.getString("yp_amount", "0"))) : 0;
        prefs.edit().putString("yp_amount", fmtRub(base + net)).putString("yp_date", today)
            .putString("yp_last", fmtRub(gross) + " → +" + fmtRub(net)).apply();
    }

    // ---------- Блоки идораи вақти кор дар «Профиль» (дастӣ: «Кор» / «Истироҳат») ----------
    private android.widget.LinearLayout card;
    private android.widget.TextView cardTitle, cardMain;
    private IconBtn btnWork, btnRest;
    private android.view.WindowManager.LayoutParams cardLp;
    private final Rect cardRect = new Rect();
    private final Runnable cardTick = new Runnable() {
        @Override
        public void run() {
            if (card == null) return;
            if (!prefs.getString("cur_pkg", target()).equals(target())) { hideCard(); return; }
            refreshCard();
            handler.postDelayed(this, 1000);
        }
    };

    private int dp(float v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    /** Вақт бо сония: 2:08:14. */
    private static String hms(long ms) {
        long t = Math.max(0, ms) / 1000;
        return (t / 3600) + ":" + String.format(java.util.Locale.US, "%02d:%02d", (t / 60) % 60, t % 60);
    }

    private void hideCard() {
        handler.removeCallbacks(cardTick);
        if (card != null && wm != null) {
            try { wm.removeView(card); } catch (Exception ignored) { /* already removed */ }
        }
        card = null;
    }

    /** Тугмаи мудаввар бо нишона: play (кор) ё pause (истироҳат). */
    private class IconBtn extends android.view.View {
        private final boolean play;
        private boolean active;
        private int activeBg;
        private final android.graphics.Paint paint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);

        IconBtn(boolean play) { super(ScreenReaderService.this); this.play = play; }

        void set(boolean active, int activeBg) { this.active = active; this.activeBg = activeBg; invalidate(); }

        @Override
        protected void onDraw(android.graphics.Canvas c) {
            float w = getWidth(), h = getHeight(), r = Math.min(w, h) / 2f;
            paint.setStyle(android.graphics.Paint.Style.FILL);
            paint.setColor(active ? activeBg : 0x33FFFFFF);
            c.drawCircle(w / 2, h / 2, r, paint);
            paint.setColor(active ? 0xFF111111 : 0xFFFFFFFF);
            float u = r * 0.42f;
            if (play) {
                android.graphics.Path path = new android.graphics.Path();
                path.moveTo(w / 2 - u * 0.7f, h / 2 - u);
                path.lineTo(w / 2 + u * 1.05f, h / 2);
                path.lineTo(w / 2 - u * 0.7f, h / 2 + u);
                path.close();
                c.drawPath(path, paint);
            } else {
                float bw = u * 0.55f;
                c.drawRoundRect(new android.graphics.RectF(w / 2 - u * 0.95f, h / 2 - u, w / 2 - u * 0.95f + bw, h / 2 + u), bw / 3, bw / 3, paint);
                c.drawRoundRect(new android.graphics.RectF(w / 2 + u * 0.95f - bw, h / 2 - u, w / 2 + u * 0.95f, h / 2 + u), bw / 3, bw / 3, paint);
            }
        }
    }

    /** Матнҳои блок аз ҳолати дастӣ: `wk_state` on/off, `wk_worked`, `wk_since`. Вақт бо сония ҳар сония навсозӣ мешавад. */
    private void refreshCard() {
        if (card == null) return;
        long now = System.currentTimeMillis();
        String st = prefs.getString("wk_state", "");
        long limit = (long) (num(prefs.getString("wk_limit_h", "12")) * 3600_000L);
        long rest = (long) (num(prefs.getString("wk_rest_h", "6")) * 3600_000L);
        if (limit <= 0) limit = 12 * 3600_000L;
        long worked = prefs.getLong("wk_worked", 0);
        long since = prefs.getLong("wk_since", now);
        String title, main;
        if (st.equals("on")) {
            long cur = worked + (now - since);
            long left = limit - cur;
            title = left > 0 ? "● Дар линия · монд " + hms(left) : "● Дар линия · лимит!";
            main = hms(cur);
        } else if (st.equals("off")) {
            long off = now - since;
            if (worked <= 0 || off >= rest) { title = "○ Омода ба кор"; main = "0:00:00"; }
            else { title = "○ Истироҳат · то " + hms(rest - off); main = hms(off); }
        } else {
            title = "○ Вақти кор";
            main = "0:00:00";
        }
        cardTitle.setText(title);
        cardMain.setText(main);
        btnWork.set(st.equals("on"), 0xFFFFD600);
        btnRest.set(st.equals("off"), 0xFF9FC1FF);
    }

    private void press(boolean work) {
        setOnline(work);
        refreshCard();
    }

    private android.widget.LinearLayout buildCard() {
        android.widget.LinearLayout root = new android.widget.LinearLayout(this);
        root.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        root.setGravity(android.view.Gravity.CENTER_VERTICAL);
        root.setPadding(dp(16), dp(6), dp(12), dp(6));
        android.graphics.drawable.GradientDrawable bg = new android.graphics.drawable.GradientDrawable(
            android.graphics.drawable.GradientDrawable.Orientation.LEFT_RIGHT, new int[] { 0xFF14161F, 0xFF3B4FA8 });
        bg.setCornerRadius(dp(24));
        root.setBackground(bg);
        android.widget.LinearLayout left = new android.widget.LinearLayout(this);
        left.setOrientation(android.widget.LinearLayout.VERTICAL);
        cardTitle = new android.widget.TextView(this);
        cardTitle.setTextSize(12);
        cardTitle.setTextColor(0xCCFFFFFF);
        cardTitle.setSingleLine(true);
        cardMain = new android.widget.TextView(this);
        cardMain.setTextSize(26);
        cardMain.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        cardMain.setTextColor(android.graphics.Color.WHITE);
        cardMain.setSingleLine(true);
        cardMain.setIncludeFontPadding(false);
        try { cardMain.setFontFeatureSettings("tnum"); } catch (Exception ignored) { /* skip */ }
        left.addView(cardTitle);
        left.addView(cardMain);
        root.addView(left, new android.widget.LinearLayout.LayoutParams(0, android.view.ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        btnWork = new IconBtn(true);
        btnRest = new IconBtn(false);
        btnWork.setOnClickListener(v -> press(true));
        btnRest.setOnClickListener(v -> press(false));
        android.widget.LinearLayout.LayoutParams lw = new android.widget.LinearLayout.LayoutParams(dp(46), dp(46));
        android.widget.LinearLayout.LayoutParams lr = new android.widget.LinearLayout.LayoutParams(dp(46), dp(46));
        lw.leftMargin = dp(8);
        lr.leftMargin = dp(8);
        root.addView(btnWork, lw);
        root.addView(btnRest, lr);
        return root;
    }

    /** Баннери «Режимы дохода и опции для заказов» дар «Профиль» бо блоки вақти кор иваз мешавад (ҳамон ҷой ва андоза). */
    private void updateCard(List<Item> items) {
        if (!prefs.getBoolean("yp_on", false)) { hideCard(); return; }
        android.util.DisplayMetrics dm = getResources().getDisplayMetrics();
        Rect u = null;
        for (Item it : items) {
            if (!it.vis || !(has(it, "режимы дохода") || has(it, "теперь на главном"))) continue;
            if (u == null) u = new Rect(it.r); else u.union(it.r);
        }
        int left = (int) (0.043 * dm.widthPixels), right = (int) (0.957 * dm.widthPixels);
        int top, bottom;
        if (u != null) {
            int padV = u.height() >= dm.heightPixels * 0.06 ? 0 : (int) (0.02 * dm.heightPixels);
            top = u.top - padV; bottom = u.bottom + padV;
        } else {
            // Баннери Яндекс нест: блок дар зери ном (болои «Водитель такси») меистад. Ном — матни наздиктарин болои ин сатр.
            Item drv = null;
            for (Item it : items) if (it.vis && it.text.equalsIgnoreCase("Водитель такси")) { drv = it; break; }
            if (drv == null) { hideCard(); return; }
            Item name = null;
            for (Item it : items) {
                if (!it.vis || it == drv || it.r.bottom > drv.r.top || it.r.top < 0 || it.text.length() < 2) continue;
                if (name == null || it.r.bottom > name.r.bottom) name = it;
            }
            if (name == null) { hideCard(); return; }
            top = name.r.bottom + (int) (0.012 * dm.heightPixels);
            bottom = top + (int) (0.0765 * dm.heightPixels);
        }
        if (bottom - top < dp(60)) { int c = (top + bottom) / 2; top = c - dp(30); bottom = c + dp(30); }
        if (top < 0 || bottom > dm.heightPixels) { hideCard(); return; }
        if (wm == null) wm = (android.view.WindowManager) getSystemService(WINDOW_SERVICE);
        if (card == null) {
            card = buildCard();
            cardLp = new android.view.WindowManager.LayoutParams(right - left, bottom - top,
                android.view.WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                    | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                android.graphics.PixelFormat.TRANSLUCENT);
            cardLp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
            cardLp.x = left; cardLp.y = top;
            try { wm.addView(card, cardLp); } catch (Exception ex) {
                card = null;
                prefs.edit().putString("dbg_price", "card addView: " + ex).apply();
                return;
            }
            cardRect.set(left, top, right, bottom);
            refreshCard();
            handler.removeCallbacks(cardTick);
            handler.postDelayed(cardTick, 1000);
        } else if (cardRect.left != left || cardRect.top != top || cardRect.right != right || cardRect.bottom != bottom) {
            cardRect.set(left, top, right, bottom);
            cardLp.x = left; cardLp.y = top; cardLp.width = right - left; cardLp.height = bottom - top;
            try { wm.updateViewLayout(card, cardLp); } catch (Exception ignored) { /* removed */ }
        }
    }

    @Override
    public void onDestroy() {
        hidePrice();
        hideCard();
        handler.removeCallbacksAndMessages(null);
        if (prefs != null) prefs.unregisterOnSharedPreferenceChangeListener(listener);
        super.onDestroy();
    }
}
