local PID = KEYS[1]
local OPPONENT_BOT_PID = KEYS[2]
local PLAYER_UNIQUE_MATCHMAKING_KEY = KEYS[3]
local NOW = tonumber(KEYS[4])
local PACKED_BOT_PROFILE_DATA = KEYS[5]
local BOT_HUMAN_ID = KEYS[6]

local room = redis.call('zrevrangebyscore', 'grooms', '+inf', '-inf', 'withscores', 'limit', '0', '1')

if room[1] == nil or room[1] == false or tonumber(room[2]) < 1 then
    return '0'
end

if redis.call('exists', 'qplr:' .. PID) ~= 1 then
    local qplr_key = 'qplr:' .. PID
    redis.call(
        'hmset', qplr_key, 'stat', '1',
        'opp', OPPONENT_BOT_PID, 'upd', NOW, 'pid', PID,
        'ky', PLAYER_UNIQUE_MATCHMAKING_KEY, 'opbot', '1', 'bpd', PACKED_BOT_PROFILE_DATA
    )
    if BOT_HUMAN_ID then
        redis.call('hset', qplr_key, 'bhid', BOT_HUMAN_ID)
    end
    return '3'
else
    return '1'
end