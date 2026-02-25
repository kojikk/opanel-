package net.opanel.common;

public enum OPanelDifficulty {
    PEACEFUL(0, "peaceful"),
    EASY(1, "easy"),
    NORMAL(2, "normal"),
    HARD(3, "hard");

    private final int id;
    private final String name;

    OPanelDifficulty(int id, String name) {
        this.id = id;
        this.name = name;
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public static OPanelDifficulty fromId(int id) {
        switch(id) {
            case 0 -> { return PEACEFUL; }
            case 1 -> { return EASY; }
            case 2 -> { return NORMAL; }
            case 3 -> { return HARD; }
        }
        return null;
    }

    public static OPanelDifficulty fromString(String difficulty) {
        switch(difficulty) {
            case "peaceful" -> { return PEACEFUL; }
            case "easy" -> { return EASY; }
            case "normal" -> { return NORMAL; }
            case "hard" -> { return HARD; }
        }
        return null;
    }
}
