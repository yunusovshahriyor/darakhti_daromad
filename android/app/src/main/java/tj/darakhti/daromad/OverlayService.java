package tj.darakhti.daromad;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
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
    private static final String CHANNEL = "overlay";
    private static final String ACTION_STOP = "tj.darakhti.daromad.STOP_OVERLAY";
    private static final int SIZE_DP = 56;

    private WindowManager wm;
    private View bubble;
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
            stopSelf();
            return START_NOT_STICKY;
        }
        startAsForeground();
        if (bubble == null) addBubble();
        running = true;
        return START_STICKY;
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
            .setContentText("Тугмаи сабти зуд фаъол аст")
            .setContentIntent(open)
            .setOngoing(true)
            .addAction(new Notification.Action.Builder(Icon.createWithResource(this, android.R.drawable.ic_menu_close_clear_cancel), "Ғайрифаъол кардан", stop).build());
        Notification n = b.build();
        if (Build.VERSION.SDK_INT >= 34) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else startForeground(1, n);
    }

    private void addBubble() {
        wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        prefs = getSharedPreferences("overlay", MODE_PRIVATE);
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
        lp.x = prefs.getInt("x", dm.widthPixels - size - dp(8));
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
        int size = dp(SIZE_DP);
        lp.x = (lp.x + size / 2 < dm.widthPixels / 2) ? dp(8) : dm.widthPixels - size - dp(8);
        lp.y = Math.max(dp(24), Math.min(lp.y, dm.heightPixels - size - dp(48)));
        wm.updateViewLayout(bubble, lp);
        prefs.edit().putInt("x", lp.x).putInt("y", lp.y).apply();
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
        if (bubble != null && wm != null) {
            try { wm.removeView(bubble); } catch (Exception ignored) { /* already removed */ }
        }
        bubble = null;
        super.onDestroy();
    }
}
