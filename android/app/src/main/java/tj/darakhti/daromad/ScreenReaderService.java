package tj.darakhti.daromad;

import android.accessibilityservice.AccessibilityService;
import android.content.SharedPreferences;
import android.graphics.Rect;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Маблағи имрӯзаи «Яндекс Про» аз саҳифаи «Деньги»: танҳо экрани ҳамин барнома мехонда мешавад
 * (дар `accessibility_service_config.xml` `packageNames` маҳдуд шудааст); маблағ танҳо дар ин телефон нигоҳ дошта мешавад.
 */
public class ScreenReaderService extends AccessibilityService {
    /** Номи баста: «Яндекс Про» (Таксометр). */
    public static final String TARGET_PKG = "ru.yandex.taximeter";
    private static final Pattern MONEY = Pattern.compile("^-?\\d[\\d\\s\\u00a0\\u202f]*[.,]\\d{1,2}\\s*[₽Р]?$");

    private final Handler handler = new Handler(Looper.getMainLooper());
    private long last = 0;
    private boolean scheduled = false;

    private static class Item {
        final String text;
        final Rect r;
        Item(String text, Rect r) { this.text = text; this.r = r; }
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
        if (e == null || e.getPackageName() == null || !TARGET_PKG.contentEquals(e.getPackageName())) return;
        if (!getSharedPreferences("overlay", MODE_PRIVATE).getBoolean("yp_on", false)) return;
        // Кам-кам хондан: бештар аз як маротиба дар 0,7 сония не, аммо ҳолати охирин ҳатман хонда мешавад
        long wait = Math.max(0, 700 - (SystemClock.uptimeMillis() - last));
        if (!scheduled) { scheduled = true; handler.postDelayed(task, wait); }
    }

    @Override
    public void onInterrupt() { }

    private void collect(AccessibilityNodeInfo n, List<Item> out, int depth) {
        if (n == null || depth > 40) return;
        if (n.isVisibleToUser()) {
            CharSequence t = n.getText();
            if (t == null || t.length() == 0) t = n.getContentDescription();
            if (t != null && t.length() > 0) {
                Rect r = new Rect();
                n.getBoundsInScreen(r);
                out.add(new Item(t.toString().trim(), r));
            }
        }
        for (int i = 0; i < n.getChildCount(); i++) collect(n.getChild(i), out, depth + 1);
    }

    private void read() {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return;
        if (root.getPackageName() == null || !TARGET_PKG.contentEquals(root.getPackageName())) return;
        List<Item> items = new ArrayList<>();
        collect(root, items, 0);
        Item today = null;
        boolean money = false;
        for (Item it : items) {
            if (it.text.equalsIgnoreCase("Сегодня")) today = it;
            if (it.text.equalsIgnoreCase("История заказов")) money = true;
        }
        // Танҳо саҳифаи «Деньги»: ҳам «Сегодня», ҳам «История заказов»
        if (today == null || !money) return;
        Item best = null;
        int bestDist = Integer.MAX_VALUE;
        for (Item it : items) {
            if (!MONEY.matcher(it.text).matches()) continue;
            int dist = today.r.top - it.r.bottom;
            if (dist < -30 || dist > 500 || it.r.left > today.r.right) continue;
            if (Math.abs(dist) < bestDist) { best = it; bestDist = Math.abs(dist); }
        }
        if (best == null) return;
        String amt = best.text.replaceAll("[\\s\\u00a0\\u202f]+", " ").trim();
        if (!amt.endsWith("₽") && !amt.endsWith("Р")) amt += " ₽";
        getSharedPreferences("overlay", MODE_PRIVATE).edit()
            .putString("yp_amount", amt).putString("yp_date", OverlayService.todayKey()).apply();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}
