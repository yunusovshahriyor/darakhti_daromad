package tj.darakhti.daromad;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.pm.PackageManager;
import android.os.PowerManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.Icon;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.HapticFeedbackConstants;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.TextView;

/**
 * Тугмаи шино («+») болои ҳамаи барномаҳо. Пахш — шакли «Хароҷот»; пахши дароз — сабти овозӣ.
 * Хондани экрани барномаҳои дигар нест: тугма танҳо ин барномаро мекушояд.
 */
public class OverlayService extends Service {
    public static boolean running = false;

    /** Санаи имрӯза (барои маблағи «Яндекс Про»). */
    public static String todayKey() {
        return new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date());
    }

    private static final String CHANNEL = "overlay";
    private static final String ACTION_STOP = "tj.darakhti.daromad.STOP_OVERLAY";
    private static final String ACTION_SYNC = "tj.darakhti.daromad.SYNC_OVERLAY";
    private static final int SIZE_DP = 56;

    private WindowManager wm;
    private View bubble;
    /** Блоки маблағи «Яндекс Про» (ҷои собит, бе кашидан): маблағ, сомонӣ, шумораи заказҳо. */
    private TextView label;
    private WindowManager.LayoutParams labelLp;
    private boolean onRight = true;
    private String currentPkg = "";
    private long lastEventTime = 0;
    private WindowManager.LayoutParams lp;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private SharedPreferences prefs;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private int dp(float v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            // Тугма дар огоҳинома: ҳарду функсияро хомӯш мекунем
            getSharedPreferences("overlay", MODE_PRIVATE).edit().putBoolean("bubble", false).putBoolean("appname", false).apply();
            stopSelf();
            return START_NOT_STICKY;
        }
        startAsForeground();
        running = true;
        syncViews();
        return START_STICKY;
    }

    /** Тугмаи шино («+») ва/ё блоки маблағи Яндекс Про: ду намуди ҷудогона. */
    private void syncViews() {
        prefs = getSharedPreferences("overlay", MODE_PRIVATE);
        if (wm == null) wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        boolean bubbleOn = prefs.getBoolean("bubble", false);
        boolean appOn = prefs.getBoolean("appname", false);
        if (!bubbleOn && !appOn) { stopSelf(); return; }
        if (bubbleOn && bubble == null) addBubble();
        if (!bubbleOn) removeBubble();
        if (appOn && label == null) addLabel();
        if (!appOn) removeLabel();
        handler.removeCallbacks(poll);
        if (appOn) handler.post(poll);
    }

    private void removeBubble() {
        if (bubble != null && wm != null) {
            try { wm.removeView(bubble); } catch (Exception ignored) { /* already removed */ }
        }
        bubble = null;
    }

    private void removeLabel() {
        if (label != null && wm != null) {
            try { wm.removeView(label); } catch (Exception ignored) { /* already removed */ }
        }
        label = null;
        lastShown = "";
    }

    /** Блоки маблағ: ҷои собит дар боло рост, фони нимшаффофи махсус, пахш намешавад (ба зери он мегузарад). */
    private void addLabel() {
        TextView t = new TextView(this);
        t.setTextColor(Color.WHITE);
        t.setTextSize(18);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setGravity(Gravity.END);
        t.setMaxLines(3);
        t.setIncludeFontPadding(false);
        t.setLineSpacing(0f, 1.1f);
        t.setPadding(dp(12), dp(8), dp(12), dp(8));
        GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[] { 0xB3141A2E, 0x8C2A3A66 });
        bg.setCornerRadius(dp(16));
        bg.setStroke(dp(1), 0x33FFFFFF);
        t.setBackground(bg);
        t.setVisibility(View.GONE);
        label = t;
        DisplayMetrics dm = getResources().getDisplayMetrics();
        int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
        labelLp = new WindowManager.LayoutParams(WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT, type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT);
        labelLp.gravity = Gravity.TOP | Gravity.END;
        labelLp.x = (int) (0.03f * dm.widthPixels);
        labelLp.y = (int) (0.095f * dm.heightPixels);
        try { wm.addView(t, labelLp); } catch (Exception ex) { label = null; }
    }

    // ---------- Номи барномаи кушодашуда ----------
    private final Runnable poll = new Runnable() {
        @Override
        public void run() {
            updateLabel();
            handler.postDelayed(this, 1000);
        }
    };

    /** Аз UsageStats охирин барномаи ба пеш омада (танҳо номи бастаи барнома, на мундариҷаи экран); дар худи экран танҳо дар «Яндекс Про» чизе менависем. */
    private void updateLabel() {
        if (label == null) return;
        PowerManager pmgr = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pmgr != null && !pmgr.isInteractive()) return;
        String name = "";
        try {
            UsageStatsManager usm = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
            long now = System.currentTimeMillis();
            UsageEvents ev = usm.queryEvents(lastEventTime > 0 ? lastEventTime : now - 6 * 60 * 60 * 1000L, now);
            UsageEvents.Event e = new UsageEvents.Event();
            while (ev.hasNextEvent()) {
                ev.getNextEvent(e);
                if (e.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) currentPkg = e.getPackageName();
                lastEventTime = Math.max(lastEventTime, e.getTimeStamp() + 1);
            }
            if (!currentPkg.isEmpty()) {
                PackageManager pm = getPackageManager();
                try { name = pm.getApplicationLabel(pm.getApplicationInfo(currentPkg, 0)).toString(); }
                catch (PackageManager.NameNotFoundException ex) { name = currentPkg; }
                // «Яндекс Про»: номи бастаи дурустро ёд мегирем (хидмати хондан ба ҳамин барнома маҳдуд мешавад)
                String low = name.toLowerCase(java.util.Locale.ROOT);
                if ((low.contains("яндекс про") || low.contains("yandex pro")) && !currentPkg.equals(prefs.getString("yp_pkg", ""))) {
                    prefs.edit().putString("yp_pkg", currentPkg).apply();
                }
                prefs.edit().putString("cur_pkg", currentPkg).putString("cur_name", name).apply();
            }
        } catch (SecurityException ex) {
            name = ""; // иҷозати «Дастрасӣ ба маълумоти истифода» нест
        }
        // Танҳо дар саҳифаи асосии «Яндекс Про»: маблағи имрӯза, сомонӣ бо қурби имрӯза ва шумораи заказҳо
        boolean inYp = prefs.getBoolean("yp_on", false) && currentPkg.equals(prefs.getString("yp_pkg", ScreenReaderService.TARGET_PKG))
            && prefs.getBoolean("yp_main", true);
        if (!inYp) {
            if (label.getVisibility() != View.GONE) label.setVisibility(View.GONE);
            lastShown = "";
            return;
        }
        ensureRate();
        boolean today = todayKey().equals(prefs.getString("yp_date", ""));
        String amt = today && !prefs.getString("yp_amount", "").isEmpty() ? prefs.getString("yp_amount", "") : "0 ₽"; // рӯзи нав — аз сифр
        String tjs = toSomoni(amt);
        int orders = todayKey().equals(prefs.getString("yp_orders_date", "")) ? prefs.getInt("yp_orders", 0) : 0;
        String full = amt + (tjs.isEmpty() ? "" : "\n" + tjs) + "\nЗаказҳо: " + orders;
        if (!full.equals(lastShown)) {
            lastShown = full;
            android.text.SpannableStringBuilder sb = new android.text.SpannableStringBuilder(amt);
            int n = sb.length();
            if (!tjs.isEmpty()) {
                sb.append('\n').append(tjs);
                sb.setSpan(new android.text.style.RelativeSizeSpan(0.82f), n + 1, sb.length(), android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                sb.setSpan(new android.text.style.ForegroundColorSpan(0xFFC9D6FF), n + 1, sb.length(), android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            }
            int m = sb.length();
            sb.append("\nЗаказҳо: ").append(String.valueOf(orders));
            sb.setSpan(new android.text.style.RelativeSizeSpan(0.68f), m + 1, sb.length(), android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            sb.setSpan(new android.text.style.ForegroundColorSpan(0xCCFFFFFF), m + 1, sb.length(), android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            label.setText(sb);
        }
        if (label.getVisibility() != View.VISIBLE) label.setVisibility(View.VISIBLE);
    }

    // ---------- Қурби рубл → сомонӣ (барои маблағи «Яндекс Про») ----------
    private String lastShown = "";
    private boolean fxBusy = false;
    private long fxTried = 0;

    /** «7 359,48 ₽» → «≈ 937,12 смн» бо қурби имрӯза; агар қурб ҳанӯз нест — холӣ. */
    private String toSomoni(String amount) {
        try {
            double rate = Double.parseDouble(prefs.getString("fx_rate", "0"));
            if (rate <= 0) return "";
            double rub = Double.parseDouble(amount.replaceAll("[^0-9,.-]", "").replace(',', '.'));
            double tjs = rub * rate;
            String[] p = String.format(java.util.Locale.US, "%.2f", tjs).split("\\.");
            return p[0].replaceAll("\\B(?=(\\d{3})+(?!\\d))", "\u00a0") + "," + p[1] + " с";
        } catch (Exception e) {
            return "";
        }
    }

    /** Қурби имрӯзаи 1 ₽ = X смн: рӯзе як маротиба аз Интернет (ду манбаъ), дар `fx_rate`/`fx_date` нигоҳ дошта мешавад. */
    private void ensureRate() {
        String today = todayKey();
        long now = System.currentTimeMillis();
        if (today.equals(prefs.getString("fx_date", "")) || fxBusy || now - fxTried < 5 * 60 * 1000L) return;
        fxBusy = true;
        fxTried = now;
        new Thread(() -> {
            try {
                double r = fetchRate();
                if (r > 0) prefs.edit().putString("fx_rate", String.valueOf(r)).putString("fx_date", today).apply();
            } catch (Exception ignored) {
                /* дафъаи дигар (баъд аз 5 дақиқа) */
            } finally {
                fxBusy = false;
            }
        }).start();
    }

    private String http(String url) throws Exception {
        java.net.HttpURLConnection c = (java.net.HttpURLConnection) new java.net.URL(url).openConnection();
        c.setConnectTimeout(8000);
        c.setReadTimeout(8000);
        try (java.io.BufferedReader br = new java.io.BufferedReader(new java.io.InputStreamReader(c.getInputStream(), "UTF-8"))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
            return sb.toString();
        } finally {
            c.disconnect();
        }
    }

    private double fetchRate() throws Exception {
        try {
            org.json.JSONObject j = new org.json.JSONObject(http("https://open.er-api.com/v6/latest/RUB"));
            double r = j.getJSONObject("rates").getDouble("TJS");
            if (r > 0) return r;
        } catch (Exception ignored) {
            /* манбаи дуюм */
        }
        org.json.JSONObject j = new org.json.JSONObject(http("https://latest.currency-api.pages.dev/v1/currencies/rub.json"));
        return j.getJSONObject("rub").getDouble("tjs");
    }

    private void startAsForeground() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Тугмаи сабти зуд", NotificationManager.IMPORTANCE_MIN));
        }
        int piFlags = PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT;
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class), piFlags);
        PendingIntent stop = PendingIntent.getService(this, 1, new Intent(this, OverlayService.class).setAction(ACTION_STOP), piFlags);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        b.setSmallIcon(android.R.drawable.ic_input_add)
            .setContentTitle("Дарахти даромад")
            .setContentText("Тугмаи сабти зуд / Яндекс Про фаъол аст")
            .setContentIntent(open)
            .setOngoing(true)
            .addAction(new Notification.Action.Builder(Icon.createWithResource(this, android.R.drawable.ic_menu_close_clear_cancel), "Ғайрифаъол кардан", stop).build());
        Notification n = b.build();
        if (Build.VERSION.SDK_INT >= 34) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else startForeground(1, n);
    }

    private void addBubble() {
        final int size = dp(SIZE_DP);
        FrameLayout root = new FrameLayout(this);
        GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[] { Color.parseColor("#47D9A0"), Color.parseColor("#2A9D73") });
        bg.setShape(GradientDrawable.OVAL);
        root.setBackground(bg);
        root.setElevation(dp(6));
        TextView plus = new TextView(this);
        plus.setText("+");
        plus.setTextColor(Color.WHITE);
        plus.setTextSize(30);
        plus.setTypeface(Typeface.DEFAULT_BOLD);
        plus.setGravity(Gravity.CENTER);
        root.addView(plus, new FrameLayout.LayoutParams(size, size, Gravity.CENTER));
        bubble = root;

        DisplayMetrics dm = getResources().getDisplayMetrics();
        int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
        lp = new WindowManager.LayoutParams(size, size, type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL, PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.START;
        onRight = prefs.getBoolean("right", true);
        lp.x = onRight ? dm.widthPixels - size - dp(8) : dp(8);
        lp.y = prefs.getInt("y", (int) (dm.heightPixels * 0.55f));
        wm.addView(bubble, lp);

        final int slop = ViewConfiguration.get(this).getScaledTouchSlop();
        final boolean[] longFired = { false };
        final Runnable onLong = () -> {
            longFired[0] = true;
            bubble.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS);
            open("voice");
        };
        bubble.setOnTouchListener(new View.OnTouchListener() {
            private float downX, downY;
            private int startX, startY;
            private boolean moved;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        downX = e.getRawX(); downY = e.getRawY(); startX = lp.x; startY = lp.y;
                        moved = false; longFired[0] = false;
                        handler.postDelayed(onLong, 550);
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        float dx = e.getRawX() - downX, dy = e.getRawY() - downY;
                        if (!moved && (Math.abs(dx) > slop || Math.abs(dy) > slop)) { moved = true; handler.removeCallbacks(onLong); }
                        if (moved) {
                            lp.x = startX + (int) dx; lp.y = startY + (int) dy;
                            wm.updateViewLayout(bubble, lp);
                        }
                        return true;
                    case MotionEvent.ACTION_UP:
                    case MotionEvent.ACTION_CANCEL:
                        handler.removeCallbacks(onLong);
                        if (moved) snapToEdge();
                        else if (!longFired[0] && e.getAction() == MotionEvent.ACTION_UP) open("expense");
                        return true;
                    default:
                        return false;
                }
            }
        });
    }

    /** Тугма ба канори наздиктарини экран мечаспад ва ҷойгиршавӣ нигоҳ дошта мешавад. */
    private void snapToEdge() {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        int w = bubble.getWidth() > 0 ? bubble.getWidth() : dp(SIZE_DP);
        onRight = lp.x + w / 2 >= dm.widthPixels / 2;
        lp.x = onRight ? dm.widthPixels - w - dp(8) : dp(8);
        lp.y = Math.max(dp(24), Math.min(lp.y, dm.heightPixels - dp(SIZE_DP) - dp(48)));
        wm.updateViewLayout(bubble, lp);
        prefs.edit().putInt("y", lp.y).putBoolean("right", onRight).apply();
    }

    private void open(String route) {
        Intent i = new Intent(this, MainActivity.class);
        i.putExtra("route", route);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(i);
    }

    @Override
    public void onDestroy() {
        running = false;
        handler.removeCallbacksAndMessages(null);
        removeBubble();
        removeLabel();
        super.onDestroy();
    }
}
