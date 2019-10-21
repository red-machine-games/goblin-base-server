local UNICORN = KEYS[1]
local SESSION_LIFETIME = KEYS[2]
local PLATFORM = KEYS[3]
local SESSION_CREATION_TIME = KEYS[4]
local ADD_SUBSESSION = KEYS[5] == '1'
local IDENTIFIER = KEYS[6]
local LIMIT_CONCURRENT_SESSIONS

if KEYS[7] == '-1' then
    LIMIT_CONCURRENT_SESSIONS = nil
else
    LIMIT_CONCURRENT_SESSIONS = tonumber(KEYS[7])
end

if LIMIT_CONCURRENT_SESSIONS ~= nil then
    if #redis.call('keys', 'sess:*') >= LIMIT_CONCURRENT_SESSIONS then
        return nil
    end
end

local session_key = 'sess:' .. UNICORN
local session_index_key = 'isess:' .. IDENTIFIER

local currently_known_session = redis.call('get', session_index_key)

if currently_known_session then
    redis.call('del', 'sess:' .. currently_known_session, 'subs:' .. currently_known_session)
end

redis.call('hmset', session_key, 'unicorn', UNICORN, 'plat', PLATFORM, 'cat', SESSION_CREATION_TIME, 'rsq', '0', 'lact', SESSION_CREATION_TIME)
redis.call('pexpire', session_key, SESSION_LIFETIME)
redis.call('set', session_index_key, UNICORN)
redis.call('pexpire', session_index_key, SESSION_LIFETIME)

if ADD_SUBSESSION then
    redis.call('set', 'subs:' .. UNICORN, 'stub')
    redis.call('pexpire', 'subs:' .. UNICORN, tonumber(SESSION_LIFETIME) * 1.5)
end

return '{"unicorn":"' .. UNICORN .. '","rsq":0}'