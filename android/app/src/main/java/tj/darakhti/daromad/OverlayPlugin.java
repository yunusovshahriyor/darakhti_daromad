package tj.darakhti.daromad;

import android.Manifest;
import android.app.AppOpsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Пули JS ↔ Android барои тугмаи шино («поверх других приложений»). */
@CapacitorPlugin(name = "Overlay")
public class OverlayPlugin extends Plugin {
    /** Амали интизорӣ аз тугмаи шино: «expense» | «income» | «voice». */
    public static String pending = "";

    private JSObject value(Object v) {
        JSObject r = new JSObject();
        r.put("value", v);
        return r;
    }

    @PluginMethod
    public void canDraw(PluginCall call) {
        call.resolve(value(Settings.canDrawOverlays(getContext())));
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Context ctx = getContext();
        Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + ctx.getPackageName()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx.startActivity(i);
        call.resolve();
    }

    private android.content.SharedPreferences prefs() {
        return getContext().getSharedPreferences("overlay", Context.MODE_PRIVATE);
    }

    private void sync() {
        Context ctx = getContext();
        ContextCompat.startForegroundService(ctx, new Intent(ctx, OverlayService.class).setAction("tj.darakhti.daromad.SYNC_OVERLAY"));
    }

    @PluginMethod
    public void start(PluginCall call) {
        Context ctx = getContext();
        if (!Settings.canDrawOverlays(ctx)) {
            call.reject("permission");
            return;
        }
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            && getActivity() != null) {
            ActivityCompat.requestPermissions(getActivity(), new String[] { Manifest.permission.POST_NOTIFICATIONS }, 1001);
        }
        prefs().edit().putBoolean("bubble", true).apply();
        sync();
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        prefs().edit().putBoolean("bubble", false).apply();
        if (OverlayService.running) sync();
        call.resolve();
    }

    @PluginMethod
    public void isRunning(PluginCall call) {
        call.resolve(value(OverlayService.running && prefs().getBoolean("bubble", false)));
    }

    // ---------- Номи барномаи кушодашуда ----------
    @PluginMethod
    public void hasUsageAccess(PluginCall call) {
        Context ctx = getContext();
        AppOpsManager ops = (AppOpsManager) ctx.getSystemService(Context.APP_OPS_SERVICE);
        int mode = ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), ctx.getPackageName());
        call.resolve(value(mode == AppOpsManager.MODE_ALLOWED));
    }

    @PluginMethod
    public void requestUsageAccess(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    @PluginMethod
    public void setAppName(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        Context ctx = getContext();
        if (on && !Settings.canDrawOverlays(ctx)) { call.reject("permission"); return; }
        prefs().edit().putBoolean("appname", on).apply();
        if (on || OverlayService.running) sync();
        call.resolve();
    }

    @PluginMethod
    public void isAppName(PluginCall call) {
        call.resolve(value(OverlayService.running && prefs().getBoolean("appname", false)));
    }

    /** Амали охирини тугмаи шино (як маротиба): саҳифа онро ҳангоми кушодан ё баргашт мепурсад. */
    @PluginMethod
    public void takePending(PluginCall call) {
        String p = pending;
        pending = "";
        call.resolve(value(p));
    }

    // ---------- Маблағи «Яндекс Про» ----------
    @PluginMethod
    public void hasScreenReader(PluginCall call) {
        String enabled = Settings.Secure.getString(getContext().getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        call.resolve(value(enabled != null && enabled.contains(ScreenReaderService.class.getName())));
    }

    @PluginMethod
    public void requestScreenReader(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    @PluginMethod
    public void setYandex(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        prefs().edit().putBoolean("yp_on", on).apply();
        call.resolve();
    }

    /** Комиссияи Яндекс ва парк (%): аз маблағи ҳар фармоиш кам карда мешавад. */
    @PluginMethod
    public void setYandexFees(PluginCall call) {
        String ya = String.valueOf(call.getString("yandex", "18.3")).replace(',', '.');
        String park = String.valueOf(call.getString("park", "2")).replace(',', '.');
        prefs().edit().putString("yp_fee_ya", ya).putString("yp_fee_park", park).apply();
        call.resolve();
    }

    /** Лимити кор (соат) ва истироҳат (соат) — қоидаҳои Яндекс. */
    @PluginMethod
    public void setWorkLimits(PluginCall call) {
        prefs().edit().putString("wk_limit_h", String.valueOf(call.getString("limit", "12")).replace(',', '.'))
            .putString("wk_rest_h", String.valueOf(call.getString("rest", "6")).replace(',', '.')).apply();
        call.resolve();
    }

    /** Ҳисобкунакро аз нав оғоз кардан (ҳолат ва вақти кор тоза мешавад). */
    @PluginMethod
    public void resetWork(PluginCall call) {
        prefs().edit().remove("wk_state").putLong("wk_worked", 0).putLong("wk_since", 0).apply();
        call.resolve();
    }

    @PluginMethod
    public void getYandex(PluginCall call) {
        JSObject r = new JSObject();
        r.put("enabled", prefs().getBoolean("yp_on", false));
        r.put("amount", prefs().getString("yp_amount", ""));
        r.put("date", prefs().getString("yp_date", ""));
        // Ташхис (танҳо барои намоиш дар танзимот)
        r.put("wkState", prefs().getString("wk_state", ""));
        r.put("wkWorked", prefs().getLong("wk_worked", 0));
        r.put("wkSince", prefs().getLong("wk_since", 0));
        r.put("wkLimit", prefs().getString("wk_limit_h", "12"));
        r.put("wkRest", prefs().getString("wk_rest_h", "6"));
        r.put("power", prefs().getString("dbg_power", ""));
        r.put("feeYa", prefs().getString("yp_fee_ya", "18.3"));
        r.put("feePark", prefs().getString("yp_fee_park", "2"));
        r.put("last", prefs().getString("yp_last", ""));
        r.put("events", prefs().getInt("dbg_events", 0));
        r.put("items", prefs().getInt("dbg_items", 0));
        r.put("texts", prefs().getString("dbg_texts", ""));
        r.put("ypPkg", prefs().getString("yp_pkg", ""));
        r.put("curPkg", prefs().getString("cur_pkg", ""));
        r.put("curName", prefs().getString("cur_name", ""));
        call.resolve(r);
    }
}
