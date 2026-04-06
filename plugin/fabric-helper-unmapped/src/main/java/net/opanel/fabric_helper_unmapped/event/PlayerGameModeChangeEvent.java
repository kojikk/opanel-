package net.opanel.fabric_helper_unmapped.event;

import net.fabricmc.fabric.api.event.Event;
import net.fabricmc.fabric.api.event.EventFactory;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.level.GameType;

public interface PlayerGameModeChangeEvent {
    Event<PlayerGameModeChangeEvent> EVENT = EventFactory.createArrayBacked(PlayerGameModeChangeEvent.class, listeners -> (players, gamemode) -> {
        for(PlayerGameModeChangeEvent listener : listeners) {
            listener.change(players, gamemode);
        }
    });

    void change(ServerPlayer player, GameType gamemode);
}
