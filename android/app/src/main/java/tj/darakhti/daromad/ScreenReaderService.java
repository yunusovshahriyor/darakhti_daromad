package tj.darakhti.daromad;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.SharedPreferences;
import android.graphics.Rect;
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

    private static boolean has(Item it, String w) {
        return it.text.toLowerCase(java.util.Locale.ROOT).contains(w);
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

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (prefs != null) prefs.unregisterOnSharedPreferenceChangeListener(listener);
        super.onDestroy();
    }
}
