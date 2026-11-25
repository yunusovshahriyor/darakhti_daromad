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

    // ---------- Вақти кор: «дар линия» / «не дар линия» ----------
    private long lastShot = 0;
    private int pixelStreak = 0;
    private int pixelLast = 0;

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
        Item(String text, Rect r) { this.text = text; this.r = r; }
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
        // Пахши тугмаи «Уйти с линии» / «Выйти на линию»: ҳолат фавран иваз мешавад
        if (e.getEventType() == AccessibilityEvent.TYPE_VIEW_CLICKED) {
            StringBuilder t = new StringBuilder();
            if (e.getText() != null) for (CharSequence c : e.getText()) t.append(c).append(' ');
            if (e.getContentDescription() != null) t.append(e.getContentDescription());
            String tl = t.toString().toLowerCase(java.util.Locale.ROOT);
            if (tl.contains("уйти с линии")) setOnline(false);
            else if (tl.contains("выйти на линию")) setOnline(true);
        }
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
            out.add(new Item(t.toString().replace('\n', ' ').trim(), r));
        }
        for (int i = 0; i < n.getChildCount(); i++) collect(n.getChild(i), out, depth + 1);
    }

    private void read() {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) { prefs.edit().putString("dbg_texts", "(root=null)").apply(); return; }
        if (root.getPackageName() == null || !target().contentEquals(root.getPackageName())) return;
        List<Item> items = new ArrayList<>();
        collect(root, items, 0);

        // Ташхис: чанд матни аввал (танҳо дар ин телефон, барои санҷиш дар танзимот)
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < items.size() && sb.length() < 400; i++) sb.append(items.get(i).text).append(" | ");
        prefs.edit().putInt("dbg_items", items.size()).putString("dbg_texts", sb.toString()).apply();

        // Диалогҳои Яндекс Про: ҳолати воқеиро нишон медиҳанд (баъд аз пахши ⏻)
        for (Item it : items) {
            if (has(it, "перестать получать заказы")) { setOnline(true); break; }
            if (has(it, "готовы получать заказы")) { setOnline(false); break; }
        }
        for (Item it : items) if (has(it, "офлайн")) { setOnline(false); break; } // панели поёнӣ «Офлайн / Выйти на линию»
        syncRemaining(items);
        shot();

        // «Заказ завершён»: маблағи фармоиш (минус комиссия) худкор ба маблағи имрӯза илова мешавад, бе гузаштан ба «Деньги»
        int doneIdx = -1;
        for (int i = 0; i < items.size(); i++) if (has(items.get(i), "заказ заверш")) { doneIdx = i; break; }
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
        double base = today.equals(prefs.getString("yp_date", "")) ? Math.max(0, num(prefs.getString("yp_amount", "0"))) : 0;
        prefs.edit().putString("yp_amount", fmtRub(base + net)).putString("yp_date", today)
            .putString("yp_last", fmtRub(gross) + " → +" + fmtRub(net)).apply();
    }

    private static final Pattern YA_TIME = Pattern.compile("^\\s*(?:(\\d+)\\s*ч)?\\s*(?:(\\d+)\\s*м)?\\s*$");

    /** «1ч 21м» → миллисония; агар шакл дигар бошад — -1. */
    private static long yaTime(String t) {
        Matcher m = YA_TIME.matcher(t.replace('\u00a0', ' ').replace('\u202f', ' ').toLowerCase(java.util.Locale.ROOT));
        if (!m.matches() || (m.group(1) == null && m.group(2) == null)) return -1;
        long h = m.group(1) == null ? 0 : Long.parseLong(m.group(1));
        long mi = m.group(2) == null ? 0 : Long.parseLong(m.group(2));
        return (h * 60 + mi) * 60000L;
    }

    /**
     * «Пора отдохнуть» / «Осталось времени 1ч 21м»: вақти боқимондаи худи Яндекс. Ҳисоби мо ба он мувофиқ мешавад
     * (кори ҷамъшуда = лимит − боқимонда), агар фарқ кунад.
     */
    private void syncRemaining(List<Item> items) {
        int idx = -1;
        boolean rest = false;
        for (int i = 0; i < items.size(); i++) {
            if (has(items.get(i), "осталось времени")) idx = i;
            if (has(items.get(i), "отдохнуть")) rest = true;
        }
        if (idx < 0 || !rest) return; // танҳо саҳифаи «Пора отдохнуть»
        Item base = items.get(idx);
        long rem = -1;
        String txt = "";
        for (Item it : items) {
            if (it == base) continue;
            long t = yaTime(it.text);
            if (t >= 0 && Math.abs(it.r.centerY() - base.r.centerY()) < 90 && it.r.left > base.r.left) { rem = t; txt = it.text; break; }
        }
        if (rem < 0) {
            for (int i = idx + 1; i <= Math.min(items.size() - 1, idx + 3); i++) {
                long t = yaTime(items.get(i).text);
                if (t >= 0) { rem = t; txt = items.get(i).text; break; }
            }
        }
        if (rem < 0) return;
        long now = System.currentTimeMillis();
        long limit = (long) (num(prefs.getString("wk_limit_h", "12")) * 3600_000L);
        if (limit <= 0) limit = 12 * 3600_000L;
        long worked = Math.max(0, limit - rem);
        SharedPreferences.Editor e = prefs.edit().putLong("wk_worked", worked).putString("wk_ya_left", txt).putLong("wk_sync", now);
        if ("on".equals(prefs.getString("wk_state", ""))) e.putLong("wk_since", now); // ҳисоб аз ҳоло ба ҳисоби Яндекс идома мекунад
        e.apply();
    }

    /** Тугмаи ⏻ (боло чап): зард — дар линия, хокистарӣ — не. Скриншот ҳар 4 сония, танҳо Android 11+. */
    private void shot() {
        if (Build.VERSION.SDK_INT < 30) return;
        long now = SystemClock.uptimeMillis();
        if (now - lastShot < 4000) return;
        lastShot = now;
        try {
            takeScreenshot(Display.DEFAULT_DISPLAY, getMainExecutor(), new TakeScreenshotCallback() {
                @Override
                public void onSuccess(ScreenshotResult r) {
                    try {
                        Bitmap hw = Bitmap.wrapHardwareBuffer(r.getHardwareBuffer(), r.getColorSpace());
                        if (hw != null) {
                            Bitmap b = hw.copy(Bitmap.Config.ARGB_8888, false);
                            if (b != null) classifyPower(b);
                        }
                        r.getHardwareBuffer().close();
                    } catch (Exception ignored) { /* skip */ }
                }

                @Override
                public void onFailure(int errorCode) { prefs.edit().putInt("dbg_shot_err", errorCode).apply(); }
            });
        } catch (Exception ignored) { /* skip */ }
    }

    /** 8 нуқта дар гирдгарди тугмаи ⏻: агар ≥6 нуқта зард (дар линия) ё хокистарӣ (не) бошанд, ва ду маротиба пай дар пай — ҳолат иваз мешавад. */
    private void classifyPower(Bitmap b) {
        int w = b.getWidth(), h = b.getHeight();
        // Тугма ҷойи собит надорад: бо баннери «Пора отдохнуть» поёнтар меравад. Ду ҷойи эҳтимолӣ + ҳалқаи сиёҳи гирду атроф тасдиқ мекунад.
        double[] ys = { 0.075, 0.1125 };
        int cls = 0;
        String dbg = "";
        for (double fy : ys) {
            int cx = (int) (0.097 * w), cy = (int) (fy * h);
            int dark = 0, yellow = 0, grey = 0;
            for (int i = 0; i < 8; i++) {
                double a = i * Math.PI / 4;
                if (ringDark(b, cx, cy, a, w)) dark++;
                int x = cx + (int) Math.round(0.05 * w * Math.cos(a)), y = cy + (int) Math.round(0.05 * w * Math.sin(a));
                if (x < 0 || y < 0 || x >= w || y >= h) continue;
                int p = b.getPixel(x, y);
                int r = (p >> 16) & 255, g = (p >> 8) & 255, bl = p & 255;
                if (r > 200 && g > 160 && bl < 120) yellow++;
                else if (r > 150 && Math.abs(r - g) < 25 && Math.abs(g - bl) < 30) grey++;
            }
            dbg += "y=" + fy + ":dark" + dark + "/yel" + yellow + "/gry" + grey + " ";
            if (dark < 6) continue; // тугма ин ҷо нест
            if (yellow >= 6) { cls = 1; break; }
            if (grey >= 6) { cls = 2; break; }
        }
        prefs.edit().putString("dbg_power", dbg).apply();
        if (cls == 0) { pixelStreak = 0; return; }
        pixelStreak = cls == pixelLast ? pixelStreak + 1 : 1;
        pixelLast = cls;
        if (pixelStreak >= 2) setOnline(cls == 1);
    }

    /** Ҳалқаи сиёҳи берунии тугмаи ⏻ дар кунҷи `a`. */
    private static boolean ringDark(Bitmap b, int cx, int cy, double a, int w) {
        for (double rr : new double[] { 0.068, 0.072, 0.076 }) {
            int x = cx + (int) Math.round(rr * w * Math.cos(a)), y = cy + (int) Math.round(rr * w * Math.sin(a));
            if (x < 0 || y < 0 || x >= b.getWidth() || y >= b.getHeight()) continue;
            int p = b.getPixel(x, y);
            if (((p >> 16) & 255) < 70 && ((p >> 8) & 255) < 70 && (p & 255) < 70) return true;
        }
        return false;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (prefs != null) prefs.unregisterOnSharedPreferenceChangeListener(listener);
        super.onDestroy();
    }
}
