package net.opanel.fabric_1_21_5;

import net.fabricmc.fabric.api.entity.event.v1.ServerPlayerEvents;
import net.opanel.common.OPanelGameMode;
import net.opanel.event.*;
import net.opanel.fabric_helper.event.PlayerGameModeChangeEvent;

public class FabricListener {
    public FabricListener() {

        ServerPlayerEvents.JOIN.register(player -> {
            EventManager.get().emit(EventType.PLAYER_JOIN, new OPanelPlayerJoinEvent(new FabricPlayer(player)));
        });

        ServerPlayerEvents.LEAVE.register(player -> {
            EventManager.get().emit(EventType.PLAYER_LEAVE, new OPanelPlayerLeaveEvent(new FabricPlayer(player)));
        });

        PlayerGameModeChangeEvent.EVENT.register(((player, gamemode) -> {
            OPanelGameMode opanelGamemode;
            switch(gamemode) {
                case ADVENTURE -> opanelGamemode = OPanelGameMode.ADVENTURE;
                case SURVIVAL -> opanelGamemode = OPanelGameMode.SURVIVAL;
                case CREATIVE -> opanelGamemode = OPanelGameMode.CREATIVE;
                case SPECTATOR -> opanelGamemode = OPanelGameMode.SPECTATOR;
                default -> opanelGamemode = null;
            }
            EventManager.get().emit(EventType.PLAYER_GAMEMODE_CHANGE, new OPanelPlayerGameModeChangeEvent(new FabricPlayer(player), opanelGamemode));
        }));
    }
}
