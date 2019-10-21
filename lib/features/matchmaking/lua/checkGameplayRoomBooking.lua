redis.replicate_commands()

local THE_KEY = KEYS[1]
local GAMEPLAYROOM_ADDRESS = KEYS[2]
local GAMEROOM_BOOKING_TTL = tonumber(KEYS[3])
local NOW = tonumber(KEYS[4])

local k = 'grmb:' .. GAMEPLAYROOM_ADDRESS .. ':' .. THE_KEY
local the_booking = redis.call('hmget', k, 'stat', 'upd')

if the_booking[1] == false then
    return nil
elseif the_booking[1] == '0' and tonumber(the_booking[2]) + GAMEROOM_BOOKING_TTL > NOW then
    local pid_and_opponent = redis.call('hmget', k, 'pid', 'opp', 'opbot', 'bpd')
    local qplrk = 'qplr:' .. pid_and_opponent[1]
    redis.call('hmset', qplrk, 'stat', '4', 'upd', NOW)
    if pid_and_opponent[3] == '1' then
        return pid_and_opponent[1] .. ';' .. pid_and_opponent[2] .. ';' .. pid_and_opponent[4]
    else
        return pid_and_opponent[1] .. ';' .. pid_and_opponent[2]
    end
else
    return nil
end