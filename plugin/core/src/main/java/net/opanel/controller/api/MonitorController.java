package net.opanel.controller.api;

import io.javalin.http.Handler;
import net.opanel.OPanel;
import net.opanel.time.TPS;
import net.opanel.controller.BaseController;
import oshi.SystemInfo;
import oshi.hardware.CentralProcessor;
import oshi.hardware.GlobalMemory;

import java.util.HashMap;

public class MonitorController extends BaseController {

    private final SystemInfo si = new SystemInfo();
    private final CpuSampler cpuSampler = new CpuSampler(si);

    public MonitorController(OPanel plugin) {
        super(plugin);
    }

    public Handler getMonitor = ctx -> {
        HashMap<String, Object> obj = new HashMap<>();
        obj.put("cpu", cpuSampler.sampleRate());
        obj.put("memory", getMemoryRate(si));
        obj.put("tps", TPS.getRecentTPS());

        sendResponse(ctx, obj);
    };

    private double getMemoryRate(SystemInfo si) {
        GlobalMemory gm = si.getHardware().getMemory();

        long total = gm.getTotal();
        long available = gm.getAvailable();
        long used = total - available;

        double rate = ((double) used / total) * 100;

        return Math.round(rate);
    }

    public static class CpuSampler {
        private final CentralProcessor processor;
        private long[] prevTicks;

        public CpuSampler(SystemInfo si) {
            this.processor = si.getHardware().getProcessor();
            this.prevTicks = processor.getSystemCpuLoadTicks();
        }

        public synchronized double sampleRate() {
            double load = processor.getSystemCpuLoadBetweenTicks(prevTicks);
            prevTicks = processor.getSystemCpuLoadTicks();

            double rounded = Math.round(load * 100);
            return Math.max(0, Math.min(100, rounded));
        }
    }
}
