package com.arnan.i18n.config;

import java.time.Duration;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.serializer.RedisSerializationContext;

@Configuration
@EnableCaching
public class RedisConfig {

	@Bean
	public LettuceConnectionFactory redisConnectionFactory() {
		RedisStandaloneConfiguration cfg = new RedisStandaloneConfiguration("localhost", 6379);
		return new LettuceConnectionFactory(cfg);
	}

	@Bean
	public CacheManager cacheManager(LettuceConnectionFactory lcf) {
		RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig().entryTtl(Duration.ofMinutes(10))
				.serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(
						new org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer()));
		return RedisCacheManager.builder(lcf).cacheDefaults(config).build();
	}
}