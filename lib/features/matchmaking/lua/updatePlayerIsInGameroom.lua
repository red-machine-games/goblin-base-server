local PID = KEYS[1]
local NOW = tonumber(KEYS[2])
local PLAYER_IN_GAMEROOM_TTL = tonumber(KEYS[3])
local PLAYER_BOOKING_KEY = KEYS[4]

local queue_player = redis.call('hmget', 'qplr:' .. PID, 'stat', 'upd', 'ky')

if queue_player[1] ~= '4' or tonumber(queue_player[2]) + PLAYER_IN_GAMEROOM_TTL < NOW or queue_player[3] ~= PLAYER_BOOKING_KEY then
    return nil
else
    redis.call('hset', 'qplr:' .. PID, 'upd', NOW)
    return '1'
end