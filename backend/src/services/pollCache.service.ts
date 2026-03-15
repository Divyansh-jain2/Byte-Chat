import { redis } from "../lib/redis.js";

const POLL_TTL = 21600; // 6 hours

/**
 * Initializes the Redis cache for a newly created poll.
 */
export async function initPollCache(pollId: string, pollData: any) {
    const key = `poll_live:${pollId}`;

    await redis.hset(key, {
        votesFor: pollData.votes_for || 0,
        votesAgainst: pollData.votes_against || 0,
        totalVoters: pollData.total_voters || 0,
        expiresAt: pollData.expires_at
    });

    await redis.expire(key, POLL_TTL);
}

/**
 * Processes a vote in Redis:
 * 1. Checks if the user already voted (prevents double voting).
 * 2. Increments the correct vote counter and the total voters.
 */
export async function votePoll(pollId: string, userId: string, vote: boolean) {
    const votedKey = `user_voted:${pollId}`;
    const pollKey = `poll_live:${pollId}`;

    // Check if already voted
    const alreadyVoted = await redis.sismember(votedKey, userId);
    if (alreadyVoted) {
        throw new Error("User already voted");
    }

    // Add user to the voted set
    await redis.sadd(votedKey, userId);

    // Increment the specific vote hash
    if (vote) {
        await redis.hincrby(pollKey, "votesFor", 1);
    } else {
        await redis.hincrby(pollKey, "votesAgainst", 1);
    }

    // Increment total voters who participated
    await redis.hincrby(pollKey, "totalVoters", 1);

    // Ensure TTL is refreshed/maintained
    await redis.expire(votedKey, POLL_TTL);
}

/**
 * Retrieves the current live vote counts for a poll.
 */
export async function getLivePoll(pollId: string) {
    const key = `poll_live:${pollId}`;
    return await redis.hgetall(key);
}
