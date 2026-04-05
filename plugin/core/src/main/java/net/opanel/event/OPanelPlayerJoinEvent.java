package net.opanel.event;

import net.opanel.common.OPanelPlayer;

public class OPanelPlayerJoinEvent extends OPanelEvent {
    private final OPanelPlayer player;

    public OPanelPlayerJoinEvent(OPanelPlayer player) {
        this.player = player;
    }

    public OPanelPlayer getPlayer() {
        return player;
    }
}
