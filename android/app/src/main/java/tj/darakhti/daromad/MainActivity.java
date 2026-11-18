package tj.darakhti.daromad;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OverlayPlugin.class);
        super.onCreate(savedInstanceState);
    }

    /** Тугмаи шино («+») барномаро бо `route` мекушояд: «expense» | «income» | «voice». */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent == null) return;
        String route = intent.getStringExtra("route");
        if (route == null || route.isEmpty()) return;
        intent.removeExtra("route");
        OverlayPlugin.pending = route;
        // Агар саҳифа аллакай кушода бошад, фавран хабар медиҳем (дар оғози сард — саҳифа худаш `takePending`-ро мепурсад)
        if (getBridge() != null) getBridge().eval("window.dispatchEvent(new CustomEvent('native-open'))", null);
    }
}
