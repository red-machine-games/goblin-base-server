local UNICORN = KEYS[1]
local SESSION_LIFETIME = KEYS[2]
local CLIENT_PLATFORM = KEYS[3]
local NOW = tonumber(KEYS[4])
local SUBSESSION_ALSO = KEYS[5] == '1'
local N = 15000

local sexp = redis.call('get', 'sexp:' .. UNICORN)

if not sexp or tonumber(sexp) + N > NOW then
    local session_platform = redis.call('hget', 'sess:' .. UNICORN, 'plat')

    if session_platform == CLIENT_PLATFORM then
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
        local sess_unicorn = 'sess:' .. UNICORN
        local sessionObj = redis.call('hgetall', sess_unicorn)
        if #sessionObj == 0 then
            return nil
        else
            redis.call('set', 'sexp:' .. UNICORN, NOW)
            redis.call('pexpire', 'sexp:' .. UNICORN, N)
            redis.call('hincrby', sess_unicorn, 'rsq', '1')
            redis.call('pexpire', sess_unicorn, SESSION_LIFETIME)
            redis.call('hset', sess_unicorn, 'lact', NOW)
            local out = {}
            for i = 1, #sessionObj, 2 do
                if sessionObj[i] == 'rsq' then
                    out[sessionObj[i]] = tostring(tonumber(sessionObj[i + 1]) + 1)
                elseif sessionObj[i] == 'kill' and sessionObj[i + 1] == '1' then
                    redis.call('del', sess_unicorn)
                    return nil
                else
                    out[sessionObj[i]] = sessionObj[i + 1]
                end
            end

            if SUBSESSION_ALSO then
                local subsession = redis.call('get', 'subs:' .. UNICORN)
                out.subs = subsession or 'stub'
                redis.call('pexpire', 'subs:' .. UNICORN, SESSION_LIFETIME)
            end

            return cjson.encode(out)
        end
    else
        return nil;
    end
else
    return '-1';
end