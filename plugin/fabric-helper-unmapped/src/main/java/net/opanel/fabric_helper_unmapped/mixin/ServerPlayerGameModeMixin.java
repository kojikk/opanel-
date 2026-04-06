package net.opanel.fabric_helper_unmapped.mixin;

import net.minecraft.server.level.ServerPlayer;
import net.minecraft.server.level.ServerPlayerGameMode;
import net.minecraft.world.level.GameType;
import net.opanel.fabric_helper_unmapped.event.PlayerGameModeChangeEvent;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(ServerPlayerGameMode.class)
public abstract class ServerPlayerGameModeMixin {
    @Shadow
    @Final
    protected ServerPlayer player;

    @Shadow public abstract GameType getGameModeForPlayer();

    @Inject(method = "changeGameModeForPlayer", at = @At("HEAD"))
    private void onChangeGameMode(GameType gameModeForPlayer, CallbackInfoReturnable<Boolean> cir) {
        GameType oldGameMode = getGameModeForPlayer();

        if(oldGameMode != gameModeForPlayer) {
            PlayerGameModeChangeEvent.EVENT.invoker().change(player, gameModeForPlayer);
        }
    }
}
