package com.arnan.chat.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "chat")
public class ChatProperties {

    /**
     * Session timeout in seconds (inactivity threshold before session is considered timed out).
     */
    private long sessionTimeoutSeconds = 900;

    private WhatsApp whatsapp = new WhatsApp();

    private External external = new External();

    public long getSessionTimeoutSeconds() {
        return sessionTimeoutSeconds;
    }

    public void setSessionTimeoutSeconds(long sessionTimeoutSeconds) {
        this.sessionTimeoutSeconds = sessionTimeoutSeconds;
    }

    public WhatsApp getWhatsapp() {
        return whatsapp;
    }

    public void setWhatsapp(WhatsApp whatsapp) {
        this.whatsapp = whatsapp;
    }

    public External getExternal() {
        return external;
    }

    public void setExternal(External external) {
        this.external = external;
    }

    public static class WhatsApp {
        private String token;
        private String phoneId;
        private String graphUrl;

        public String getToken() {
            return token;
        }

        public void setToken(String token) {
            this.token = token;
        }

        public String getPhoneId() {
            return phoneId;
        }

        public void setPhoneId(String phoneId) {
            this.phoneId = phoneId;
        }

        public String getGraphUrl() {
            return graphUrl;
        }

        public void setGraphUrl(String graphUrl) {
            this.graphUrl = graphUrl;
        }
    }

    public static class External {
        private String doctorServiceUrl;
        private String slotServiceUrl;

        public String getDoctorServiceUrl() {
            return doctorServiceUrl;
        }

        public void setDoctorServiceUrl(String doctorServiceUrl) {
            this.doctorServiceUrl = doctorServiceUrl;
        }

        public String getSlotServiceUrl() {
            return slotServiceUrl;
        }

        public void setSlotServiceUrl(String slotServiceUrl) {
            this.slotServiceUrl = slotServiceUrl;
        }
    }
}
