local PID = KEYS[1]
local NOW = tonumber(KEYS[2])
local TIME_FOR_SEARCH = tonumber(KEYS[3])
local TIME_FOR_ACCEPTANCE = tonumber(KEYS[4])
local GAMEROOM_BOOKING_TTL = tonumber(KEYS[5])
local PLAYER_IN_GAMEROOM_TTL = tonumber(KEYS[6])

local qplr_key = 'qplr:' .. PID
local stat = redis.call('hget', qplr_key, 'stat')

local function clear_stuff()
    local qplr = redis.call('hmget', qplr_key, 'ky', 'grip')
    local bkey, gameroom_stuff = qplr[1], qplr[2]

    if bkey and gameroom_stuff then
        redis.call('del', qplr_key, 'grmb:' .. gameroom_stuff .. ':' .. bkey)
    end
end

if stat then
    local updated = tonumber(redis.call('hget', qplr_key, 'upd'))
    if stat == '0' then
        if updated + TIME_FOR_SEARCH <= NOW then
            clear_stuff()
            return nil
        else
            return stat
        end
    elseif stat == '1' or stat == '2' then
        if updated + TIME_FOR_ACCEPTANCE <= NOW then
            clear_stuff()
            return nil
        else
            return stat
        end
    elseif stat == '3' and updated + GAMEROOM_BOOKING_TTL > NOW then
        local ip_and_key = redis.call('hmget', qplr_key, 'grip', 'ky')
        local booking_stat = redis.call('hmget', 'grmb:' .. ip_and_key[1] .. ':' .. ip_and_key[2], 'stat', 'upd')
        if booking_stat[1] == '0' and tonumber(booking_stat[2]) + GAMEROOM_BOOKING_TTL > NOW then
            return '3;' .. ip_and_key[1] .. ';' .. ip_and_key[2]
        else
            clear_stuff()
            return nil
        end
    elseif stat == '4' and updated + PLAYER_IN_GAMEROOM_TTL > NOW then
        local ip_and_key = redis.call('hmget', qplr_key, 'grip', 'ky')
        local booking_stat = redis.call('hmget', 'grmb:' .. ip_and_key[1] .. ':' .. ip_and_key[2], 'stat', 'upd')
        if booking_stat[1] == '0' and tonumber(booking_stat[2]) + PLAYER_IN_GAMEROOM_TTL > NOW then
            return '4;' .. ip_and_key[1] .. ';' .. ip_and_key[2]
        else
            clear_stuff()
            return nil
        end
    else
        clear_stuff()
        return nil
    end
else
    clear_stuff()
    return nil
end