package com.arnan.book_appointment.config;

import java.util.ArrayList;
import java.util.List;


import org.springframework.boot.context.properties.ConfigurationProperties;

import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties("ats")
public class AppConfig {

	private String environment;
	private List<String> hosts = new ArrayList<>();
	private String mongodbUri;
	private Integer mongodbPort;
	private String mongoDatabase;
	private String collection;
	private String schedulerCollection;

	public String getMongodbUri() {
		return mongodbUri;
	}

	public void setMongodbUri(String mongodbUri) {
		this.mongodbUri = mongodbUri;
	}

	public Integer getMongodbPort() {
		return mongodbPort;
	}

	public void setMongodbPort(Integer mongodbPort) {
		this.mongodbPort = mongodbPort;
	}

	public String getMongoDatabase() {
		return mongoDatabase;
	}

	public void setMongoDatabase(String mongoDatabase) {
		this.mongoDatabase = mongoDatabase;
	}

	public String getCollection() {
		return collection;
	}

	public void setCollection(String collection) {
		this.collection = collection;
	}

	public String getEnvironment() {
		return environment;
	}

	public void setEnvironment(String environment) {
		this.environment = environment;
	}

	public List<String> getHosts() {
		return hosts;
	}

	public void setHosts(List<String> hosts) {
		this.hosts = hosts;
	}

	public String getSchedulerCollection() {
	    return schedulerCollection;
	}

	public void setSchedulerCollection(String schedulerCollection) {
	    this.schedulerCollection = schedulerCollection;
	}
	@Override
	public String toString() {
		return "AppConfig [environment=" + environment + ", hosts=" + hosts + ", mongodbUri=" + mongodbUri
				+ ", mongodbPort=" + mongodbPort + ", mongoDatabase=" + mongoDatabase + ", collection=" + collection
				+ "]";
	}
	

}
