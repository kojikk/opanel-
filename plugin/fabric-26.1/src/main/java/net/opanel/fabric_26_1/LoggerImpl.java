package net.opanel.fabric_26_1;

import net.opanel.logger.Loggable;
import org.slf4j.Logger;

import java.nio.file.*;

public class LoggerImpl extends Loggable {
    private final Logger logger;

    LoggerImpl(Logger logger) {
        this.logger = logger;
    }

    @Override
    public void info(String msg) {
        logger.info(msg);
    }

    @Override
    public void warn(String msg) {
        logger.warn(msg);
    }

    @Override
    public void error(String msg) {
        logger.error(msg);
    }
}
