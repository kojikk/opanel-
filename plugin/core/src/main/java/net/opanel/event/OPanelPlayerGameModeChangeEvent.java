package net.opanel.event;

import net.opanel.common.OPanelGameMode;
import net.opanel.common.OPanelPlayer;

public class OPanelPlayerGameModeChangeEvent extends OPanelEvent {
    private final OPanelPlayer player;
    private final OPanelGameMode gamemode;

    public OPanelPlayerGameModeChangeEvent(OPanelPlayer player, OPanelGameMode gamemode) {
        this.player = player;
        this.gamemode = gamemode;
    }

    public OPanelPlayer getPlayer() {
        return player;
    }

    public OPanelGameMode getGameMode() {
        return gamemode;
    }
}
