package com.taskflow.common.security;

import java.util.UUID;

public class OrgContextHolder {
    private static final ThreadLocal<UUID> ORG_ID = new ThreadLocal<>();

    public static void set(UUID orgId) {
        ORG_ID.set(orgId);
    }

    public static UUID get() {
        return ORG_ID.get();
    }

    public static void clear() {
        ORG_ID.remove();
    }
}
