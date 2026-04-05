package net.opanel.common;

import java.util.List;

public class OPanelPlugin {
    public static final String DISABLED_SUFFIX = ".disabled";

    private final String fileName;
    private final String name;
    private final String version;
    private final String description;
    private final List<String> authors;
    private final String website;
    private final byte[] icon;
    private final long fileSize;
    private final boolean enabled;
    private final boolean loaded;

    public OPanelPlugin(
        String fileName,
        String name,
        String version,
        String description,
        List<String> authors,
        String website,
        byte[] icon,
        long fileSize,
        boolean enabled,
        boolean loaded
    ) {
        this.fileName = fileName;
        this.name = name;
        this.version = version;
        this.description = description;
        this.authors = authors;
        this.website = website;
        this.icon = icon;
        this.fileSize = fileSize;
        this.enabled = enabled;
        this.loaded = loaded;
    }

    public String getFileName() {
        return fileName;
    }

    public String getName() {
        return name;
    }

    public String getVersion() {
        return version;
    }

    public String getDescription() {
        return description;
    }

    public List<String> getAuthors() {
        return authors;
    }

    public String getWebsite() {
        return website;
    }

    public byte[] getIcon() {
        return icon;
    }

    public long getFileSize() {
        return fileSize;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public boolean isLoaded() {
        return loaded;
    }
}
