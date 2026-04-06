package net.opanel.fabric_helper_unmapped;

import com.mojang.brigadier.exceptions.CommandSyntaxException;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.opanel.common.OPanelInventory;

import java.util.List;

public abstract class BaseFabricInventory implements OPanelInventory {
    protected final ServerPlayer player;

    public BaseFabricInventory(ServerPlayer player) {
        this.player = player;
    }

    protected abstract String itemToId(Item item);
    protected abstract Item idToItem(String id);

    @Override
    public int getSize() {
        return player.getInventory().getContainerSize();
    }

    @Override
    public void setItems(List<OPanelItemStack> items) throws CommandSyntaxException {
        Inventory inventory = player.getInventory();
        inventory.clearContent();

        for(OPanelItemStack item : items) {
            inventory.setItem(item.slot, toItemStack(item));
        }
    }

    @Override
    public void setItem(OPanelItemStack item) throws CommandSyntaxException {
        player.getInventory().setItem(item.slot, toItemStack(item));
    }

    protected abstract ItemStack toItemStack(OPanelItemStack item) throws CommandSyntaxException;
}
