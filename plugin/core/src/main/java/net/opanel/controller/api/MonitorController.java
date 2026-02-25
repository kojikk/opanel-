package net.opanel.controller.api;

import io.javalin.http.Handler;
import net.opanel.OPanel;
import net.opanel.time.TPS;
import net.opanel.controller.BaseController;
import oshi.SystemInfo;
import oshi.hardware.GlobalMemory;

import java.util.HashMap;

public class MonitorController extends BaseController {
    public MonitorController(OPanel plugin) {
        super(plugin);
    }

    public Handler getMonitor = ctx -> {
        SystemInfo si = new SystemInfo();

        HashMap<String, Object> obj = new HashMap<>();
        obj.put("cpu", getCpuRate(si));
        obj.put("memory", getMemoryRate(si));
        obj.put("tps", TPS.getRecentTPS());

        sendResponse(ctx, obj);
    };

    private double getCpuRate(SystemInfo si) {
        double loadPercentage = si.getHardware().getProcessor().getSystemCpuLoad(500) * 100;
        return Math.round(loadPercentage);
    }

    private double getMemoryRate(SystemInfo si) {
        GlobalMemory gm = si.getHardware().getMemory();

        long total = gm.getTotal();
        long available = gm.getAvailable();
        long used = total - available;

        double rate = ((double) used / total) * 100;

        return Math.round(rate);
    }
}
