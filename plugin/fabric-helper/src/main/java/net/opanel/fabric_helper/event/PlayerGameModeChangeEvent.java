package net.opanel.fabric_helper.event;

import net.fabricmc.fabric.api.event.Event;
import net.fabricmc.fabric.api.event.EventFactory;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.world.GameMode;

public interface PlayerGameModeChangeEvent {
    Event<PlayerGameModeChangeEvent> EVENT = EventFactory.createArrayBacked(PlayerGameModeChangeEvent.class, listeners -> (players, gamemode) -> {
        for(PlayerGameModeChangeEvent listener : listeners) {
            listener.change(players, gamemode);
        }
    });

    void change(ServerPlayerEntity player, GameMode gamemode);
}
