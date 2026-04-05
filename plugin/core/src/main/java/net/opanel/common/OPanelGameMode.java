package net.opanel.common;

public enum OPanelGameMode {
    ADVENTURE(2, "adventure"),
    SURVIVAL(0, "survival"),
    CREATIVE(1, "creative"),
    SPECTATOR(3, "spectator");

    private final int id;
    private final String name;

    OPanelGameMode(int id, String name) {
        this.id = id;
        this.name = name;
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public static OPanelGameMode fromId(int id) {
        switch(id) {
            case 2 -> { return ADVENTURE; }
            case 0 -> { return SURVIVAL; }
            case 1 -> { return CREATIVE; }
            case 3 -> { return SPECTATOR; }
        }
        return null;
    }

    public static OPanelGameMode fromString(String gamemode) {
        switch(gamemode) {
            case "adventure" -> { return ADVENTURE; }
            case "survival" -> { return SURVIVAL; }
            case "creative" -> { return CREATIVE; }
            case "spectator" -> { return SPECTATOR; }
        }
        return null;
    }
}
