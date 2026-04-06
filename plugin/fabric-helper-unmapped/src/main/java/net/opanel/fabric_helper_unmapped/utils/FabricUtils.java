package net.opanel.fabric_helper_unmapped.utils;

import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.Tag;
import net.minecraft.server.dedicated.*;
import net.opanel.common.OPanelServer;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;

public class FabricUtils {
    public static boolean forceUpdateProperties(DedicatedServer server) {
        try {
            Field serverSettingsField = DedicatedServer.class.getDeclaredField("settings");
            serverSettingsField.setAccessible(true);
            DedicatedServerSettings serverSettings = (DedicatedServerSettings) serverSettingsField.get(server);
            serverSettings.update(p -> DedicatedServerProperties.fromFile(OPanelServer.serverPropertiesPath));
        } catch (ReflectiveOperationException e) {
            return false;
        }
        return true;
    }

    public static void addCompoundToNBTList(ListTag list, CompoundTag compound, int index) {
        if(index < 0) throw new IllegalArgumentException("Target index is out of the list size.");
        if(index >= list.size()) {
            list.add(compound);
            return;
        }

        List<Tag> tempList = new ArrayList<>();
        for(int i = index; i < list.size(); i++) {
            tempList.add(list.remove(i));
            i--;
        }
        list.add(compound);
        list.addAll(tempList);
    }
}
