package net.opanel.event;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import java.util.function.Consumer;

public class EventManager {
    private static EventManager instance;
    private final HashMap<EventType, Set<Consumer<? extends OPanelEvent>>> listenerMap = new HashMap<>();

    private EventManager() { }

    public <E extends OPanelEvent> void on(EventType type, Consumer<E> listener) {
        Set<Consumer<? extends OPanelEvent>> listeners = listenerMap.computeIfAbsent(type, k -> new HashSet<>());
        listeners.add(listener);
    }

    @SuppressWarnings("unchecked")
    public <E extends OPanelEvent> void emit(EventType type, E event) {
        if(!listenerMap.containsKey(type)) return;
        for(Consumer<? extends OPanelEvent> listeners : listenerMap.get(type)) {
            ((Consumer<E>) listeners).accept(event);
        }
    }

    public static EventManager get() {
        if(instance == null) {
            instance = new EventManager();
        }
        return instance;
    }
}
