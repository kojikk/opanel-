package net.opanel.web;

import com.google.gson.Gson;
import io.javalin.Javalin;
import io.javalin.http.HttpStatus;
import io.javalin.jetty.JettyServer;
import io.javalin.json.JavalinGson;
import io.javalin.util.JavalinLogger;
import net.opanel.OPanel;
import net.opanel.controller.BaseController;
import net.opanel.controller.api.GamerulesController;
import net.opanel.controller.api.InfoController;
import net.opanel.controller.api.MonitorController;
import net.opanel.controller.api.VersionController;
import net.opanel.endpoint.InventoryEndpoint;
import net.opanel.endpoint.PlayersEndpoint;
import net.opanel.endpoint.TerminalEndpoint;

import java.util.HashMap;

import static io.javalin.apibuilder.ApiBuilder.*;

/**
 * Simplified headless web server for the OPanel plugin.
 * Auth, static file serving, and file management are handled by the standalone panel.
 * This server only exposes: WebSocket endpoints, TPS/monitor, version, and gamerules.
 */
public class WebServer {
    public final int PORT;

    private final OPanel plugin;
    private Javalin app;

    public WebServer(OPanel plugin) {
        this.plugin = plugin;
        PORT = plugin.getConfig().webServerPort;

        JavalinLogger.enabled = false;
    }

    public void start() throws Exception {
        app = Javalin.create(config -> {
            config.showJavalinBanner = false;
            config.jsonMapper(new JavalinGson(new Gson()));

            config.plugins.enableCors(cors -> {
                cors.add(it -> {
                    it.anyHost();
                    it.allowCredentials = false;
                });
            });
        });

        // WebSocket endpoints (proxied by the panel)
        app.ws("/socket/players", ws -> new PlayersEndpoint(app, ws, plugin));
        app.ws("/socket/inventory/{uuid}", ws -> new InventoryEndpoint(app, ws, plugin));
        app.ws("/socket/terminal", ws -> new TerminalEndpoint(app, ws, plugin));

        // Headless API controllers
        GamerulesController gamerulesController = new GamerulesController(plugin);
        InfoController infoController = new InfoController(plugin);
        MonitorController monitorController = new MonitorController(plugin);
        VersionController versionController = new VersionController(plugin);

        app.routes(() -> path("api", () -> {
            path("gamerules", () -> {
                get("/", gamerulesController.getGamerules);
                post("/", gamerulesController.changeGamerule);
            });
            path("info", () -> {
                get("/", infoController.getServerInfo);
            });
            get("monitor", monitorController.getMonitor);
            get("version", versionController.getVersionInfo);
        }));

        app.exception(Exception.class, (e, ctx) -> {
            e.printStackTrace();
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR);

            HashMap<String, Object> jsonObj = new HashMap<>();
            jsonObj.put("code", 500);
            jsonObj.put("error", e.getMessage());
            ctx.json(jsonObj);
        });

        app.start(PORT);
        plugin.logger.info("OPanel headless API is ready on port " + PORT);

        app.events(event -> {
            event.serverStopping(BaseController::unregisterAllControllerInstances);
        });
    }

    public void stop() throws Exception {
        if(isRunning()) {
            app.stop();
            app = null;
            plugin.logger.info("Headless API server is stopped.");
        }
    }

    public boolean isRunning() {
        if(app == null) return false;

        JettyServer jettyServer = app.jettyServer();
        return jettyServer != null && jettyServer.started;
    }
}
