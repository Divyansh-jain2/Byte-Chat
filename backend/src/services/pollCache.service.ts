import { redis } from "../lib/redis.js";

const POLL_TTL = 21600; // 6 hours

const POLL_HASH_PREFIX = "poll_live:";
const POLL_VOTERS_PREFIX = "poll_voters:";
const POLL_OPTIONS_PREFIX = "poll_live_options:";

export interface LivePollSnapshot {
    votesFor: number;
    votesAgainst: number;
    totalVoters: number;
    expiresAt?: string;
    updatedAt?: string;
}

function pollKey(pollId: string) {
    return `${POLL_HASH_PREFIX}${pollId}`;
}

function votersKey(pollId: string) {
    return `${POLL_VOTERS_PREFIX}${pollId}`;
}

function optionsKey(pollId: string) {
    return `${POLL_OPTIONS_PREFIX}${pollId}`;
}

function toNumber(value: unknown): number {
    const parsed = Number.parseInt(String(value ?? "0"), 10);
    return Number.isNaN(parsed) ? 0 : parsed;
}

function ttlFromExpiry(expiresAt: unknown): number {
    const expiryMs = new Date(String(expiresAt ?? "")).getTime();
    if (!Number.isFinite(expiryMs)) {
        return POLL_TTL;
    }

    const secondsUntilExpiry = Math.ceil((expiryMs - Date.now()) / 1000);
    // Keep cache slightly beyond poll expiry to absorb in-flight UI refreshes.
    const buffered = secondsUntilExpiry + 300;
    return Math.max(60, Math.min(POLL_TTL, buffered));
}

/**
 * Initializes the Redis cache for a newly created poll.
 */
export async function initPollCache(pollId: string, pollData: any) {
    const key = pollKey(pollId);
    const ttl = ttlFromExpiry(pollData?.expires_at);

    await redis.hset(key, {
        votesFor: pollData.votes_for || 0,
        votesAgainst: pollData.votes_against || 0,
        totalVoters: pollData.total_voters || 0,
        expiresAt: pollData.expires_at ? String(pollData.expires_at) : "",
        updatedAt: new Date().toISOString(),
    });

    await redis.expire(key, ttl);
    await redis.expire(votersKey(pollId), ttl);
    await redis.expire(optionsKey(pollId), ttl);
}

/**
 * Initializes option vote counters for General polls.
 */
export async function initGeneralPollOptionsCache(pollId: string, optionIds: string[], expiresAt: unknown) {
    if (!Array.isArray(optionIds) || optionIds.length === 0) {
        return;
    }

    const key = optionsKey(pollId);
    const ttl = ttlFromExpiry(expiresAt);
    const fields: Record<string, string> = {};

    for (const optionId of optionIds) {
        fields[optionId] = "0";
    }

    await redis.hset(key, fields);
    await redis.expire(key, ttl);
}

/**
 * Processes a vote in Redis:
 * 1. Checks if the user already voted (prevents double voting).
 * 2. Increments the correct vote counter and the total voters.
 */
export async function votePoll(pollId: string, userId: string, vote: boolean): Promise<{ applied: boolean; live: LivePollSnapshot }> {
    const key = pollKey(pollId);
    const vKey = votersKey(pollId);

    const ttl = await redis.ttl(key);
    const safeTtl = ttl > 0 ? ttl : POLL_TTL;

    const result = await redis.eval(
        `
        local pollHash = KEYS[1]
        local votersSet = KEYS[2]
        local userId = ARGV[1]
        local voteFor = ARGV[2]
        local ttl = tonumber(ARGV[3])
        local nowIso = ARGV[4]

        if redis.call('SISMEMBER', votersSet, userId) == 1 then
            return {
                0,
                redis.call('HGET', pollHash, 'votesFor') or '0',
                redis.call('HGET', pollHash, 'votesAgainst') or '0',
                redis.call('HGET', pollHash, 'totalVoters') or '0'
            }
        end

        redis.call('SADD', votersSet, userId)
        if voteFor == '1' then
            redis.call('HINCRBY', pollHash, 'votesFor', 1)
        else
            redis.call('HINCRBY', pollHash, 'votesAgainst', 1)
        end
        redis.call('HINCRBY', pollHash, 'totalVoters', 1)
        redis.call('HSET', pollHash, 'updatedAt', nowIso)

        if ttl and ttl > 0 then
            redis.call('EXPIRE', pollHash, ttl)
            redis.call('EXPIRE', votersSet, ttl)
        end

        return {
            1,
            redis.call('HGET', pollHash, 'votesFor') or '0',
            redis.call('HGET', pollHash, 'votesAgainst') or '0',
            redis.call('HGET', pollHash, 'totalVoters') or '0'
        }
        `,
        2,
        key,
        vKey,
        userId,
        vote ? "1" : "0",
        String(safeTtl),
        new Date().toISOString()
    ) as [number, string, string, string];

    return {
        applied: Number(result[0]) === 1,
        live: {
            votesFor: toNumber(result[1]),
            votesAgainst: toNumber(result[2]),
            totalVoters: toNumber(result[3]),
        },
    };
}

/**
 * Uses Redis set membership to dedupe General poll votes and keeps
 * per-option live counters in a Redis hash.
 */
export async function voteGeneralPoll(
    pollId: string,
    userId: string,
    optionId: string
): Promise<{ applied: boolean; totalVoters: number; optionVotes: number }> {
    const key = pollKey(pollId);
    const vKey = votersKey(pollId);
    const oKey = optionsKey(pollId);

    const ttl = await redis.ttl(key);
    const safeTtl = ttl > 0 ? ttl : POLL_TTL;

    const result = await redis.eval(
        `
        local pollHash = KEYS[1]
        local votersSet = KEYS[2]
        local optionsHash = KEYS[3]
        local userId = ARGV[1]
        local optionId = ARGV[2]
        local ttl = tonumber(ARGV[3])
        local nowIso = ARGV[4]

        if redis.call('SISMEMBER', votersSet, userId) == 1 then
            return {
                0,
                redis.call('HGET', pollHash, 'totalVoters') or '0',
                redis.call('HGET', optionsHash, optionId) or '0'
            }
        end

        redis.call('SADD', votersSet, userId)
        redis.call('HINCRBY', pollHash, 'totalVoters', 1)
        redis.call('HINCRBY', optionsHash, optionId, 1)
        redis.call('HSET', pollHash, 'updatedAt', nowIso)

        if ttl and ttl > 0 then
            redis.call('EXPIRE', pollHash, ttl)
            redis.call('EXPIRE', votersSet, ttl)
            redis.call('EXPIRE', optionsHash, ttl)
        end

        return {
            1,
            redis.call('HGET', pollHash, 'totalVoters') or '0',
            redis.call('HGET', optionsHash, optionId) or '0'
        }
        `,
        3,
        key,
        vKey,
        oKey,
        userId,
        optionId,
        String(safeTtl),
        new Date().toISOString()
    ) as [number, string, string];

    return {
        applied: Number(result[0]) === 1,
        totalVoters: toNumber(result[1]),
        optionVotes: toNumber(result[2]),
    };
}

/**
 * Compensation step used when DB vote insert fails after Redis accepted it.
 */
export async function rollbackVotePoll(pollId: string, userId: string, vote: boolean): Promise<void> {
    const key = pollKey(pollId);
    const vKey = votersKey(pollId);

    await redis.eval(
        `
        local pollHash = KEYS[1]
        local votersSet = KEYS[2]
        local userId = ARGV[1]
        local voteFor = ARGV[2]

        if redis.call('SISMEMBER', votersSet, userId) == 0 then
            return 0
        end

        redis.call('SREM', votersSet, userId)
        if voteFor == '1' then
            redis.call('HINCRBY', pollHash, 'votesFor', -1)
            if tonumber(redis.call('HGET', pollHash, 'votesFor') or '0') < 0 then
                redis.call('HSET', pollHash, 'votesFor', 0)
            end
        else
            redis.call('HINCRBY', pollHash, 'votesAgainst', -1)
            if tonumber(redis.call('HGET', pollHash, 'votesAgainst') or '0') < 0 then
                redis.call('HSET', pollHash, 'votesAgainst', 0)
            end
        end

        redis.call('HINCRBY', pollHash, 'totalVoters', -1)
        if tonumber(redis.call('HGET', pollHash, 'totalVoters') or '0') < 0 then
            redis.call('HSET', pollHash, 'totalVoters', 0)
        end

        return 1
        `,
        2,
        key,
        vKey,
        userId,
        vote ? "1" : "0"
    );
}

/**
 * Compensation step for General poll cache updates.
 */
export async function rollbackGeneralPollVote(pollId: string, userId: string, optionId: string): Promise<void> {
    const key = pollKey(pollId);
    const vKey = votersKey(pollId);
    const oKey = optionsKey(pollId);

    await redis.eval(
        `
        local pollHash = KEYS[1]
        local votersSet = KEYS[2]
        local optionsHash = KEYS[3]
        local userId = ARGV[1]
        local optionId = ARGV[2]

        if redis.call('SISMEMBER', votersSet, userId) == 0 then
            return 0
        end

        redis.call('SREM', votersSet, userId)
        redis.call('HINCRBY', pollHash, 'totalVoters', -1)
        if tonumber(redis.call('HGET', pollHash, 'totalVoters') or '0') < 0 then
            redis.call('HSET', pollHash, 'totalVoters', 0)
        end

        redis.call('HINCRBY', optionsHash, optionId, -1)
        if tonumber(redis.call('HGET', optionsHash, optionId) or '0') < 0 then
            redis.call('HSET', optionsHash, optionId, 0)
        end

        return 1
        `,
        3,
        key,
        vKey,
        oKey,
        userId,
        optionId
    );
}

/**
 * Retrieves the current live vote counts for a poll.
 */
export async function getLivePoll(pollId: string) {
    const key = pollKey(pollId);
    const data = await redis.hgetall(key);
    if (!data || Object.keys(data).length === 0) {
        return null;
    }

    return {
        votesFor: toNumber(data.votesFor),
        votesAgainst: toNumber(data.votesAgainst),
        totalVoters: toNumber(data.totalVoters),
        expiresAt: data.expiresAt,
        updatedAt: data.updatedAt,
    } as LivePollSnapshot;
}

/**
 * Retrieves live option vote counts for General polls.
 */
export async function getLiveGeneralPollOptions(pollId: string): Promise<Record<string, number>> {
    const key = optionsKey(pollId);
    const raw = await redis.hgetall(key);

    const counts: Record<string, number> = {};
    for (const [optionId, value] of Object.entries(raw)) {
        counts[optionId] = toNumber(value);
    }

    return counts;
}

/**
 * Removes all Redis keys related to a poll's live cache.
 */
export async function clearPollCache(pollId: string): Promise<void> {
    await redis.del(pollKey(pollId), votersKey(pollId), optionsKey(pollId), `user_voted:${pollId}`);
}
