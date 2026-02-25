package net.opanel.neoforge_1_21_1;

import net.minecraft.nbt.*;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.dedicated.DedicatedServer;
import net.minecraft.server.dedicated.DedicatedServerProperties;
import net.minecraft.server.dedicated.DedicatedServerSettings;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.Difficulty;
import net.minecraft.world.level.LevelSettings;
import net.minecraft.world.level.storage.LevelResource;
import net.minecraft.world.level.storage.PrimaryLevelData;
import net.opanel.common.OPanelDifficulty;
import net.opanel.common.OPanelGameMode;
import net.opanel.common.OPanelSave;
import net.opanel.common.OPanelServer;
import net.opanel.utils.Utils;

import java.io.FileInputStream;
import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Optional;
import java.util.Properties;

public class NeoSave implements OPanelSave {
    private final MinecraftServer server;
    private final Path savePath;
    private CompoundTag nbt;

    public NeoSave(MinecraftServer server, Path path) {
        this.server = server;
        savePath = path;
        try {
            nbt = NbtIo.readCompressed(savePath.resolve("level.dat"), NbtAccounter.unlimitedHeap())
                    .getCompound("Data");
            if(nbt.isEmpty()) {
                throw new IOException("Cannot find a valid level.dat");
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void saveNbt() throws IOException {
        CompoundTag dataNbt = new CompoundTag();
        dataNbt.put("Data", nbt);
        NbtIo.writeCompressed(dataNbt, savePath.resolve("level.dat"));
    }

    private ServerLevel getCurrentWorld() {
        return server.overworld();
    }

    @Override
    public String getName() {
        return savePath.getFileName().toString();
    }

    @Override
    public String getDisplayName() {
        return nbt.getString("LevelName").replaceAll("\u00C2", "");
    }

    @Override
    public void setDisplayName(String displayName) throws IOException {
        nbt.putString("LevelName", displayName);
        saveNbt();
    }

    @Override
    public Path getPath() {
        return savePath.toAbsolutePath();
    }

    @Override
    public long getSize() throws IOException {
        return Utils.getDirectorySize(savePath);
    }

    @Override
    public boolean isRunning() {
        return server.getWorldPath(LevelResource.LEVEL_DATA_FILE).getParent().getFileName().toString().equals(getName());
    }

    @Override
    public boolean isCurrent() throws IOException {
        Properties properties = new Properties();
        properties.load(new FileInputStream(OPanelServer.serverPropertiesPath.toFile()));
        return properties.getProperty("level-name").replaceAll("\u00c2", "").equals(getName());
    }

    @Override
    public void setToCurrent() throws IOException {
        if(isCurrent()) return;
        OPanelServer.writePropertiesContent(OPanelServer.getPropertiesContent().replaceAll("level-name=.+", "level-name="+ getName()));
    }

    @Override
    public OPanelGameMode getDefaultGameMode() {
        int gamemode = nbt.getInt("GameType");
        return OPanelGameMode.fromId(gamemode);
    }

    @Override
    public void setDefaultGameMode(OPanelGameMode gamemode) throws IOException {
        nbt.putInt("GameType", gamemode.getId());
        saveNbt();
    }

    @Override
    public OPanelDifficulty getDifficulty() throws IOException {
        if(isCurrent()) return OPanelDifficulty.fromId(getCurrentWorld().getDifficulty().getId());

        byte difficulty = nbt.getByte("Difficulty");
        return OPanelDifficulty.fromId(difficulty);
    }

    @Override
    public void setDifficulty(OPanelDifficulty difficulty) throws IOException {
        if(isCurrent()) server.setDifficulty(Difficulty.byName(difficulty.getName()), true);

        nbt.putByte("Difficulty", (byte) difficulty.getId());
        saveNbt();
    }

    @Override
    public boolean isDifficultyLocked() throws IOException {
        if(isCurrent()) return getCurrentWorld().getLevelData().isDifficultyLocked();

        return nbt.getByte("DifficultyLocked") == 1;
    }

    @Override
    public void setDifficultyLocked(boolean locked) throws IOException {
        if(isCurrent()) server.setDifficultyLocked(locked);

        nbt.putByte("DifficultyLocked", (byte) (locked ? 1 : 0));
        saveNbt();
    }

    @Override
    public boolean isHardcore() throws IOException {
        if(isCurrent()) return server.isHardcore();

        return nbt.getByte("hardcore") == 1;
    }

    @Override
    public void setHardcoreEnabled(boolean enabled) throws IOException {
        if(isCurrent()) {
            PrimaryLevelData worldData = (PrimaryLevelData) getCurrentWorld().getLevelData();
            LevelSettings currentSettings = worldData.getLevelSettings();
            LevelSettings newSettings = new LevelSettings(
                    currentSettings.levelName(),
                    currentSettings.gameType(),
                    enabled,
                    currentSettings.difficulty(),
                    currentSettings.allowCommands(),
                    currentSettings.gameRules(),
                    currentSettings.getDataConfiguration()
            );
            try {
                Field settingsField = PrimaryLevelData.class.getDeclaredField("settings");
                settingsField.setAccessible(true);
                settingsField.set(worldData, newSettings);
            } catch (ReflectiveOperationException e) {
                //
            }
            OPanelServer.writePropertiesContent(OPanelServer.getPropertiesContent().replaceAll("hardcore=.+", "hardcore="+ enabled));
            try {
                Field serverSettingsField = DedicatedServer.class.getDeclaredField("settings");
                serverSettingsField.setAccessible(true);
                DedicatedServerSettings serverSettings = (DedicatedServerSettings) serverSettingsField.get(server);
                serverSettings.update(p -> DedicatedServerProperties.fromFile(OPanelServer.serverPropertiesPath));
            } catch (ReflectiveOperationException e) {
                //
            }
        }

        nbt.putByte("hardcore", (byte) (enabled ? 1 : 0));
        saveNbt();
    }

    @Override
    public HashMap<String, Boolean> getDatapacks() {
        HashMap<String, Boolean> datapacks = new HashMap<>();
        CompoundTag datapacksNbt = nbt.getCompound("DataPacks");
        datapacksNbt.getList("Enabled", Tag.TAG_STRING).forEach(tag -> datapacks.put(tag.getAsString(), true));
        datapacksNbt.getList("Disabled", Tag.TAG_STRING).forEach(tag -> datapacks.put(tag.getAsString(), false));
        return datapacks;
    }

    @Override
    public void toggleDatapack(String id, boolean enabled) throws IOException {
        Boolean currentEnabled = getDatapacks().get(id);
        if(currentEnabled == null || currentEnabled == enabled) return;
        if(id.equals("vanilla")) return;

        if(isCurrent()) {
            server.getCommands().performPrefixedCommand(server.createCommandSourceStack(), "datapack "+ (enabled ? "enable" : "disable") +" \""+ id +"\"");
        }

        CompoundTag datapacksNbt = nbt.getCompound("DataPacks");
        if(enabled) {
            datapacksNbt.getList("Disabled", Tag.TAG_STRING).remove(StringTag.valueOf(id));
            datapacksNbt.getList("Enabled", Tag.TAG_STRING).add(StringTag.valueOf(id));
        } else {
            datapacksNbt.getList("Enabled", Tag.TAG_STRING).remove(StringTag.valueOf(id));
            datapacksNbt.getList("Disabled", Tag.TAG_STRING).add(StringTag.valueOf(id));
        }
        saveNbt();
    }

    @Override
    public void delete() throws IOException {
        Utils.deleteDirectoryRecursively(savePath);
    }
}
