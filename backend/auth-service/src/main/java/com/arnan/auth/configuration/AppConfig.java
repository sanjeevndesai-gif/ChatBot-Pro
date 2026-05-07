package com.arnan.auth.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "ats")
public class AppConfig {

    private String mongodbUri;
    private Integer mongodbPort;
    private String mongoDatabase;
    private String collection;

    public String getMongodbUri() { return mongodbUri; }
    public void setMongodbUri(String mongodbUri) { this.mongodbUri = mongodbUri; }

    public Integer getMongodbPort() { return mongodbPort; }
    public void setMongodbPort(Integer mongodbPort) { this.mongodbPort = mongodbPort; }

    public String getMongoDatabase() { return mongoDatabase; }
    public void setMongoDatabase(String mongoDatabase) { this.mongoDatabase = mongoDatabase; }

    public String getCollection() { return collection; }
    public void setCollection(String collection) { this.collection = collection; }
}
