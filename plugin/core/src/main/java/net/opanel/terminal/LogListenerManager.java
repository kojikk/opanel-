package net.opanel.terminal;

import java.util.List;
import java.util.function.Consumer;

public interface LogListenerManager {
    int MAX_LOG_LINES = 20000;

    void addListener(Consumer<ConsoleLog> listener);
    void clearListeners();
    List<ConsoleLog> getRecentLogs();
}
