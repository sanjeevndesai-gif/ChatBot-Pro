package com.arnan.userservice.repository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Repository;

import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import static org.springframework.data.mongodb.core.query.Criteria.where;

@Repository
@RequiredArgsConstructor
@Slf4j
public class CounterRepository {

    private final MongoTemplate mongoTemplate;
    private static final String COLLECTION = "counters";

    public long getNextSequence(String sequenceName) {

        log.debug("Generating next sequence for {}", sequenceName);

        Query query = new Query(where("_id").is(sequenceName));
        Update update = new Update().inc("seq", 1);

        FindAndModifyOptions options = FindAndModifyOptions.options()
                .returnNew(true)
                .upsert(true);

        Counter counter = mongoTemplate.findAndModify(
                query, update, options, Counter.class, COLLECTION);

        if (counter == null) {
            throw new RuntimeException("Failed to generate sequence");
        }

        log.debug("Generated sequence {} = {}", sequenceName, counter.getSeq());

        return counter.getSeq();
    }

    static class Counter {
        private String id;
        private long seq;
        public long getSeq() { return seq; }
        public void setSeq(long seq) { this.seq = seq; }
    }
}