package net.opanel.common;

import net.opanel.OPanel;

public class Constants {
    public static final String ABOUT_INFO = new StringBuilder()
            .append("§8===========================================\n")
            .append("§r §6§lOPanel§r - §fA Minecraft server management panel\n\n")
            .append("§r§7Version: §r").append(OPanel.VERSION).append("\n")
            .append("§r§7Author: §rNriotHrreion\n")
            .append("§r§7Website: §r§nhttps://opanel.cn\n")
            .append("§r§7Source Code: §r§nhttps://github.com/opanel-mc/opanel\n")
            .append("§r§7License: §cMPL-2.0\n")
            .append("§8===========================================")
            .toString();

    public static final String INITIAL_ACCESS_KEY_TEMPLATE = new StringBuilder()
            .append("# Remember to DELETE this file for your server security!\n")
            .append("# 为了您服务器的安全，请记得删除此文件！\n")
            .append("\n")
            .toString();
}
