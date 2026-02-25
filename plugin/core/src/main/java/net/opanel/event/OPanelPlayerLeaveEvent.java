package net.opanel.event;

import net.opanel.common.OPanelPlayer;

public class OPanelPlayerLeaveEvent extends OPanelEvent {
    private final OPanelPlayer player;

    public OPanelPlayerLeaveEvent(OPanelPlayer player) {
        this.player = player;
    }

    public OPanelPlayer getPlayer() {
        return player;
    }
}
