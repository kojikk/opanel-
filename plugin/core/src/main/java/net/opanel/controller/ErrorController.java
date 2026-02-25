package net.opanel.controller;

import io.javalin.http.ContentType;
import io.javalin.http.Handler;
import net.opanel.OPanel;
import net.opanel.web.WebServer;

import java.io.InputStream;

public class ErrorController extends BaseController {
    private static final String DEFAULT_FILE = "index.html";
    private static final String NOT_FOUND_FILE = "404.html";

    public ErrorController(OPanel plugin) {
        super(plugin);
    }

    // 404
    public Handler notFound = ctx -> {
        final String path = ctx.path();
        if(path.startsWith("/api") || path.startsWith("/file")) return;

        // Forge version <=1.20.2 will return 404 when accessing the index.html without explicitly indicating index.html
        // see https://github.com/opanel-mc/opanel/issues/58
        String potentialIndex = path.endsWith("/") ? (path + DEFAULT_FILE) : (path +"/"+ DEFAULT_FILE);
        try(InputStream is = getClass().getClassLoader().getResourceAsStream(WebServer.ROOT_PATH + potentialIndex)) {
            if(is != null) { // Not a 404 actually
                sendContent(ctx, is.readAllBytes(), ContentType.TEXT_HTML);
                return;
            }
        }

        try(InputStream is = getClass().getClassLoader().getResourceAsStream(WebServer.ROOT_PATH +"/"+ NOT_FOUND_FILE)) {
            if(is != null) {
                sendContent(ctx, is.readAllBytes(), ContentType.TEXT_HTML);
            }
        }
    };
}
