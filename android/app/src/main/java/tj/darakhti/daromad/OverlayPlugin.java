package tj.darakhti.daromad;

import android.Manifest;
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
        ContextCompat.startForegroundService(ctx, new Intent(ctx, OverlayService.class));
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Context ctx = getContext();
        ctx.stopService(new Intent(ctx, OverlayService.class));
        call.resolve();
    }

    @PluginMethod
    public void isRunning(PluginCall call) {
        call.resolve(value(OverlayService.running));
    }

    /** Амали охирини тугмаи шино (як маротиба): саҳифа онро ҳангоми кушодан ё баргашт мепурсад. */
    @PluginMethod
    public void takePending(PluginCall call) {
        String p = pending;
        pending = "";
        call.resolve(value(p));
    }
}
