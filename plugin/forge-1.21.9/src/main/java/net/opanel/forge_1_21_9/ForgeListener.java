package net.opanel.forge_1_21_9;

import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.level.GameType;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.event.server.ServerStartedEvent;
import net.minecraftforge.eventbus.api.listener.SubscribeEvent;
import net.opanel.common.OPanelGameMode;
import net.opanel.event.*;

public class ForgeListener {
    private MinecraftServer server;

    @SubscribeEvent
    public void onServerStart(ServerStartedEvent event) {
        server = event.getServer();
    }

    @SubscribeEvent
    public void onPlayerJoin(PlayerEvent.PlayerLoggedInEvent event) {
        if(server == null) return;
        EventManager.get().emit(EventType.PLAYER_JOIN, new OPanelPlayerJoinEvent(new ForgePlayer((ServerPlayer) event.getEntity(), server)));
    }

    @SubscribeEvent
    public void onPlayerLeave(PlayerEvent.PlayerLoggedOutEvent event) {
        if(server == null) return;
        EventManager.get().emit(EventType.PLAYER_LEAVE, new OPanelPlayerLeaveEvent(new ForgePlayer((ServerPlayer) event.getEntity(), server)));
    }

    @SubscribeEvent
    public void onPlayerGameModeChange(PlayerEvent.PlayerChangeGameModeEvent event) {
        if(server == null) return;

        final GameType gamemode = event.getNewGameMode();
        OPanelGameMode opanelGamemode;
        switch(gamemode) {
            case ADVENTURE -> opanelGamemode = OPanelGameMode.ADVENTURE;
            case SURVIVAL -> opanelGamemode = OPanelGameMode.SURVIVAL;
            case CREATIVE -> opanelGamemode = OPanelGameMode.CREATIVE;
            case SPECTATOR -> opanelGamemode = OPanelGameMode.SPECTATOR;
            default -> opanelGamemode = null;
        }
        EventManager.get().emit(EventType.PLAYER_GAMEMODE_CHANGE, new OPanelPlayerGameModeChangeEvent(new ForgePlayer((ServerPlayer) event.getEntity(), server), opanelGamemode));
    }
}
