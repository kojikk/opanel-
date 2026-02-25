package net.opanel.forge_1_20_3;

import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.level.GameType;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.opanel.common.OPanelGameMode;
import net.opanel.event.*;

public class ForgeListener {
    @SubscribeEvent
    public void onPlayerJoin(PlayerEvent.PlayerLoggedInEvent event) {
        EventManager.get().emit(EventType.PLAYER_JOIN, new OPanelPlayerJoinEvent(new ForgePlayer((ServerPlayer) event.getEntity())));
    }

    @SubscribeEvent
    public void onPlayerLeave(PlayerEvent.PlayerLoggedOutEvent event) {
        EventManager.get().emit(EventType.PLAYER_LEAVE, new OPanelPlayerLeaveEvent(new ForgePlayer((ServerPlayer) event.getEntity())));
    }

    @SubscribeEvent
    public void onPlayerGameModeChange(PlayerEvent.PlayerChangeGameModeEvent event) {
        final GameType gamemode = event.getNewGameMode();
        OPanelGameMode opanelGamemode;
        switch(gamemode) {
            case ADVENTURE -> opanelGamemode = OPanelGameMode.ADVENTURE;
            case SURVIVAL -> opanelGamemode = OPanelGameMode.SURVIVAL;
            case CREATIVE -> opanelGamemode = OPanelGameMode.CREATIVE;
            case SPECTATOR -> opanelGamemode = OPanelGameMode.SPECTATOR;
            default -> opanelGamemode = null;
        }
        EventManager.get().emit(EventType.PLAYER_GAMEMODE_CHANGE, new OPanelPlayerGameModeChangeEvent(new ForgePlayer((ServerPlayer) event.getEntity()), opanelGamemode));
    }
}
