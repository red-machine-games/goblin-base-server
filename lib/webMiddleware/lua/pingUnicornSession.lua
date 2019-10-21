local UNICORN = KEYS[1]
local SESSION_LIFETIME = KEYS[2]
local LAST_ACTION_TIMEOUT = tonumber(KEYS[3])
local CLIENT_PLATFORM = KEYS[4]
local NOW = tonumber(KEYS[5])
local SUBSESSION_ALSO = KEYS[6] == '1'

local session_platform = redis.call('hmget', 'sess:' .. UNICORN, 'plat', 'lact')

if session_platform[1] == CLIENT_PLATFORM and tonumber(session_platform[2]) + LAST_ACTION_TIMEOUT > NOW then
    local unic_aid = redis.call('get', 'unic_aid:' .. UNICORN)

    if unic_aid then
        redis.call('pexpire', 'unic_aid:' .. UNICORN, SESSION_LIFETIME)
        redis.call('pexpire', 'sess_aid:' .. unic_aid, SESSION_LIFETIME)
    end

    local unic_hid = redis.call('get', 'unic_hid:' .. UNICORN)

    if unic_hid then
        redis.call('pexpire', 'unic_hid:' .. UNICORN, SESSION_LIFETIME)
        redis.call('pexpire', 'sess_hid:' .. unic_hid, SESSION_LIFETIME)
    end

    local sessionObj = redis.call('hgetall', 'sess:' .. UNICORN)

    if #sessionObj == 0 then
        return nil
    else
        redis.call('pexpire', 'sess:' .. UNICORN, SESSION_LIFETIME)

        if SUBSESSION_ALSO then
            redis.call('pexpire', 'subs:' .. UNICORN, SESSION_LIFETIME)
        end

        return '1'
    end
else
    return nil;
end