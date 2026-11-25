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
    /** Дар реҷаи «номи барнома» — худи тугма матн аст (ном ба ҷои «+»). */
    private TextView label;
    private boolean appMode = false;
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

    /** Тугмаи шино ва/ё номи барнома: як намуд дар экран. Агар «номи барнома» фаъол бошад, ном ба ҷои тугмаи сабзи «+» менависад. */
    private void syncViews() {
        prefs = getSharedPreferences("overlay", MODE_PRIVATE);
        if (wm == null) wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        boolean bubbleOn = prefs.getBoolean("bubble", false);
        boolean appOn = prefs.getBoolean("appname", false);
        if (!bubbleOn && !appOn) { stopSelf(); return; }
        if (bubble != null && appMode != appOn) removeBubble();
        if (bubble == null) { addBubble(appOn); keepOnScreen(); }
        handler.removeCallbacks(poll);
        if (appOn) handler.post(poll);
    }

    private void removeBubble() {
        if (bubble != null && wm != null) {
            try { wm.removeView(bubble); } catch (Exception ignored) { /* already removed */ }
        }
        bubble = null;
        label = null;
    }

    // ---------- Номи барномаи кушодашуда ----------
    private final Runnable poll = new Runnable() {
        @Override
        public void run() {
            updateLabel();
            handler.postDelayed(this, 1000);
        }
    };

    /** Аз UsageStats охирин барномаи ба пеш омада (танҳо номи бастаи барнома, на мундариҷаи экран). */
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
        // «Яндекс Про»: ба ҷои ном маблағи имрӯза (агар хондашуда бошад)
        if (prefs.getBoolean("yp_on", false) && currentPkg.equals(prefs.getString("yp_pkg", ScreenReaderService.TARGET_PKG))
            && todayKey().equals(prefs.getString("yp_date", "")) && !prefs.getString("yp_amount", "").isEmpty()) {
            name = "💰 " + prefs.getString("yp_amount", "");
        }
        String shown = name.isEmpty() ? "+" : name;
        if (!shown.contentEquals(label.getText())) {
            label.setText(shown);
            keepOnScreen();
        }
    }

    /** Ном дарозии тугмаро иваз мекунад: аз экран набарояд (канори чап ё рост). */
    private void keepOnScreen() {
        if (bubble == null) return;
        bubble.post(() -> {
            if (bubble == null || lp == null) return;
            DisplayMetrics dm = getResources().getDisplayMetrics();
            int w = bubble.getWidth();
            lp.x = onRight ? dm.widthPixels - w - dp(8) : dp(8);
            try { wm.updateViewLayout(bubble, lp); } catch (Exception ignored) { /* view removed */ }
        });
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
            .setContentText("Тугмаи сабти зуд / номи барнома фаъол аст")
            .setContentIntent(open)
            .setOngoing(true)
            .addAction(new Notification.Action.Builder(Icon.createWithResource(this, android.R.drawable.ic_menu_close_clear_cancel), "Ғайрифаъол кардан", stop).build());
        Notification n = b.build();
        if (Build.VERSION.SDK_INT >= 34) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else startForeground(1, n);
    }

    private void addBubble(boolean app) {
        appMode = app;
        final int size = dp(SIZE_DP);
        if (app) {
            // Ном ба ҷои тугмаи сабз: матни сафед бо соя, фони шаффоф
            TextView t = new TextView(this);
            t.setText("+");
            t.setTextColor(Color.WHITE);
            t.setTextSize(16);
            t.setTypeface(Typeface.DEFAULT_BOLD);
            t.setShadowLayer(8f, 0f, 1f, Color.BLACK);
            t.setGravity(Gravity.CENTER);
            t.setSingleLine(true);
            t.setEllipsize(android.text.TextUtils.TruncateAt.END);
            t.setMaxWidth(dp(240));
            t.setMinWidth(dp(40));
            t.setMinHeight(dp(40));
            t.setPadding(dp(10), dp(6), dp(10), dp(6));
            t.setBackgroundColor(Color.TRANSPARENT);
            label = t;
            bubble = t;
        } else {
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
        }

        DisplayMetrics dm = getResources().getDisplayMetrics();
        int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
        lp = new WindowManager.LayoutParams(app ? WindowManager.LayoutParams.WRAP_CONTENT : size, app ? WindowManager.LayoutParams.WRAP_CONTENT : size, type,
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
        super.onDestroy();
    }
}
