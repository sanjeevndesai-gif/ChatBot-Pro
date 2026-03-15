package com.arnan.auth.service;

import java.net.URI;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import com.netflix.discovery.DiscoveryClient;

/**
 * @author sanjeev
 *
 */

public class AppService {
	@Autowired
	DiscoveryClient discoveryClient;
	@Autowired
	LoadBalancerClient loadBalancerClient;
	
	protected URI getInstance(String serviceName)
	{
		ServiceInstance serviceInstance = loadBalancerClient.choose(serviceName);
		URI uri = serviceInstance.getUri();
		return uri;
	}

}

