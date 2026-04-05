package net.opanel.common.features;

import net.opanel.utils.Utils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;

public interface BukkitConfigFeature {
    Path bukkitConfigPath = Paths.get("").resolve("bukkit.yml");
    Path spigotConfigPath = Paths.get("").resolve("spigot.yml");
    Path paperGlobalConfigPath = Paths.get("").resolve("config/paper-global.yml");
    Path paperWorldDefaultsConfigPath = Paths.get("").resolve("config/paper-world-defaults.yml");
    Path leavesConfigPath = Paths.get("").resolve("leaves.yml");

    private Path getBukkitServerConfigPath(String target) throws NoSuchFileException {
        Path targetPath;
        switch(target) {
            case "bukkit" -> targetPath = bukkitConfigPath;
            case "spigot" -> targetPath = spigotConfigPath;
            case "paper" -> targetPath = paperGlobalConfigPath;
            case "leaves" -> targetPath = leavesConfigPath;
            default -> throw new IllegalArgumentException("Unknown target name");
        }
        if(!Files.exists(targetPath)) {
            throw new NoSuchFileException("Cannot find the target bukkit server config");
        }
        return targetPath;
    }

    private Path getPaperWorldConfigPath(String worldName) throws NoSuchFileException {
        Path targetPath = Paths.get("").resolve(worldName).resolve("paper-world.yml");
        if(!Files.exists(targetPath)) {
            throw new NoSuchFileException("Cannot find the config of world "+ worldName);
        }
        return targetPath;
    }

    default String getBukkitServerConfigContent(String target) throws IOException {
        return Utils.readTextFile(getBukkitServerConfigPath(target));
    }

    default void writeBukkitServerConfigContent(String target, String content) throws IOException {
        Utils.writeTextFile(getBukkitServerConfigPath(target), content);
    }

    default String getPaperWorldDefaultsConfigContent() throws IOException {
        return Utils.readTextFile(paperWorldDefaultsConfigPath);
    }

    default void writePaperWorldDefaultsConfigContent(String content) throws IOException {
        Utils.writeTextFile(paperGlobalConfigPath, content);
    }

    default String getPaperWorldConfigContent(String worldName) throws IOException {
        return Utils.readTextFile(getPaperWorldConfigPath(worldName));
    }

    default void writePaperWorldConfigContent(String worldName, String content) throws IOException {
        Utils.writeTextFile(getPaperWorldConfigPath(worldName), content);
    }
}
