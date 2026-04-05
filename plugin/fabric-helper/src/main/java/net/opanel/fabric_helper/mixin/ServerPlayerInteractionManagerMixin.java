package net.opanel.fabric_helper.mixin;

import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.network.ServerPlayerInteractionManager;
import net.minecraft.world.GameMode;
import net.opanel.fabric_helper.event.PlayerGameModeChangeEvent;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(ServerPlayerInteractionManager.class)
public abstract class ServerPlayerInteractionManagerMixin {
    @Shadow
    @Final
    protected ServerPlayerEntity player;

    @Shadow public abstract GameMode getGameMode();

    @Inject(method = "changeGameMode", at = @At("HEAD"))
    private void onChangeGameMode(GameMode newGameMode, CallbackInfoReturnable<Boolean> cir) {
        GameMode oldGameMode = getGameMode();

        if(oldGameMode != newGameMode) {
            PlayerGameModeChangeEvent.EVENT.invoker().change(player, newGameMode);
        }
    }
}
